"""
Fashion Product Images Processor for Fashion VISTA.

Dataset: Param Aggarwal - Fashion Product Images (Small)
URL: https://www.kaggle.com/datasets/paramaggarwal/fashion-product-images-small

Processes raw styles.csv into cleaned CSV format:
datasets/fashion_product_images/csv/fashion_products.csv

Target schema:
product_id, image_path, category, subcategory, colour, season, usage, gender, article_type, product_name
"""

import os
import sys
import csv
import subprocess
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PRODUCT_DIR = BASE_DIR / "datasets" / "fashion_product_images"
RAW_DIR = PRODUCT_DIR / "raw"
PROCESSED_DIR = PRODUCT_DIR / "processed"
CSV_DIR = PRODUCT_DIR / "csv"
RAW_STYLES_CSV = RAW_DIR / "styles.csv"
OUTPUT_CSV = CSV_DIR / "fashion_products.csv"


def print_kaggle_instructions():
    print("=" * 80)
    print("KAGGLE API SECURE AUTHENTICATION SETUP INSTRUCTIONS")
    print("=" * 80)
    print("To download the Fashion Product Images dataset securely from Kaggle:")
    print("")
    print("1. Log in to your Kaggle account at https://www.kaggle.com")
    print("2. Navigate to your Account Settings: https://www.kaggle.com/settings")
    print("3. Scroll down to the 'API' section and click 'Create New Token'.")
    print("   This will download a file named 'kaggle.json'.")
    print("4. Place 'kaggle.json' in your user directory:")
    kaggle_dir = Path.home() / ".kaggle"
    kaggle_path = kaggle_dir / "kaggle.json"
    print(f"   Destination: {kaggle_path}")
    print("   (Ensure the .kaggle directory exists: mkdir ~/.kaggle)")
    print("5. On Windows, secure permissions so only your user can read it.")
    print("6. Install the kaggle package if needed: pip install kaggle")
    print("7. Run this script again, or manually download the archive from:")
    print("   https://www.kaggle.com/datasets/paramaggarwal/fashion-product-images-small")
    print(f"   and unzip its contents into: {RAW_DIR}")
    print("=" * 80)


def check_and_download():
    if RAW_STYLES_CSV.exists():
        print(f"Found styles.csv at: {RAW_STYLES_CSV}")
        return True

    # Check if Kaggle credentials exist
    kaggle_config = Path.home() / ".kaggle" / "kaggle.json"
    if not kaggle_config.exists() and not os.environ.get("KAGGLE_USERNAME"):
        print(f"styles.csv not found in {RAW_DIR}, and Kaggle credentials not configured.")
        print_kaggle_instructions()
        return False

    print("Kaggle credentials found. Attempting dataset download via kaggle CLI...")
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    try:
        cmd = [
            sys.executable, "-m", "kaggle", "datasets", "download",
            "-d", "paramaggarwal/fashion-product-images-small",
            "-p", str(RAW_DIR),
            "--unzip"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0 and RAW_STYLES_CSV.exists():
            print("Download and extraction completed successfully!")
            return True
        else:
            print("Kaggle download failed or kaggle package not installed.")
            print(result.stdout)
            print(result.stderr)
            print_kaggle_instructions()
            return False
    except Exception as e:
        print(f"Error executing kaggle command: {e}")
        print_kaggle_instructions()
        return False


def clean_and_process():
    if not RAW_STYLES_CSV.exists():
        print(f"styles.csv not found at {RAW_STYLES_CSV}. Cannot process data.")
        return False

    CSV_DIR.mkdir(parents=True, exist_ok=True)
    images_dir = RAW_DIR / "images"

    cleaned_rows = []
    skipped_rows = 0
    total_rows = 0

    print(f"Reading and cleaning {RAW_STYLES_CSV}...")
    with open(RAW_STYLES_CSV, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            print("styles.csv is empty.")
            return False

        # Header: id, gender, masterCategory, subCategory, articleType, baseColour, season, year, usage, productDisplayName
        header_map = {col.strip(): i for i, col in enumerate(header)}
        id_idx = header_map.get("id", 0)
        gender_idx = header_map.get("gender")
        master_cat_idx = header_map.get("masterCategory")
        sub_cat_idx = header_map.get("subCategory")
        art_type_idx = header_map.get("articleType")
        colour_idx = header_map.get("baseColour")
        season_idx = header_map.get("season")
        usage_idx = header_map.get("usage")
        name_idx = header_map.get("productDisplayName")

        for row_num, row in enumerate(reader, start=2):
            total_rows += 1
            if len(row) < 9:
                skipped_rows += 1
                continue

            product_id = row[id_idx].strip()
            if not product_id or not product_id.isdigit():
                skipped_rows += 1
                continue

            # Verify image file existence if images folder exists
            img_rel = f"images/{product_id}.jpg"
            img_full = images_dir / f"{product_id}.jpg"
            img_path_str = f"datasets/fashion_product_images/raw/images/{product_id}.jpg" if img_full.exists() else ""

            cleaned_rows.append({
                "product_id": product_id,
                "image_path": img_path_str,
                "category": row[master_cat_idx].strip() if master_cat_idx is not None and master_cat_idx < len(row) else "",
                "subcategory": row[sub_cat_idx].strip() if sub_cat_idx is not None and sub_cat_idx < len(row) else "",
                "colour": row[colour_idx].strip() if colour_idx is not None and colour_idx < len(row) else "",
                "season": row[season_idx].strip() if season_idx is not None and season_idx < len(row) else "",
                "usage": row[usage_idx].strip() if usage_idx is not None and usage_idx < len(row) else "",
                "gender": row[gender_idx].strip() if gender_idx is not None and gender_idx < len(row) else "",
                "article_type": row[art_type_idx].strip() if art_type_idx is not None and art_type_idx < len(row) else "",
                "product_name": row[name_idx].strip() if name_idx is not None and name_idx < len(row) else ""
            })

    print(f"Total input rows: {total_rows:,}, Cleaned: {len(cleaned_rows):,}, Skipped malformed: {skipped_rows}")

    fieldnames = [
        "product_id", "image_path", "category", "subcategory",
        "colour", "season", "usage", "gender", "article_type", "product_name"
    ]
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(cleaned_rows)

    print(f"Cleaned CSV saved to: {OUTPUT_CSV}")
    return True


if __name__ == "__main__":
    if check_and_download():
        clean_and_process()
