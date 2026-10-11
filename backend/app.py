"""
Fashion VISTA — AI/ML Flask Backend Server.

Provides REST API endpoints for:
- Health check (/api/health)
- ML Model Registry & Capabilities (/api/ml/status)
- Clothing Classification (/api/ml/classify)
- Attribute Extraction (/api/ml/attributes)
- Personalized Outfit Recommendation (/api/ml/recommend)
- Digital Wardrobe Matching (/api/ml/wardrobe-match)
- Virtual Try-On Interface (/api/ml/try-on)
- Wardrobe Management & Clothing Recognition (/api/wardrobe/*)
"""

import os
import sys
from pathlib import Path
from flask import Flask, jsonify
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.routes.health_routes import health_bp
from backend.routes.ml_routes import ml_bp
from backend.routes.wardrobe_routes import wardrobe_bp
from backend.routes.recommendation_routes import recommendation_bp
from backend.routes.tryon_routes import tryon_bp
from backend.database import init_db


def create_app():
    # Initialize SQLite database
    init_db()

    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(ml_bp, url_prefix="/api/ml")
    app.register_blueprint(wardrobe_bp, url_prefix="/api/wardrobe")
    app.register_blueprint(recommendation_bp, url_prefix="/api")
    app.register_blueprint(tryon_bp, url_prefix="/api")

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found", "status": "error"}), 404

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad request", "status": "error"}), 400

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error", "status": "error"}), 500

    return app


app = create_app()

if __name__ == "__main__":
    print("Starting Fashion VISTA AI/ML Backend on http://localhost:5000 ...")
    app.run(host="0.0.0.0", port=5000, debug=False)
