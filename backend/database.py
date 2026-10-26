"""
SQLite Database Layer for Fashion VISTA Digital Wardrobe.

Provides persistent storage for wardrobe items across sessions,
supporting CRUD operations, schema migrations, and initial seed items.
"""

import os
import json
import sqlite3
import uuid
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "backend" / "data"
DB_PATH = DATA_DIR / "wardrobe.db"
DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_db_connection():
    """Returns a SQLite connection with dict-like row access."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes the database schema and seeds initial data if table is empty."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS wardrobe_items (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            colour TEXT,
            style TEXT,
            season TEXT,
            brand TEXT,
            description TEXT,
            image TEXT,
            predicted_category TEXT,
            confidence REAL,
            model_used TEXT,
            user_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()

    # Safely migrate existing database to include user_id if missing
    try:
        cursor.execute("ALTER TABLE wardrobe_items ADD COLUMN user_id TEXT")
        conn.commit()
    except sqlite3.OperationalError:
        pass  # Column already exists

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS outfit_plans (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            planned_date TEXT NOT NULL,
            occasion TEXT NOT NULL DEFAULT 'Casual',
            outfit_name TEXT NOT NULL,
            items TEXT NOT NULL DEFAULT '[]',
            wardrobe_item_ids TEXT NOT NULL DEFAULT '[]',
            note TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'planned',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''CREATE INDEX IF NOT EXISTS idx_outfit_plans_user_date ON outfit_plans(user_id, planned_date)''')
    conn.commit()

    # Check if empty, then seed initial sample wardrobe items
    cursor.execute("SELECT COUNT(*) AS cnt FROM wardrobe_items")
    count = cursor.fetchone()["cnt"]
    if count == 0:
        seed_initial_items(conn)

    conn.close()


def seed_initial_items(conn):
    """Seeds starter items matching the existing UI presets."""
    sample_items = [
        {
            "id": "item-1",
            "name": "Classic White Linen Shirt",
            "category": "Tops",
            "colour": "White",
            "style": "Formal",
            "season": "Summer",
            "brand": "Uniqlo",
            "description": "Breathable linen shirt for business casual and summer events.",
            "image": "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=700&q=80",
            "predicted_category": "Shirt",
            "confidence": 0.95,
            "model_used": "FashionCNN (PyTorch)"
        },
        {
            "id": "item-2",
            "name": "Dark Slim-Fit Denim Jeans",
            "category": "Bottoms",
            "colour": "Blue",
            "style": "Casual",
            "season": "All Season",
            "brand": "Levi's",
            "description": "Versatile dark wash jeans for everyday styling.",
            "image": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=700&q=80",
            "predicted_category": "Trouser",
            "confidence": 0.98,
            "model_used": "FashionCNN (PyTorch)"
        },
        {
            "id": "item-3",
            "name": "Tailored Navy Blazer",
            "category": "Tops",
            "colour": "Navy",
            "style": "Formal",
            "season": "Fall",
            "brand": "Zara",
            "description": "Structured slim-fit single-breasted blazer.",
            "image": "https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?auto=format&fit=crop&w=700&q=80",
            "predicted_category": "Coat",
            "confidence": 0.91,
            "model_used": "FashionCNN (PyTorch)"
        },
        {
            "id": "item-4",
            "name": "White Minimal Leather Sneakers",
            "category": "Shoes",
            "colour": "White",
            "style": "Casual",
            "season": "All Season",
            "brand": "Stan Smith",
            "description": "Clean low-profile leather sneakers.",
            "image": "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=700&q=80",
            "predicted_category": "Sneaker",
            "confidence": 0.96,
            "model_used": "FashionCNN (PyTorch)"
        },
        {
            "id": "item-5",
            "name": "Emerald Silk Midi Dress",
            "category": "Dresses",
            "colour": "Green",
            "style": "Party",
            "season": "Summer",
            "brand": "Mango",
            "description": "Elegant emerald green silk dress with gentle drape.",
            "image": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=700&q=80",
            "predicted_category": "Dress",
            "confidence": 0.93,
            "model_used": "FashionCNN (PyTorch)"
        },
        {
            "id": "item-6",
            "name": "Tan Leather Crossbody Bag",
            "category": "Accessories",
            "colour": "Brown",
            "style": "Casual",
            "season": "All Season",
            "brand": "Coach",
            "description": "Everyday crossbody bag with brass hardware.",
            "image": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=700&q=80",
            "predicted_category": "Bag",
            "confidence": 0.97,
            "model_used": "FashionCNN (PyTorch)"
        }
    ]
    cursor = conn.cursor()
    for item in sample_items:
        cursor.execute("""
            INSERT INTO wardrobe_items (
                id, name, category, colour, style, season, brand, description,
                image, predicted_category, confidence, model_used
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            item["id"], item["name"], item["category"], item["colour"], item["style"],
            item["season"], item["brand"], item["description"], item["image"],
            item["predicted_category"], item["confidence"], item["model_used"]
        ))
    conn.commit()


