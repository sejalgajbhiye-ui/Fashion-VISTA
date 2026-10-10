"""
SQLite Database Layer for Fashion VISTA Digital Wardrobe.

Provides persistent storage for wardrobe items across sessions,
supporting CRUD operations, schema migrations, and initial seed items.
"""

import os
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
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


def get_all_wardrobe_items():
    """Retrieves all wardrobe items ordered by creation date descending."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM wardrobe_items ORDER BY created_at DESC")
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


def insert_wardrobe_item(item_data):
    """Inserts a new wardrobe item and returns the saved record."""
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

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO wardrobe_items (
            id, name, category, colour, style, season, brand, description,
            image, predicted_category, confidence, model_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        item_id, name, category, colour, style, season, brand, description,
        image, predicted_category, confidence, model_used
    ))
    conn.commit()
    conn.close()
    return get_wardrobe_item_by_id(item_id)


def update_wardrobe_item(item_id, update_fields):
    """Updates selected fields of an existing wardrobe item."""
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
        return get_wardrobe_item_by_id(item_id)

    values.append(item_id)
    sql = f"UPDATE wardrobe_items SET {', '.join(updates)} WHERE id = ?"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(sql, values)
    conn.commit()
    conn.close()
    return get_wardrobe_item_by_id(item_id)


def delete_wardrobe_item(item_id):
    """Deletes an item from the wardrobe table. Returns True if deleted."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM wardrobe_items WHERE id = ?", (item_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted
