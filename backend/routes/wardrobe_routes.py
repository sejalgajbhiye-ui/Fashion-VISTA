"""
Wardrobe REST API Blueprint for Fashion VISTA.

Endpoints:
- POST /api/wardrobe/classify       : Classifies garment image & maps to wardrobe category
- GET  /api/wardrobe/items          : Retrieves all saved wardrobe items from SQLite
- POST /api/wardrobe/items          : Adds new wardrobe item with persistent storage & image upload
- PUT  /api/wardrobe/items/<id>     : Updates an existing wardrobe item
- DELETE /api/wardrobe/items/<id>   : Deletes a wardrobe item from SQLite
- GET  /api/wardrobe/uploads/<file> : Serves uploaded garment image files statically
"""

import os
import sys
import uuid
import base64
from pathlib import Path
from flask import Blueprint, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.services.classifier_service import ClassifierService
from backend.auth_middleware import optional_auth, require_auth
from backend.database import (
    get_all_wardrobe_items,
    get_wardrobe_item_by_id,
    insert_wardrobe_item,
    update_wardrobe_item,
    delete_wardrobe_item
)

wardrobe_bp = Blueprint("wardrobe_bp", __name__)
classifier_service = ClassifierService()

UPLOADS_DIR = BASE_DIR / "backend" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp"}
MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB limit


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def save_image_bytes(img_bytes, ext="jpg"):
    """Saves raw image bytes to uploads directory and returns relative URL."""
    filename = f"garment_{uuid.uuid4().hex[:10]}.{ext}"
    dest_path = UPLOADS_DIR / filename
    with open(dest_path, "wb") as f:
        f.write(img_bytes)
    return f"/api/wardrobe/uploads/{filename}"


@wardrobe_bp.route("/classify", methods=["POST"])
def classify_wardrobe_image():
    """
    Accepts a clothing image, validates file type & contents,
    runs the trained classifier, and returns prediction with confidence & category mapping.
    """
    try:
        raw_bytes = None
        ext = "jpg"

        # 1. File Upload (multipart/form-data)
        if "image" in request.files:
            file = request.files["image"]
            if not file or not file.filename:
                return jsonify({"status": "error", "error": "Empty file uploaded"}), 400
            
            if not allowed_file(file.filename):
                return jsonify({
                    "status": "error",
                    "error": f"Invalid file type. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
                }), 400

            ext = file.filename.rsplit(".", 1)[1].lower()
            raw_bytes = file.read()
            if len(raw_bytes) > MAX_CONTENT_LENGTH:
                return jsonify({"status": "error", "error": "Image file exceeds 10MB limit"}), 400

        # 2. JSON Base64 Upload
        elif request.is_json:
            data = request.get_json() or {}
            img_val = data.get("image") or data.get("image_base64")
            if not img_val:
                return jsonify({"status": "error", "error": "No image provided. Provide 'image' file or base64 string."}), 400

            if img_val.startswith("data:image"):
                try:
                    header, encoded = img_val.split(",", 1)
                    if "image/png" in header:
                        ext = "png"
                    elif "image/webp" in header:
                        ext = "webp"
                    raw_bytes = base64.b64decode(encoded)
                except Exception:
                    return jsonify({"status": "error", "error": "Malformed base64 image data"}), 400
            else:
                try:
                    raw_bytes = base64.b64decode(img_val)
                except Exception:
                    return jsonify({"status": "error", "error": "Malformed base64 image data"}), 400

        else:
            return jsonify({"status": "error", "error": "No image provided. Upload multipart file or base64 JSON."}), 400

        if not raw_bytes or len(raw_bytes) == 0:
            return jsonify({"status": "error", "error": "Received empty image content"}), 400

        # 3. Validate image integrity
        try:
            pil_img = classifier_service.load_pil_image(raw_bytes)
        except Exception as e:
            return jsonify({"status": "error", "error": f"Corrupted or invalid image: {str(e)}"}), 400

        # 4. Save image for persistent display
        saved_url = save_image_bytes(raw_bytes, ext=ext)

        # 5. Run Classification Inference
        pred = classifier_service.classify(pil_img)

        return jsonify({
            "status": "success",
            "predicted_category": pred["category"],
            "mapped_category": pred["mapped_category"],
            "confidence": pred["confidence"],
            "confidence_pct": pred["confidence_pct"],
            "model_used": pred["model_used"],
            "top_candidates": pred["top_candidates"],
            "image_url": saved_url
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "error": f"Classification error: {str(e)}"}), 500


@wardrobe_bp.route("/items", methods=["GET"])
@optional_auth
def list_items(current_user=None):
    """
    Retrieves wardrobe items.
    If authenticated, returns user's items + sample items.
    If guest, returns public sample items.
    """
    try:
        user_id = current_user.get("id") if current_user else None
        items = get_all_wardrobe_items(user_id=user_id)
        return jsonify({
            "status": "success",
            "total": len(items),
            "items": items,
            "authenticated": bool(current_user)
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "error": f"Failed to retrieve items: {str(e)}"}), 500


