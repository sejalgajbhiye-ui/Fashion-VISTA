import os
import sys
import json
from pathlib import Path
from flask import Blueprint, request, jsonify
import joblib

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.services.classifier_service import ClassifierService
from ml.inference.recommender_engine import OutfitRecommender
from backend.services.wardrobe_service import match_outfit_against_wardrobe
from backend.services.tryon_service import get_vto_system_status, execute_try_on

ml_bp = Blueprint("ml_bp", __name__)

# Initialize singleton services
classifier_service = ClassifierService()
recommender_engine = OutfitRecommender()

# Load attribute model
ATTRIBUTE_MODEL_PATH = BASE_DIR / "models" / "product_attribute_model.joblib"
attribute_bundle = None
if ATTRIBUTE_MODEL_PATH.exists():
    try:
        attribute_bundle = joblib.load(ATTRIBUTE_MODEL_PATH)
    except Exception as e:
        print(f"Error loading attribute model: {e}")

MANIFEST_PATH = BASE_DIR / "models" / "model_manifest.json"


@ml_bp.route("/status", methods=["GET"])
def get_ml_status():
    """Returns available models, versions, test metrics, and system capabilities."""
    manifest_data = {}
    if MANIFEST_PATH.exists():
        try:
            with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
                manifest_data = json.load(f)
        except Exception:
            manifest_data = {}

    vto_status = get_vto_system_status()

    return jsonify({
        "status": "online",
        "registry": manifest_data,
        "virtual_try_on": vto_status
    }), 200


@ml_bp.route("/classify", methods=["POST"])
def classify_garment():
    """Classifies an uploaded garment image into standard clothing categories."""
    try:
        img_source = None
        # Check multipart form file
        if "image" in request.files:
            file = request.files["image"]
            if file.filename:
                img_source = file.read()
        elif request.is_json:
            data = request.get_json() or {}
            img_source = data.get("image") or data.get("image_base64")

        if not img_source:
            return jsonify({
                "error": "No image provided. Provide 'image' file or 'image_base64' string.",
                "status": "error"
            }), 400

        result = classifier_service.classify(img_source)
        return jsonify({
            "status": "success",
            "prediction": result
        }), 200

    except Exception as e:
        return jsonify({
            "error": f"Classification failed: {str(e)}",
            "status": "error"
        }), 500


@ml_bp.route("/attributes", methods=["POST"])
def predict_attributes():
    """Extracts or predicts garment attributes from title or description."""
    try:
        data = request.get_json() or {}
        text = data.get("product_name") or data.get("text") or data.get("title")

        if not text or not str(text).strip():
            return jsonify({
                "error": "Please provide 'product_name' or 'text' to predict attributes.",
                "status": "error"
            }), 400

        if not attribute_bundle:
            return jsonify({
                "error": "Attribute model not loaded.",
                "status": "error"
            }), 503

        vec = attribute_bundle["vectorizer"].transform([str(text)])
        predictions = {}
        for attr, model in attribute_bundle["models"].items():
            pred = model.predict(vec)[0]
            # Probabilities if available
            prob = None
            if hasattr(model, "predict_proba"):
                probs = model.predict_proba(vec)[0]
                prob = round(float(max(probs)), 4)
            predictions[attr] = {
                "value": pred,
                "confidence": prob
            }

        return jsonify({
            "status": "success",
            "input_text": text,
            "predicted_attributes": predictions
        }), 200

    except Exception as e:
        return jsonify({
            "error": f"Attribute prediction failed: {str(e)}",
            "status": "error"
        }), 500


@ml_bp.route("/recommend", methods=["POST"])
def recommend_outfit():
    """Recommends complete outfit based on user preferences."""
    try:
        data = request.get_json() or {}
        preferences = data.get("preferences", data)
        wardrobe = data.get("wardrobe", [])

        # 1. Generate outfit recommendation
        recommendation = recommender_engine.recommend_outfit(preferences)

        # 2. Check wardrobe overlap if wardrobe records were provided
        if wardrobe and "items" in recommendation:
            match_res = match_outfit_against_wardrobe(recommendation["items"], wardrobe)
            # Mark owned status on items
            matched_names = set(m["outfit_item"] for m in match_res.get("matches", []))
            for item in recommendation["items"]:
                if item["name"] in matched_names:
                    item["owned"] = True
            recommendation["wardrobe_match"] = match_res

        return jsonify({
            "status": "success",
            "recommendation": recommendation
        }), 200

    except Exception as e:
        return jsonify({
            "error": f"Recommendation failed: {str(e)}",
            "status": "error"
        }), 500


@ml_bp.route("/wardrobe-match", methods=["POST"])
def check_wardrobe_match():
    """Compares an outfit combination against user wardrobe records."""
    try:
        data = request.get_json() or {}
        outfit_items = data.get("outfit_items", [])
        wardrobe = data.get("wardrobe", [])

        result = match_outfit_against_wardrobe(outfit_items, wardrobe)
        return jsonify({
            "status": "success",
            "result": result
        }), 200

    except Exception as e:
        return jsonify({
            "error": f"Wardrobe matching failed: {str(e)}",
            "status": "error"
        }), 500


@ml_bp.route("/try-on", methods=["POST"])
def try_on_endpoint():
    """Virtual try-on execution & status endpoint."""
    try:
        data = request.get_json(silent=True) or {}
        user_photo = data.get("user_photo") or data.get("user_image") or data.get("person_image")
        garment_photo = data.get("garment_photo") or data.get("garment_image") or data.get("cloth_image")
        garment_category = data.get("garment_category") or data.get("category") or "Top"
        is_async = bool(data.get("async", False))

        # Backward compatibility for catalog sample preview (e.g. test_all.py)
        if not user_photo and not garment_photo and "sample_id" in data:
            status_info = get_vto_system_status()
            return jsonify({
                "status": "ready",
                "sample_id": data["sample_id"],
                "details": status_info,
                "message": "AI Virtual Try-On catalog sample ready"
            }), 200

        if not user_photo:
            return jsonify({
                "success": False,
                "status": "error",
                "error": "Missing user photograph ('user_photo')."
            }), 400

        if not garment_photo:
            return jsonify({
                "success": False,
                "status": "error",
                "error": "Missing garment image ('garment_photo')."
            }), 400

        res = execute_try_on(
            user_image_path=user_photo,
            garment_image_path=garment_photo,
            garment_category=garment_category,
            async_mode=is_async
        )
        if not res.get("success"):
            return jsonify(res), 400
        return jsonify(res), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Try-on request failed: {str(e)}",
            "status": "error"
        }), 500
