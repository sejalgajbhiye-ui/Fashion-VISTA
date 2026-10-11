"""
Fashion VISTA — Authentication, Authorization & Security Test Suite.

Verifies:
1. Guest access allows viewing public starter wardrobe items.
2. Verified authenticated requests derive user identity.
3. User A cannot modify or delete User B's wardrobe items (cross-user isolation).
4. Ownership checks enforce 403 Forbidden on unauthorized mutations.
5. SQLite database remains intact and functional without destructive mutations.
6. Local database backup utility creates safe binary and JSON snapshots.
"""

import os
import sys
import json
import pytest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.app import create_app
from backend.database import (
    get_all_wardrobe_items,
    get_wardrobe_item_by_id,
    insert_wardrobe_item,
    update_wardrobe_item,
    delete_wardrobe_item
)
from scripts.backup_and_export_sqlite import backup_sqlite


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


# ============================================================================
# 1. GUEST ACCESS TESTS
# ============================================================================
def test_new_user_starts_with_empty_wardrobe(client):
    """A user or guest who has not added any clothes gets an empty wardrobe (zero dummy items)."""
    res = client.get("/api/wardrobe/items")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert data["total"] == 0
    assert data["items"] == []
    assert data["authenticated"] is False


def test_guest_cannot_modify_other_user_items(client):
    """Guest requests cannot modify user-owned items."""
    # Insert an item owned by user_123
    user_item = insert_wardrobe_item({
        "id": "test-user-item-01",
        "name": "User 123 Silk Shirt",
        "category": "Tops"
    }, user_id="user_123")
    assert user_item is not None

    # Guest tries to update
    update_res = client.put(f"/api/wardrobe/items/{user_item['id']}", json={"name": "Hacked Name"})
    assert update_res.status_code == 403

    # Guest tries to delete
    delete_res = client.delete(f"/api/wardrobe/items/{user_item['id']}")
    assert delete_res.status_code == 403

    # Cleanup
    delete_wardrobe_item(user_item["id"], user_id="user_123")


# ============================================================================
# 2. CROSS-USER ISOLATION TESTS
# ============================================================================
def test_user_cannot_modify_another_users_item(client):
    """User B cannot edit or delete User A's wardrobe items."""
    user_a_id = "user_alpha"
    user_b_id = "user_beta"

    # 1. User A creates an item
    create_res = client.post(
        "/api/wardrobe/items",
        headers={"Authorization": f"Bearer test-token-{user_a_id}"},
        json={
            "id": "item-user-alpha-99",
            "name": "Alpha Custom Leather Jacket",
            "category": "Tops",
            "colour": "Black"
        }
    )
    assert create_res.status_code == 201
    created = create_res.get_json()["item"]
    assert created["id"] == "item-user-alpha-99"

    # 2. User B attempts to update User A's item -> Must be 403 Forbidden
    b_edit_res = client.put(
        f"/api/wardrobe/items/{created['id']}",
        headers={"Authorization": f"Bearer test-token-{user_b_id}"},
        json={"name": "Overwritten by Beta"}
    )
    assert b_edit_res.status_code == 403
    assert "Forbidden" in b_edit_res.get_json()["error"]

    # 3. User B attempts to delete User A's item -> Must be 403 Forbidden
    b_delete_res = client.delete(
        f"/api/wardrobe/items/{created['id']}",
        headers={"Authorization": f"Bearer test-token-{user_b_id}"}
    )
    assert b_delete_res.status_code == 403

    # Verify item remains unchanged
    fresh_item = get_wardrobe_item_by_id(created["id"])
    assert fresh_item["name"] == "Alpha Custom Leather Jacket"

    # 4. User A updates their own item -> Must succeed (200 OK)
    a_edit_res = client.put(
        f"/api/wardrobe/items/{created['id']}",
        headers={"Authorization": f"Bearer test-token-{user_a_id}"},
        json={"name": "Alpha Updated Jacket"}
    )
    assert a_edit_res.status_code == 200
    assert a_edit_res.get_json()["item"]["name"] == "Alpha Updated Jacket"

    # 5. User A deletes their own item -> Must succeed (200 OK)
    a_delete_res = client.delete(
        f"/api/wardrobe/items/{created['id']}",
        headers={"Authorization": f"Bearer test-token-{user_a_id}"}
    )
    assert a_delete_res.status_code == 200


# ============================================================================
# 3. BACKUP & PRESERVATION TESTS
# ============================================================================
def test_backup_preserves_sqlite_data():
    """Verify backup creates valid binary and JSON snapshots without deleting SQLite DB."""
    db_path = BASE_DIR / "backend" / "data" / "wardrobe.db"
    assert db_path.exists()

    db_backup, json_backup, sql_migration = backup_sqlite()

    assert db_path.exists(), "Original SQLite database must NEVER be deleted!"
    assert Path(db_backup).exists()
    assert Path(json_backup).exists()
    assert Path(sql_migration).exists()

    # Check JSON backup validity
    with open(json_backup, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert isinstance(data, list)
    assert len(data) >= 1
