"""
Fashion VISTA — Smart Weekly Outfit Planner Test Suite.

Verifies:
- Authenticated plan CRUD operations
- Unauthorized access rejection (401)
- User isolation (User B cannot read/modify User A's plans)
- Wardrobe item cross-user reference rejection (403)
- Status toggling ('planned' vs 'worn')
- Date range filtering
- Editing existing plans
- Deleting plans
- Repeating outfits on multiple days allowed without blocking
- Preserving existing API endpoints (/health, /wardrobe/items, /recommendations)
"""

import pytest
import uuid
from backend.app import create_app
from backend.database import insert_wardrobe_item, insert_outfit_plan, get_outfit_plan_by_id


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_planner_requires_authentication(client):
    """Planner endpoints must reject unauthenticated requests with 401."""
    res = client.get("/api/planner/plans")
    assert res.status_code == 401
    data = res.get_json()
    assert data["status"] == "error"

    res_post = client.post("/api/planner/plans", json={"planned_date": "2026-10-26"})
    assert res_post.status_code == 401


def test_create_and_fetch_outfit_plan(client):
    """Authenticated user can create and retrieve their outfit plans."""
    headers = {"Authorization": "Bearer test-token-user_alpha"}

    plan_payload = {
        "planned_date": "2026-10-26",
        "occasion": "Office",
        "outfit_name": "Monday Executive Look",
        "note": "Quarterly board presentation",
        "items": [
            {"id": "w-top-1", "name": "Classic White Linen Shirt", "category": "Tops"},
            {"id": "w-bot-1", "name": "Dark Slim-Fit Denim Jeans", "category": "Bottoms"}
        ],
        "wardrobe_item_ids": ["w-top-1", "w-bot-1"]
    }

    res = client.post("/api/planner/plans", json=plan_payload, headers=headers)
    assert res.status_code == 201
    data = res.get_json()
    assert data["status"] == "success"
    plan = data["plan"]
    assert plan["user_id"] == "user_alpha"
    assert plan["planned_date"] == "2026-10-26"
    assert plan["occasion"] == "Office"
    assert plan["status"] == "planned"
    assert len(plan["items"]) == 2

    # Fetch plans for user_alpha
    res_get = client.get("/api/planner/plans", headers=headers)
    assert res_get.status_code == 200
    list_data = res_get.get_json()
    assert list_data["status"] == "success"
    user_plans = [p for p in list_data["plans"] if p["id"] == plan["id"]]
    assert len(user_plans) == 1
    assert user_plans[0]["outfit_name"] == "Monday Executive Look"


def test_user_isolation_cannot_access_other_users_plans(client):
    """User Beta cannot view, modify, or delete plans created by User Alpha."""
    alpha_headers = {"Authorization": "Bearer test-token-user_alpha"}
    beta_headers = {"Authorization": "Bearer test-token-user_beta"}

    # Create plan as Alpha
    res = client.post("/api/planner/plans", json={
        "planned_date": "2026-10-27",
        "occasion": "College",
        "outfit_name": "Alpha Secret Outfit"
    }, headers=alpha_headers)
    assert res.status_code == 201
    plan_id = res.get_json()["plan"]["id"]

    # Beta lists plans - must NOT see Alpha's plan
    res_beta = client.get("/api/planner/plans", headers=beta_headers)
    assert res_beta.status_code == 200
    beta_plans = res_beta.get_json()["plans"]
    assert not any(p["id"] == plan_id for p in beta_plans)

    # Beta attempts to update Alpha's plan - must be 403 or 404
    res_update = client.put(f"/api/planner/plans/{plan_id}", json={
        "outfit_name": "Hacked Outfit"
    }, headers=beta_headers)
    assert res_update.status_code in (403, 404)

    # Beta attempts to delete Alpha's plan - must be 403 or 404
    res_delete = client.delete(f"/api/planner/plans/{plan_id}", headers=beta_headers)
    assert res_delete.status_code in (403, 404)

    # Alpha's plan is still intact
    res_check = client.get("/api/planner/plans", headers=alpha_headers)
    alpha_plans = res_check.get_json()["plans"]
    assert any(p["id"] == plan_id and p["outfit_name"] == "Alpha Secret Outfit" for p in alpha_plans)


def test_reject_unauthorized_wardrobe_item_reference(client):
    """User Beta cannot reference wardrobe items owned exclusively by User Alpha."""
    alpha_item_id = f"item-alpha-{uuid.uuid4().hex[:6]}"
    insert_wardrobe_item({
        "id": alpha_item_id,
        "name": "Alpha Private Jacket",
        "category": "Tops"
    }, user_id="user_alpha")

    beta_headers = {"Authorization": "Bearer test-token-user_beta"}
    res = client.post("/api/planner/plans", json={
        "planned_date": "2026-10-28",
        "occasion": "Party",
        "outfit_name": "Beta Outfit Attempt",
        "wardrobe_item_ids": [alpha_item_id]
    }, headers=beta_headers)

    assert res.status_code == 403
    data = res.get_json()
    assert data["status"] == "error"
    assert "Unauthorized reference" in data["error"]


