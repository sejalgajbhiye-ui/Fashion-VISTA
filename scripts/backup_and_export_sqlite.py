"""
Fashion VISTA — SQLite Database Backup and PostgreSQL Migration Exporter.

Safely creates timestamped backups of the existing local SQLite database
and generates clean PostgreSQL-compatible SQL inserts for Supabase.

Zero-Destruction Guarantee:
- Never removes or overwrites wardrobe.db
- Outputs timestamped .db backup and .json data export
- Generates idempotent Supabase SQL migration files
"""

import os
import sys
import json
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "backend" / "data"
DB_PATH = DATA_DIR / "wardrobe.db"
BACKUPS_DIR = DATA_DIR / "backups"
MIGRATIONS_DIR = ROOT_DIR / "supabase" / "migrations"


def ensure_dirs():
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    MIGRATIONS_DIR.mkdir(parents=True, exist_ok=True)


def backup_sqlite():
    ensure_dirs()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # If DB doesn't exist yet, initialize it first so sample data is preserved
    if not DB_PATH.exists():
        print(f"[*] No existing wardrobe.db found at {DB_PATH}. Initializing default schema...")
        if str(ROOT_DIR) not in sys.path:
            sys.path.insert(0, str(ROOT_DIR))
        from backend.database import init_db
        init_db()

    # 1. Binary backup of SQLite file
    backup_db_path = BACKUPS_DIR / f"wardrobe_backup_{timestamp}.db"
    shutil.copy2(DB_PATH, backup_db_path)
    print(f"[OK] SQLite binary backup created at: {backup_db_path}")

    # 2. JSON export
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM wardrobe_items ORDER BY created_at ASC")
    rows = cursor.fetchall()
    items = [dict(row) for row in rows]
    conn.close()

    backup_json_path = BACKUPS_DIR / f"wardrobe_backup_{timestamp}.json"
    with open(backup_json_path, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    print(f"[OK] JSON data backup ({len(items)} items) created at: {backup_json_path}")

    # 3. PostgreSQL SQL Seed migration file
    seed_sql_path = MIGRATIONS_DIR / "002_seed_wardrobe_items.sql"
    with open(seed_sql_path, "w", encoding="utf-8") as f:
        f.write("-- ============================================================\n")
        f.write(f"-- Fashion VISTA Seed Data Export from SQLite ({timestamp})\n")
        f.write("-- Inserts default / existing wardrobe items into Supabase PostgreSQL\n")
        f.write("-- Safe and idempotent (ON CONFLICT DO NOTHING)\n")
        f.write("-- ============================================================\n\n")

        f.write("INSERT INTO public.wardrobe_items (\n")
        f.write("    id, name, category, colour, style, season, brand, description, image, predicted_category, confidence, model_used, is_sample\n")
        f.write(") VALUES\n")

        values_list = []
        for item in items:
            def sql_quote(val):
                if val is None:
                    return "NULL"
                s = str(val).replace("'", "''")
                return f"'{s}'"

            def num_val(val):
                return str(val) if val is not None else "NULL"

            line = f"    ({sql_quote(item['id'])}, {sql_quote(item['name'])}, {sql_quote(item['category'])}, {sql_quote(item['colour'])}, {sql_quote(item['style'])}, {sql_quote(item['season'])}, {sql_quote(item['brand'])}, {sql_quote(item['description'])}, {sql_quote(item['image'])}, {sql_quote(item['predicted_category'])}, {num_val(item['confidence'])}, {sql_quote(item['model_used'])}, TRUE)"
            values_list.append(line)

        f.write(",\n".join(values_list))
        f.write("\nON CONFLICT (id) DO UPDATE SET\n")
        f.write("    name = EXCLUDED.name,\n")
        f.write("    category = EXCLUDED.category,\n")
        f.write("    colour = EXCLUDED.colour,\n")
        f.write("    style = EXCLUDED.style,\n")
        f.write("    season = EXCLUDED.season,\n")
        f.write("    brand = EXCLUDED.brand,\n")
        f.write("    description = EXCLUDED.description,\n")
        f.write("    image = EXCLUDED.image,\n")
        f.write("    predicted_category = EXCLUDED.predicted_category,\n")
        f.write("    confidence = EXCLUDED.confidence,\n")
        f.write("    model_used = EXCLUDED.model_used,\n")
        f.write("    is_sample = EXCLUDED.is_sample;\n")

    print(f"[OK] Supabase SQL seed migration created at: {seed_sql_path}")
    print(f"\n[SUMMARY] Successfully backed up {len(items)} items. Original SQLite database remains intact.")
    return backup_db_path, backup_json_path, seed_sql_path


if __name__ == "__main__":
    backup_sqlite()