@wardrobe_bp.route("/items", methods=["POST"])
@optional_auth
def add_item(current_user=None):
    """
    Saves a new clothing item to SQLite database.
    Accepts JSON or multipart/form-data.
    Derives user_id from verified authentication token if present.
    """
    try:
        item_data = {}
        # Multipart form upload
        if request.content_type and "multipart/form-data" in request.content_type:
            item_data = request.form.to_dict()
            if "image" in request.files:
                file = request.files["image"]
                if file and file.filename and allowed_file(file.filename):
                    ext = file.filename.rsplit(".", 1)[1].lower()
                    img_bytes = file.read()
                    item_data["image"] = save_image_bytes(img_bytes, ext=ext)
        elif request.is_json:
            item_data = request.get_json() or {}
        else:
            item_data = request.values.to_dict()

        name = item_data.get("name", "").strip()
        category = item_data.get("category", "").strip()

        if not name:
            return jsonify({"status": "error", "error": "Item name is required"}), 400
        if not category:
            return jsonify({"status": "error", "error": "Item category is required"}), 400

        # If base64 image data URL passed in json, persist to file
        image_val = item_data.get("image", "")
        if image_val and image_val.startswith("data:image"):
            try:
                header, encoded = image_val.split(",", 1)
                ext = "png" if "png" in header else "jpg"
                raw_bytes = base64.b64decode(encoded)
                item_data["image"] = save_image_bytes(raw_bytes, ext=ext)
            except Exception:
                pass

        user_id = current_user.get("id") if current_user else None
        saved_item = insert_wardrobe_item(item_data, user_id=user_id)
        return jsonify({
            "status": "success",
            "message": "Item added to digital wardrobe",
            "item": saved_item
        }), 201

    except Exception as e:
        return jsonify({"status": "error", "error": f"Failed to add item: {str(e)}"}), 500


@wardrobe_bp.route("/items/<item_id>", methods=["GET"])
def get_item(item_id):
    """Retrieves a single wardrobe item by ID."""
    item = get_wardrobe_item_by_id(item_id)
    if not item:
        return jsonify({"status": "error", "error": f"Item '{item_id}' not found"}), 404
    return jsonify({"status": "success", "item": item}), 200


@wardrobe_bp.route("/items/<item_id>", methods=["PUT"])
@optional_auth
def edit_item(item_id, current_user=None):
    """
    Updates selected metadata for a wardrobe item.
    Enforces authorization: users cannot edit items belonging to other users.
    """
    try:
        existing = get_wardrobe_item_by_id(item_id)
        if not existing:
            return jsonify({"status": "error", "error": f"Item '{item_id}' not found"}), 404

        user_id = current_user.get("id") if current_user else None

        # Ownership validation
        if existing.get("user_id"):
            if not user_id or str(existing["user_id"]) != str(user_id):
                return jsonify({
                    "status": "error",
                    "error": "Forbidden: You do not have permission to modify this wardrobe item."
                }), 403

        data = request.get_json() or {}
        updated = update_wardrobe_item(item_id, data, user_id=user_id)
        return jsonify({
            "status": "success",
            "message": "Item updated successfully",
            "item": updated
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "error": f"Failed to update item: {str(e)}"}), 500


@wardrobe_bp.route("/items/<item_id>", methods=["DELETE"])
@optional_auth
def remove_item(item_id, current_user=None):
    """
    Deletes a wardrobe item with ownership validation.
    Enforces authorization: users cannot delete items belonging to other users.
    """
    try:
        existing = get_wardrobe_item_by_id(item_id)
        if not existing:
            return jsonify({"status": "success", "message": f"Item '{item_id}' already removed"}), 200

        user_id = current_user.get("id") if current_user else None

        # Ownership validation: only block if owned by a DIFFERENT authenticated user
        if existing.get("user_id") and user_id:
            if str(existing["user_id"]) != str(user_id):
                return jsonify({
                    "status": "error",
                    "error": "Forbidden: You do not have permission to delete this wardrobe item."
                }), 403

        success = delete_wardrobe_item(item_id, user_id=user_id)
        if success:
            return jsonify({"status": "success", "message": f"Item '{item_id}' deleted"}), 200
        else:
            return jsonify({"status": "error", "error": "Failed to delete item or permission denied"}), 500
    except Exception as e:
        return jsonify({"status": "error", "error": f"Delete error: {str(e)}"}), 500


@wardrobe_bp.route("/uploads/<path:filename>", methods=["GET"])
def serve_upload(filename):
    """Statically serves uploaded garment images and generated looks."""
    return send_from_directory(str(UPLOADS_DIR), filename)