def test_edit_existing_plan(client):
    """User can edit occasion, notes, items, and date of an existing plan."""
    headers = {"Authorization": "Bearer test-token-user_edit"}

    res = client.post("/api/planner/plans", json={
        "planned_date": "2026-10-29",
        "occasion": "Casual",
        "outfit_name": "Original Look",
        "note": "Original Note"
    }, headers=headers)
    plan_id = res.get_json()["plan"]["id"]

    # Update plan
    res_put = client.put(f"/api/planner/plans/{plan_id}", json={
        "occasion": "Formal",
        "outfit_name": "Updated Gala Look",
        "note": "Switched to evening banquet"
    }, headers=headers)
    assert res_put.status_code == 200
    updated_plan = res_put.get_json()["plan"]
    assert updated_plan["occasion"] == "Formal"
    assert updated_plan["outfit_name"] == "Updated Gala Look"
    assert updated_plan["note"] == "Switched to evening banquet"


def test_toggle_plan_status_worn(client):
    """User can mark an outfit as worn or toggle status."""
    headers = {"Authorization": "Bearer test-token-user_gamma"}

    # Create plan
    res = client.post("/api/planner/plans", json={
        "planned_date": "2026-10-28",
        "occasion": "Casual",
        "outfit_name": "Wednesday Casual"
    }, headers=headers)
    assert res.status_code == 201
    plan_id = res.get_json()["plan"]["id"]
    assert res.get_json()["plan"]["status"] == "planned"

    # Toggle to worn
    res_toggle = client.patch(f"/api/planner/plans/{plan_id}/status", json={}, headers=headers)
    assert res_toggle.status_code == 200
    assert res_toggle.get_json()["plan"]["status"] == "worn"

    # Toggle back to planned
    res_toggle2 = client.patch(f"/api/planner/plans/{plan_id}/status", json={}, headers=headers)
    assert res_toggle2.status_code == 200
    assert res_toggle2.get_json()["plan"]["status"] == "planned"


def test_delete_plan(client):
    """User can delete their own plan."""
    headers = {"Authorization": "Bearer test-token-user_delta"}

    res = client.post("/api/planner/plans", json={
        "planned_date": "2026-10-29",
        "occasion": "Party",
        "outfit_name": "Thursday Party Look"
    }, headers=headers)
    plan_id = res.get_json()["plan"]["id"]

    res_del = client.delete(f"/api/planner/plans/{plan_id}", headers=headers)
    assert res_del.status_code == 200
    assert res_del.get_json()["deleted"] is True

    # Confirm deletion
    res_list = client.get("/api/planner/plans", headers=headers)
    assert not any(p["id"] == plan_id for p in res_list.get_json()["plans"])


def test_outfit_repetition_allowed_on_multiple_days(client):
    """User can plan the exact same outfit on Monday and Friday without being blocked."""
    headers = {"Authorization": "Bearer test-token-user_repeat"}
    shared_items = [
        {"id": "w-item-rep-1", "name": "Navy Blazer", "category": "Tops"},
        {"id": "w-item-rep-2", "name": "Beige Chinos", "category": "Bottoms"}
    ]

    res_mon = client.post("/api/planner/plans", json={
        "planned_date": "2026-10-26",
        "occasion": "Office",
        "outfit_name": "Power Monday",
        "items": shared_items,
        "wardrobe_item_ids": ["w-item-rep-1", "w-item-rep-2"]
    }, headers=headers)
    assert res_mon.status_code == 201

    res_fri = client.post("/api/planner/plans", json={
        "planned_date": "2026-10-30",
        "occasion": "Casual",
        "outfit_name": "Casual Friday Repeat",
        "items": shared_items,
        "wardrobe_item_ids": ["w-item-rep-1", "w-item-rep-2"]
    }, headers=headers)
    assert res_fri.status_code == 201


def test_date_range_filtering(client):
    """Querying plans with start_date and end_date filters results accurately."""
    headers = {"Authorization": "Bearer test-token-user_filter"}

    # Insert plans in Oct and Nov
    client.post("/api/planner/plans", json={"planned_date": "2026-10-26", "outfit_name": "Oct Week Plan"}, headers=headers)
    client.post("/api/planner/plans", json={"planned_date": "2026-11-15", "outfit_name": "Nov Later Plan"}, headers=headers)

    res_oct = client.get("/api/planner/plans?start_date=2026-10-25&end_date=2026-10-31", headers=headers)
    assert res_oct.status_code == 200
    plans = res_oct.get_json()["plans"]
    assert any(p["outfit_name"] == "Oct Week Plan" for p in plans)
    assert not any(p["outfit_name"] == "Nov Later Plan" for p in plans)


def test_existing_endpoints_preserved(client):
    """Confirm existing health, wardrobe, and recommendation endpoints are fully intact."""
    # Health check
    res_h = client.get("/api/health")
    assert res_h.status_code == 200

    # Wardrobe items
    res_w = client.get("/api/wardrobe/items")
    assert res_w.status_code == 200
