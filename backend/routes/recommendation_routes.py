# Recommendation REST API Blueprint for Fashion VISTA
# Generates 5 to 10 Complete 360° Occasion Ensembles (Dress, Jewellery, Hairstyle, Footwear, Handbag)
# with multi-retailer store links (Myntra, Amazon, Meesho, Flipkart, Ajio) and wardrobe synergy.

import os
import sys
from pathlib import Path
from flask import Blueprint, request, jsonify

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from ml.models.occasion_ensemble_recommender import get_occasion_recommender

recommendation_bp = Blueprint('recommendation_bp', __name__)
occasion_recommender = get_occasion_recommender()


@recommendation_bp.route('/recommend', methods=['POST'])
@recommendation_bp.route('/recommendations', methods=['POST'])
@recommendation_bp.route('/recommendations/occasion', methods=['POST'])
def get_recommendations():
    """
    360° Occasion Ensemble ML Recommendation Endpoint.
    Accepts:
    - preferences: { occasion, style, colour, season, budget }
    - wardrobe: Array of user's digital wardrobe items
    - limit: Desired number of distinct looks (5 to 10, default 8)
    Returns:
    - 5 to 10 complete head-to-toe curated looks with direct multi-retailer links across
      Myntra, Amazon, Meesho, Flipkart, and Ajio.
    """
    try:
        data = request.get_json(silent=True) or {}

        preferences = data.get('preferences') if isinstance(data.get('preferences'), dict) else data
        wardrobe = data.get('wardrobe', None)
        limit = int(data.get('limit', 8))
        # Enforce range of 5 to 10 looks
        limit = max(5, min(10, limit))

        # Execute 360° ML Ensemble Recommender
        result = occasion_recommender.recommend(
            preferences=preferences,
            wardrobe=wardrobe,
            limit=limit
        )

        result["status"] = "success"
        return jsonify(result), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'status': 'error',
            'error': f'Occasion recommendation failed: {str(e)}'
        }), 500