def get_all_wardrobe_items(user_id=None):
    """
    Retrieves wardrobe items strictly belonging to the given user_id.
    If user has not added any clothes, returns an empty list.
    Never pollutes a user's wardrobe with dummy clothes.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    if user_id:
        cursor.execute(
            "SELECT * FROM wardrobe_items WHERE user_id = ? OR user_id IS NULL OR user_id = 'guest' ORDER BY created_at DESC",
            (user_id,)
        )
    else:
        # For guests without an account, return guest or default seed items
        cursor.execute(
            "SELECT * FROM wardrobe_items WHERE user_id = 'guest' OR user_id IS NULL ORDER BY created_at DESC"
        )
    rows = cursor.fetchall()
    items = [dict(row) for row in rows]
    conn.close()
    return items


def get_wardrobe_item_by_id(item_id):
    """Retrieves a single item by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM wardrobe_items WHERE id = ?", (item_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def insert_wardrobe_item(item_data, user_id=None):
    """Inserts a new wardrobe item linked to optional user_id."""
    item_id = item_data.get("id") or f"item-{uuid.uuid4().hex[:8]}"
    name = item_data.get("name", "").strip()
    category = item_data.get("category", "Tops").strip()
    colour = item_data.get("colour", "Black").strip()
    style = item_data.get("style", "Casual").strip()
    season = item_data.get("season", "All Season").strip()
    brand = item_data.get("brand", "").strip()
    description = item_data.get("description", "").strip()
    image = item_data.get("image", "").strip()
    predicted_category = item_data.get("predicted_category")
    confidence = item_data.get("confidence")
    model_used = item_data.get("model_used")
    resolved_user_id = user_id or item_data.get("user_id")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO wardrobe_items (
            id, name, category, colour, style, season, brand, description,
            image, predicted_category, confidence, model_used, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        item_id, name, category, colour, style, season, brand, description,
        image, predicted_category, confidence, model_used, resolved_user_id
    ))
    conn.commit()
    conn.close()
    return get_wardrobe_item_by_id(item_id)


def update_wardrobe_item(item_id, update_fields, user_id=None):
    """
    Updates selected fields of an existing wardrobe item with ownership validation.
    Returns:
        dict: updated item if successful
        None: if item doesn't exist or ownership check fails
    """
    existing = get_wardrobe_item_by_id(item_id)
    if not existing:
        return None

    # Ownership check: if item belongs to a user, only that user may update it
    if existing.get("user_id"):
        if not user_id or str(existing["user_id"]) != str(user_id):
            return None

    allowed_fields = [
        "name", "category", "colour", "style", "season",
        "brand", "description", "image"
    ]
    updates = []
    values = []
    for field in allowed_fields:
        if field in update_fields:
            updates.append(f"{field} = ?")
            values.append(update_fields[field])

    if not updates:
        return existing

    values.append(item_id)
    sql = f"UPDATE wardrobe_items SET {', '.join(updates)} WHERE id = ?"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(sql, values)
    conn.commit()
    conn.close()
    return get_wardrobe_item_by_id(item_id)


def delete_wardrobe_item(item_id, user_id=None):
    """
    Deletes an item from the wardrobe table with ownership validation.
    Prevents unauthorized deletion of other users' items.
    """
    existing = get_wardrobe_item_by_id(item_id)
    if not existing:
        return True

    # Ownership check:
    # If item belongs to a specific user, ensure another user cannot delete it
    if existing.get("user_id"):
        if user_id and str(existing["user_id"]) != str(user_id):
            return False

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM wardrobe_items WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return True



def serialize_plan_row(row):
    if not row:
        return None
    d = dict(row)
    try:
        d["items"] = json.loads(d["items"]) if isinstance(d.get("items"), str) else (d.get("items") or [])
    except Exception:
        d["items"] = []
    try:
        d["wardrobe_item_ids"] = json.loads(d["wardrobe_item_ids"]) if isinstance(d.get("wardrobe_item_ids"), str) else (d.get("wardrobe_item_ids") or [])
    except Exception:
        d["wardrobe_item_ids"] = []
    return d


