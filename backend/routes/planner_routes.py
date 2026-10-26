"""
Fashion VISTA — Smart Weekly Outfit Planner REST API Blueprint.

Endpoints:
- GET    /api/planner/plans             : Retrieves outfit plans strictly for authenticated user
- POST   /api/planner/plans             : Creates a new outfit plan for a date
- PUT    /api/planner/plans/<id>        : Updates an existing plan with ownership verification
- DELETE /api/planner/plans/<id>        : Deletes an outfit plan
- PATCH  /api/planner/plans/<id>/status : Toggles or updates plan status ('planned' / 'worn')
"""

import sys
from pathlib import Path
from flask import Blueprint, request, jsonify

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.auth_middleware import require_auth
from backend.database import (
    get_user_outfit_plans,
    get_outfit_plan_by_id,
    insert_outfit_plan,
    update_outfit_plan,
    delete_outfit_plan,
    toggle_outfit_plan_status,
    get_wardrobe_item_by_id
)

planner_bp = Blueprint("planner_bp", __name__)


@planner_bp.route("/plans", methods=["GET"])
@require_auth
def list_plans(current_user):
    """
    Retrieves all outfit plans strictly belonging to the authenticated user.
    Supports optional date filtering via ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD.
    """
    try:
        user_id = current_user.get("id")
        start_date = request.args.get("start_date", "").strip() or None
        end_date = request.args.get("end_date", "").strip() or None

        plans = get_user_outfit_plans(user_id=user_id, start_date=start_date, end_date=end_date)
        return jsonify({
            "status": "success",
            "count": len(plans),
            "plans": plans
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "error": f"Failed to retrieve outfit plans: {str(e)}"}), 500


@planner_bp.route("/plans", methods=["POST"])
@require_auth
def create_plan(current_user):
    """
    Creates an outfit plan for the authenticated user.
    Validates ownership of referenced wardrobe items to prevent cross-user referencing.
    """
    try:
        user_id = current_user.get("id")
        data = request.get_json(silent=True) or {}

        planned_date = data.get("planned_date", "").strip()
        if not planned_date:
            return jsonify({"status": "error", "error": "Field 'planned_date' is required (YYYY-MM-DD)"}), 400

        # Validate referenced wardrobe items if provided
        wardrobe_item_ids = data.get("wardrobe_item_ids") or []
        for item_id in wardrobe_item_ids:
            item = get_wardrobe_item_by_id(item_id)
            if item and item.get("user_id"):
                if str(item["user_id"]) != str(user_id):
                    return jsonify({
                        "status": "error",
                        "error": f"Unauthorized reference to wardrobe item '{item_id}'"
                    }), 403

        plan = insert_outfit_plan(data, user_id=user_id)
        return jsonify({
            "status": "success",
            "plan": plan
        }), 201

    except ValueError as ve:
        return jsonify({"status": "error", "error": str(ve)}), 400
    except Exception as e:
        return jsonify({"status": "error", "error": f"Failed to create outfit plan: {str(e)}"}), 500


@planner_bp.route("/plans/<plan_id>", methods=["PUT"])
@require_auth
def update_plan(plan_id, current_user):
    """
    Updates an outfit plan strictly owned by the authenticated user.
    """
    try:
        user_id = current_user.get("id")
        existing = get_outfit_plan_by_id(plan_id, user_id=user_id)
        if not existing:
            return jsonify({"status": "error", "error": "Outfit plan not found or unauthorized"}), 404

        data = request.get_json(silent=True) or {}

        # Validate wardrobe item ownership if updated
        wardrobe_item_ids = data.get("wardrobe_item_ids") or []
        for item_id in wardrobe_item_ids:
            item = get_wardrobe_item_by_id(item_id)
            if item and item.get("user_id"):
                if str(item["user_id"]) != str(user_id):
                    return jsonify({
                        "status": "error",
                        "error": f"Unauthorized reference to wardrobe item '{item_id}'"
                    }), 403

        updated = update_outfit_plan(plan_id, data, user_id=user_id)
        return jsonify({
            "status": "success",
            "plan": updated
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "error": f"Failed to update outfit plan: {str(e)}"}), 500


@planner_bp.route("/plans/<plan_id>", methods=["DELETE"])
@require_auth
def delete_plan(plan_id, current_user):
    """
    Deletes an outfit plan strictly owned by the authenticated user.
    """
    try:
        user_id = current_user.get("id")
        deleted = delete_outfit_plan(plan_id, user_id=user_id)
        if not deleted:
            date_param = request.args.get("date")
            if date_param:
                deleted = delete_outfit_plan(date_param, user_id=user_id)

        if not deleted:
            return jsonify({"status": "error", "error": "Outfit plan not found or unauthorized"}), 404

        return jsonify({
            "status": "success",
            "deleted": True,
            "id": plan_id
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "error": f"Failed to delete outfit plan: {str(e)}"}), 500


@planner_bp.route("/plans/<plan_id>/status", methods=["PATCH"])
@require_auth
def toggle_status(plan_id, current_user):
    """
    Toggles or sets 'planned' vs 'worn' status on an outfit plan.
    """
    try:
        user_id = current_user.get("id")
        data = request.get_json(silent=True) or {}
        explicit_status = data.get("status")

        if explicit_status in ("planned", "worn"):
            updated = update_outfit_plan(plan_id, {"status": explicit_status}, user_id=user_id)
        else:
            updated = toggle_outfit_plan_status(plan_id, user_id=user_id)

        if not updated:
            return jsonify({"status": "error", "error": "Outfit plan not found or unauthorized"}), 404

        return jsonify({
            "status": "success",
            "plan": updated
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "error": f"Failed to update plan status: {str(e)}"}), 500
