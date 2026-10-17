"""
Fashion VISTA — FitInView Batch Virtual Try-On REST API Routes.

Endpoints:
- POST /api/tryon/fitinview/batch: Initiates automatic try-on for top recommendation outfits.
- GET  /api/tryon/fitinview/batch/<batch_id>: Polls batch progress and retrieval of generated results.
- POST /api/tryon/fitinview/batch/<batch_id>/retry/<job_id>: Retries a failed try-on job.
- GET  /api/tryon/fitinview/account: Returns FitInView account credit balance and rate limits.
- POST /api/tryon/fitinview/single: Direct single try-on submission.
"""

import logging
from flask import Blueprint, request, jsonify

from backend.services.fitinview_service import get_fitinview_client, FITINVIEW_CREDIT_COSTS
from backend.services.batch_tryon_service import (
    start_batch_recommendation_tryon,
    get_batch_status,
    retry_batch_job
)
from ml.inference.recommender_engine import OutfitRecommender

logger = logging.getLogger(__name__)

fitinview_bp = Blueprint("fitinview_bp", __name__)
_recommender = OutfitRecommender()


@fitinview_bp.route("/tryon/fitinview/account", methods=["GET"])
def get_account():
    """Returns FitInView API credit balance and rate limits."""
    client = get_fitinview_client()
    data = client.get_account_info()
    return jsonify(data), 200


@fitinview_bp.route("/tryon/fitinview/batch", methods=["POST"])
def submit_batch_tryon():
    """
    Automatically tries on top-ranked recommended outfits on user photo.
    Accepts:
    - user_photo: Base64 data URI or image URL
    - preferences: Optional preferences dict; if recommendations not provided, calls OutfitRecommender
    - recommendations: Optional array of curated outfits
    - limit: Max outfits to process (default 5)
    - output_size: "1K" (default, 8 credits), "2K" (12 credits), "4K" (20 credits)
    """
    try:
        data = request.get_json(silent=True) or {}
        user_photo = data.get("user_photo") or data.get("user_image")
        if not user_photo:
            return jsonify({
                "success": False,
                "status": "error",
                "error": "Missing required 'user_photo'. Please upload a portrait photo."
            }), 400

        limit = int(data.get("limit", 5))
        output_size = str(data.get("output_size", "1K")).upper()

        # If recommendations not passed directly, generate them using existing recommendation model
        recommendations = data.get("recommendations")
        if not recommendations or not isinstance(recommendations, list):
            prefs = data.get("preferences") or {}
            wardrobe = data.get("wardrobe", [])
            logger.info("Generating personalized recommendations via existing OutfitRecommender...")
            rec_result = _recommender.recommend_outfits(preferences=prefs, wardrobe=wardrobe, limit=limit)
            recommendations = rec_result.get("recommendations", [])

        if not recommendations:
            return jsonify({
                "success": False,
                "status": "error",
                "error": "No recommendation outfits available to try on."
            }), 400

        res = start_batch_recommendation_tryon(
            user_photo=user_photo,
            recommendations=recommendations,
            limit=limit,
            output_size=output_size
        )

        return jsonify(res), 200

    except Exception as e:
        logger.error(f"Batch tryon dispatch error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "status": "error",
            "error": f"Failed to dispatch batch try-on: {str(e)}"
        }), 500


@fitinview_bp.route("/tryon/fitinview/batch/<batch_id>", methods=["GET"])
def poll_batch(batch_id: str):
    """Retrieves current batch progress and all individual outfit results."""
    res = get_batch_status(batch_id)
    if not res.get("success"):
        return jsonify(res), 404
    return jsonify(res), 200


@fitinview_bp.route("/tryon/fitinview/batch/<batch_id>/retry/<job_id>", methods=["POST"])
def retry_job(batch_id: str, job_id: str):
    """Retries a specific failed job within a batch."""
    data = request.get_json(silent=True) or {}
    user_photo = data.get("user_photo")
    if not user_photo:
        return jsonify({"success": False, "status": "error", "error": "user_photo required for retry."}), 400

    res = retry_batch_job(batch_id, job_id, user_photo)
    return jsonify(res), 200


@fitinview_bp.route("/tryon/fitinview/single", methods=["POST"])
def submit_single_tryon():
    """Direct single garment try-on using FitInView API."""
    try:
        data = request.get_json(silent=True) or {}
        person_image = data.get("person_image") or data.get("user_photo")
        garment_image = data.get("garment_image") or data.get("garment_photo")

        if not person_image:
            return jsonify({"success": False, "error": "Missing person_image"}), 400
        if not garment_image:
            return jsonify({"success": False, "error": "Missing garment_image"}), 400

        output_size = data.get("output_size", "1K")
        prompt = data.get("prompt", "")

        client = get_fitinview_client()
        res = client.submit_tryon(
            person_image=person_image,
            garment_images=[garment_image],
            output_size=output_size,
            wait=True,
            prompt=prompt
        )

        return jsonify(res), 200 if res.get("success") else 400

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
