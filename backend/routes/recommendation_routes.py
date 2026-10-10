# Recommendation REST API Blueprint for Fashion VISTA
import os
import sys
from pathlib import Path
from flask import Blueprint, request, jsonify

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from ml.inference.recommender_engine import OutfitRecommender

recommendation_bp = Blueprint('recommendation_bp', __name__)
recommender = OutfitRecommender()

@recommendation_bp.route('/recommendations', methods=['POST'])
def get_recommendations():
    try:
        data = request.get_json(silent=True)
        if data is None:
            data = {}

        preferences = data.get('preferences') if isinstance(data.get('preferences'), dict) else data
        wardrobe = data.get('wardrobe', [])
        limit = data.get('limit', 8)

        try:
            limit = max(1, min(15, int(limit)))
        except (ValueError, TypeError):
            limit = 8

        result = recommender.recommend_outfits(preferences=preferences, wardrobe=wardrobe, limit=limit)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': f'Recommendation failed: {str(e)}'
        }), 500
