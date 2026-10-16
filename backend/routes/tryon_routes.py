"""
Fashion VISTA — Virtual Try-On API Blueprint.

Routes:
- POST /api/try-on: Virtual try-on inference endpoint (supports JSON base64 and multipart/form-data).
- GET /api/try-on/status: System readiness, model registry, and hardware configuration.
- GET /api/try-on/job/<job_id>: Asynchronous job status & result retrieval.
"""

import io
import base64
import logging
from flask import Blueprint, request, jsonify

from backend.services.tryon_service import (
    execute_try_on,
    execute_multi_garment_try_on,
    get_vto_system_status,
    get_tryon_job
)

logger = logging.getLogger(__name__)

tryon_bp = Blueprint("tryon_bp", __name__)


@tryon_bp.route("/try-on/status", methods=["GET"])
def tryon_status():
    """Returns AI Virtual Try-On system status, model registry, and capabilities."""
    try:
        status = get_vto_system_status()
        return jsonify(status), 200
    except Exception as e:
        logger.error(f"Try-On status check failed: {e}")
        return jsonify({"error": str(e), "status": "error"}), 500


@tryon_bp.route("/try-on/outfit", methods=["POST"])
def try_on_outfit_endpoint():
    """
    Mixed Outfit Virtual Try-On endpoint.
    Accepts:
    - user_photo: User front-facing portrait
    - garments / items: Array of outfit items [{ slot, name, image, inWardrobe, source, ... }]
    Executes sequential multi-garment neural synthesis.
    """
    try:
        data = request.get_json(silent=True) or {}
        user_photo = data.get("user_photo") or data.get("user_image") or data.get("person_image")
        garments = data.get("garments") or data.get("items") or []

        if not user_photo:
            return jsonify({
                "success": False,
                "status": "error",
                "error": "Missing user photograph ('user_photo')."
            }), 400

        if not garments:
            return jsonify({
                "success": False,
                "status": "error",
                "error": "Missing garments list ('garments')."
            }), 400

        res = execute_multi_garment_try_on(
            user_image_path=user_photo,
            garments=garments
        )

        if not res.get("success"):
            return jsonify(res), 400

        return jsonify(res), 200

    except Exception as e:
        logger.error(f"Outfit Try-On failed: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "status": "error",
            "error": f"Outfit try-on synthesis failed: {str(e)}"
        }), 500


@tryon_bp.route("/try-on", methods=["POST"])
def try_on_endpoint():
    """
    Virtual Try-On execution endpoint.
    Supports single garment or multi-garment items array.
    """
    try:
        user_photo = None
        garment_photo = None
        garment_category = "Top"
        garment_name = ""
        is_async = False

        if request.is_json:
            data = request.get_json(silent=True) or {}
            user_photo = data.get("user_photo") or data.get("user_image") or data.get("person_image")
            garment_photo = data.get("garment_photo") or data.get("garment_image") or data.get("cloth_image")
            garment_category = data.get("garment_category") or data.get("category") or "Top"
            garment_name = data.get("garment_name") or data.get("name") or ""
            is_async = bool(data.get("async", False))

            # If an items list is provided in /api/try-on, route to multi-garment try-on
            garments_list = data.get("items") or data.get("garments")
            if garments_list and isinstance(garments_list, list) and len(garments_list) > 1:
                return jsonify(execute_multi_garment_try_on(user_photo, garments_list, async_mode=is_async)), 200
        else:
            # Multipart form-data
            if "user_photo" in request.files:
                f = request.files["user_photo"]
                user_photo = f"data:image/jpeg;base64,{base64.b64encode(f.read()).decode('utf-8')}"
            else:
                user_photo = request.form.get("user_photo")

            if "garment_photo" in request.files:
                f = request.files["garment_photo"]
                garment_photo = f"data:image/jpeg;base64,{base64.b64encode(f.read()).decode('utf-8')}"
            else:
                garment_photo = request.form.get("garment_photo")

            garment_category = request.form.get("garment_category", "Top")
            garment_name = request.form.get("garment_name", "")
            is_async = request.form.get("async", "").lower() in ("true", "1")

        if not user_photo:
            return jsonify({
                "success": False,
                "status": "error",
                "error": "Missing user photograph ('user_photo'). Please upload a front-facing portrait."
            }), 400

        if not garment_photo:
            return jsonify({
                "success": False,
                "status": "error",
                "error": "Missing garment image ('garment_photo'). Please select or upload a garment."
            }), 400

        res = execute_try_on(
            user_image_path=user_photo,
            garment_image_path=garment_photo,
            garment_category=garment_category,
            garment_name=garment_name,
            async_mode=is_async
        )

        if not res.get("success"):
            return jsonify(res), 400

        return jsonify(res), 200

    except Exception as e:
        logger.error(f"Try-On endpoint execution failed: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "status": "error",
            "error": f"Virtual try-on synthesis failed: {str(e)}"
        }), 500


@tryon_bp.route("/try-on/job/<job_id>", methods=["GET"])
def get_job_status(job_id: str):
    """Retrieves progress and synthesized result of an asynchronous try-on job."""
    try:
        res = get_tryon_job(job_id)
        if not res.get("success"):
            return jsonify(res), 404
        return jsonify(res), 200
    except Exception as e:
        return jsonify({"error": str(e), "status": "error"}), 500