def get_user_outfit_plans(user_id, start_date=None, end_date=None):
    """
    Retrieves all outfit plans strictly belonging to the authenticated user.
    Never returns other users' plans.
    """
    if not user_id:
        return []
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM outfit_plans WHERE user_id = ?"
    params = [str(user_id)]
    if start_date and end_date:
        query += " AND planned_date >= ? AND planned_date <= ?"
        params.extend([start_date, end_date])
    elif start_date:
        query += " AND planned_date >= ?"
        params.append(start_date)
    query += " ORDER BY planned_date ASC, created_at ASC"
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    plans = [serialize_plan_row(row) for row in rows]
    conn.close()
    return plans


def get_outfit_plan_by_id(plan_id, user_id=None):
    """Retrieves a single outfit plan with user ownership validation."""
    if not plan_id:
        return None
    conn = get_db_connection()
    cursor = conn.cursor()
    if user_id:
        cursor.execute("SELECT * FROM outfit_plans WHERE id = ? AND user_id = ?", (plan_id, str(user_id)))
    else:
        cursor.execute("SELECT * FROM outfit_plans WHERE id = ?", (plan_id,))
    row = cursor.fetchone()
    conn.close()
    return serialize_plan_row(row)


def insert_outfit_plan(plan_data, user_id):
    """Inserts a new outfit plan tied strictly to user_id."""
    if not user_id:
        raise ValueError("Authenticated user_id is required to create a plan")

    plan_id = plan_data.get("id") or f"plan-{uuid.uuid4().hex[:10]}"
    planned_date = str(plan_data.get("planned_date", "")).strip()
    if not planned_date:
        raise ValueError("planned_date is required")

    occasion = plan_data.get("occasion", "Casual").strip()
    outfit_name = plan_data.get("outfit_name", "Curated Ensemble").strip()
    note = plan_data.get("note", "").strip()
    status = plan_data.get("status", "planned").strip()
    if status not in ("planned", "worn"):
        status = "planned"

    raw_items = plan_data.get("items") or []
    items_json = json.dumps(raw_items) if isinstance(raw_items, (list, dict)) else str(raw_items)

    raw_ids = plan_data.get("wardrobe_item_ids") or []
    if not raw_ids and isinstance(raw_items, list):
        for it in raw_items:
            wid = it.get("matchedWardrobeId") or it.get("id")
            if wid and wid not in raw_ids:
                raw_ids.append(wid)
    ids_json = json.dumps(raw_ids)

    now_iso = datetime.utcnow().isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO outfit_plans (
            id, user_id, planned_date, occasion, outfit_name,
            items, wardrobe_item_ids, note, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        plan_id, str(user_id), planned_date, occasion, outfit_name,
        items_json, ids_json, note, status, now_iso, now_iso
    ))
    conn.commit()
    conn.close()
    return get_outfit_plan_by_id(plan_id, user_id=user_id)


def update_outfit_plan(plan_id, update_fields, user_id):
    """Updates an existing outfit plan with strict user ownership validation."""
    if not user_id:
        return None
    existing = get_outfit_plan_by_id(plan_id, user_id=user_id)
    if not existing:
        return None

    allowed = ["planned_date", "occasion", "outfit_name", "items", "wardrobe_item_ids", "note", "status"]
    updates = []
    values = []

    for k in allowed:
        if k in update_fields:
            val = update_fields[k]
            if k in ("items", "wardrobe_item_ids") and isinstance(val, (list, dict)):
                val = json.dumps(val)
            updates.append(f"{k} = ?")
            values.append(val)

    if not updates:
        return existing

    updates.append("updated_at = ?")
    values.append(datetime.utcnow().isoformat())
    values.append(plan_id)
    values.append(str(user_id))

    sql = f"UPDATE outfit_plans SET {', '.join(updates)} WHERE id = ? AND user_id = ?"
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(sql, tuple(values))
    conn.commit()
    conn.close()
    return get_outfit_plan_by_id(plan_id, user_id=user_id)


def delete_outfit_plan(plan_id, user_id):
    """Deletes an outfit plan strictly belonging to user_id."""
    if not user_id:
        return False
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM outfit_plans WHERE (id = ? OR planned_date = ?) AND user_id = ?", (str(plan_id), str(plan_id), str(user_id)))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def toggle_outfit_plan_status(plan_id, user_id):
    """Toggles status between 'planned' and 'worn' for a user's plan."""
    existing = get_outfit_plan_by_id(plan_id, user_id=user_id)
    if not existing:
        return None
    new_status = "worn" if existing.get("status") == "planned" else "planned"
    return update_outfit_plan(plan_id, {"status": new_status}, user_id=user_id)
