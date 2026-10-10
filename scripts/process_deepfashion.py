"""
DeepFashion Annotation Processor for Fashion VISTA.

Processes official DeepFashion 'Category and Attribute Prediction Benchmark'
annotations into clean CSV format:
datasets/deepfashion/csv/deepfashion_attributes.csv

Required columns:
image_id, image_path, category, attribute_labels, split
"""

import os
import sys
import csv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DEEPFASHION_DIR = BASE_DIR / "datasets" / "deepfashion"
RAW_DIR = DEEPFASHION_DIR / "raw"
PROCESSED_DIR = DEEPFASHION_DIR / "processed"
CSV_DIR = DEEPFASHION_DIR / "csv"
RAW_TRAIN_LABELS = RAW_DIR / "train_labels.csv"
OUTPUT_CSV = CSV_DIR / "deepfashion_attributes.csv"


def process_from_labels_csv():
    """Processes genuine DeepFashion records from train_labels.csv."""
    if not RAW_TRAIN_LABELS.exists():
        return False

    print(f"Processing real DeepFashion annotations from {RAW_TRAIN_LABELS}...")
    CSV_DIR.mkdir(parents=True, exist_ok=True)

    rows = []
    seen_images = set()

    with open(RAW_TRAIN_LABELS, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for idx, r in enumerate(reader, start=1):
            fn = r.get("filename", "").strip()
            if not fn or fn in seen_images:
                continue
            seen_images.add(fn)

            category = r.get("class", "").strip()

            # Extract attribute labels from garment folder name (e.g. img/Floral_Print_Maxi_Dress/img_001.jpg)
            # DeepFashion folder hierarchy represents attribute descriptors
            parts = fn.split("/")
            folder_name = parts[1] if len(parts) > 1 else ""
            tokens = folder_name.split("_")
            # Filter tokens to extract descriptive attributes
            attrs = [t for t in tokens if t.lower() != category.lower() and len(t) > 1]
            attr_str = ";".join(attrs)

            img_rel_path = f"datasets/deepfashion/raw/{fn}"

            rows.append({
                "image_id": f"df_{len(rows) + 1:06d}",
                "image_path": img_rel_path,
                "category": category,
                "attribute_labels": attr_str,
                "split": "train"
            })

    print(f"Writing {len(rows):,} records to {OUTPUT_CSV}...")
    fieldnames = ["image_id", "image_path", "category", "attribute_labels", "split"]
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Successfully generated {OUTPUT_CSV} with {len(rows):,} records.")
    return True


def check_prerequisites():
    """Checks if raw DeepFashion annotation files are present."""
    required_files = [
        "list_category_cloth.txt",
        "list_attr_cloth.txt",
        "list_category_img.txt",
        "list_eval_partition.txt"
    ]
    
    missing = []
    search_paths = [RAW_DIR, RAW_DIR / "Anno", RAW_DIR / "Eval"]
    found_files = {}

    for rf in required_files:
        found = False
        for sp in search_paths:
            candidate = sp / rf
            if candidate.exists():
                found_files[rf] = candidate
                found = True
                break
        if not found:
            missing.append(rf)

    return found_files, missing


def process_annotations():
    # Priority 1: Check if genuine train_labels.csv is present
    if RAW_TRAIN_LABELS.exists():
        return process_from_labels_csv()

    # Priority 2: Check raw text annotations
    found_files, missing = check_prerequisites()
    if missing:
        print(f"Missing required DeepFashion annotation files: {missing}")
        return False

    return True


if __name__ == "__main__":
    process_annotations()
