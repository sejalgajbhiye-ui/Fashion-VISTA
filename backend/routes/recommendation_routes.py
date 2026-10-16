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
        user_photo = data.get('user_photo') or data.get('user_image')
        wardrobe = data.get('wardrobe', [])
        limit = 3  # Maximum 3 outfit looks

        result = recommender.recommend_outfits(preferences=preferences, wardrobe=wardrobe, limit=limit)

        # Generate try-on image for each of the maximum 3 looks if user_photo is available
        if user_photo and isinstance(result, dict) and result.get('recommendations'):
            try:
                from backend.services.tryon_service import execute_multi_garment_try_on
                for outfit in result.get('recommendations', [])[:3]:
                    items = outfit.get('items', [])
                    if items:
                        try:
                            tryon_res = execute_multi_garment_try_on(
                                user_image_path=user_photo,
                                garments=items
                            )
                            if tryon_res.get('success') and tryon_res.get('result_image'):
                                outfit['user_tryon_image'] = tryon_res['result_image']
                                outfit['tryon_details'] = tryon_res.get('applied_garments')
                        except Exception as tryon_err:
                            print(f"[Try-on Route Note] Multi-garment look synthesis: {tryon_err}")
                    outfit['user_photo'] = user_photo


                # Ensure primary recommendation also reflects tryon image
                if result.get('recommendations'):
                    result['primary_recommendation'] = result['recommendations'][0]
                    result['alternatives'] = result['recommendations'][1:]
            except Exception as e:
                print(f"[Try-on Batch Error] {e}")

        return jsonify(result), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': f'Recommendation failed: {str(e)}'
        }), 500
