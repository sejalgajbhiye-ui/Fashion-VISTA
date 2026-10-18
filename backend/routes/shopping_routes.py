"""
Fashion VISTA — Dynamic Online Shopping API Blueprint.

Routes:
- GET /api/shopping/search: Dynamically search permitted live retail products (Myntra) without database storage.
"""

from flask import Blueprint, request, jsonify
from backend.services.shopping_service import (
    search_live_myntra_products,
    find_missing_product_online
)

shopping_bp = Blueprint("shopping_bp", __name__)


@shopping_bp.route("/shopping/search", methods=["GET"])
def search_products():
    """
    Dynamic live shopping search endpoint.
    Query params:
    - q: search query (e.g. 'gold palazzos', 'red kurta')
    - slot: garment slot ('Top', 'Bottom', 'Shoes', 'Layer')
    - colour: color tone
    - limit: max items (default 6)
    """
    try:
        q = request.args.get("q", "").strip()
        slot = request.args.get("slot", "").strip()
        colour = request.args.get("colour", "").strip()
        limit = int(request.args.get("limit", 6))
        min_price = request.args.get("min_price", type=int)
        max_price = request.args.get("max_price", type=int)

        if q:
            products = search_live_myntra_products(q, limit=limit, min_price=min_price, max_price=max_price)
        elif slot:
            prod = find_missing_product_online(slot=slot, colour=colour or "Black")
            products = [prod] if prod else []
        else:
            products = []

        return jsonify({
            "status": "success",
            "count": len(products),
            "products": products
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "error": f"Product search failed: {str(e)}"
        }), 500
