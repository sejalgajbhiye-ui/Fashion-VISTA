"""
VITON-HD Processor and Manifest Generator for Fashion VISTA.

Repository: https://github.com/shadow2496/VITON-HD
Research paper: High-Resolution Virtual Try-On via Misalignment-Aware Normalization (CVPR 2021)
Dataset link: https://drive.google.com/file/d/1tLx8LRp-sxDp0EcYmYoV_vXdSc-jJ79w/view?usp=sharing
Pretrained weights: https://drive.google.com/drive/folders/0B8kXrnobEVh9fnJHX3lCZzEtd20yUVAtTk5HdWk2OVV0RGl6YXc0NWhMOTlvb1FKX3Z1OUk

Creates CSV manifest:
datasets/viton_hd/csv/viton_hd_pairs.csv
Columns: sample_id, person_image_path, garment_image_path, split
"""

import os
import sys
import csv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
VITON_DIR = BASE_DIR / "datasets" / "viton_hd"
RAW_DIR = VITON_DIR / "raw"
PROCESSED_DIR = VITON_DIR / "processed"
CSV_DIR = VITON_DIR / "csv"
OUTPUT_CSV = CSV_DIR / "viton_hd_pairs.csv"


def print_requirements_and_instructions():
    print("=" * 80)
    print("VITON-HD DATASET SPECIFICATIONS & HARDWARE REQUIREMENTS")
    print("=" * 80)
    print("1. Purpose: High-Resolution (1024x768) Image-Based Virtual Try-On.")
    print("2. License: Academic Non-Commercial Research Only (KAIST CVPR 2021).")
    print("3. Dataset Size & Storage Requirements:")
    print("   - Archive size: ~15 GB compressed (.zip)")
    print("   - Uncompressed size: ~25 GB (13,679 pairs, split 11,647 train, 2,032 test)")
    print("   - NOTE: Your current local drive has ~13.8 GB free. Downloading the full")
    print("     dataset locally without freeing disk space or using an external drive")
    print("     will result in out-of-disk-space errors.")
    print("4. Compute & Hardware Requirements:")
    print("   - Inference: Dedicated NVIDIA GPU with >= 12 GB VRAM (RTX 3080/3090, A100, etc.)")
    print("   - Training: Multi-GPU setup (VRAM >= 24GB recommended)")
    print("   - Software: PyTorch >= 1.6.0 with CUDA, torchvision, opencv-python, torchgeometry")
    print("5. Pretrained Weights Available:")
    print("   - ALIAS generator and normalization checkpoints (*.pkl) available via Google Drive:")
    print("     https://drive.google.com/drive/folders/0B8kXrnobEVh9fnJHX3lCZzEtd20yUVAtTk5HdWk2OVV0RGl6YXc0NWhMOTlvb1FKX3Z1OUk")
    print("6. How to place data once acquired with user approval:")
    print("   - Place uncompressed files or test set inside:")
    print(f"     {RAW_DIR}")
    print("   - Required structure:")
    print("     raw/test/image/*.jpg (person images)")
    print("     raw/test/cloth/*.jpg (garment images)")
    print("     raw/test_pairs.txt (contains pairs: '<person_image_name> <cloth_image_name>')")
    print("   - Then run: python scripts/process_viton_hd.py")
    print("=" * 80)


def generate_manifest():
    search_dirs = [
        RAW_DIR,
        RAW_DIR / "datasets",
        RAW_DIR / "viton_hd"
    ]

    target_root = None
    for sd in search_dirs:
        if (sd / "test_pairs.txt").exists() or (sd / "train_pairs.txt").exists() or (sd / "test" / "image").exists():
            target_root = sd
            break

    if not target_root:
        print(f"No existing VITON-HD dataset files found in {RAW_DIR}.")
        print_requirements_and_instructions()
        return False

    print(f"Found VITON-HD files in {target_root}. Generating manifest...")
    CSV_DIR.mkdir(parents=True, exist_ok=True)

    rows = []
    sample_id = 1

    # Check test pairs
    for split in ["test", "train"]:
        pairs_file = target_root / f"{split}_pairs.txt"
        img_dir = target_root / split / "image"
        cloth_dir = target_root / split / "cloth"

        if pairs_file.exists():
            with open(pairs_file, "r", encoding="utf-8") as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) >= 2:
                        p_img = parts[0]
                        c_img = parts[1]
                        rows.append({
                            "sample_id": f"viton_{sample_id:06d}",
                            "person_image_path": str(img_dir / p_img) if (img_dir / p_img).exists() else f"datasets/viton_hd/raw/{split}/image/{p_img}",
                            "garment_image_path": str(cloth_dir / c_img) if (cloth_dir / c_img).exists() else f"datasets/viton_hd/raw/{split}/cloth/{c_img}",
                            "split": split
                        })
                        sample_id += 1
        elif img_dir.exists() and cloth_dir.exists():
            # Pair matching by filename
            person_imgs = sorted([f.name for f in img_dir.glob("*.jpg")])
            for p_img in person_imgs:
                c_img = p_img  # paired matching
                rows.append({
                    "sample_id": f"viton_{sample_id:06d}",
                    "person_image_path": str(img_dir / p_img),
                    "garment_image_path": str(cloth_dir / c_img) if (cloth_dir / c_img).exists() else "",
                    "split": split
                })
                sample_id += 1

    if rows:
        with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["sample_id", "person_image_path", "garment_image_path", "split"])
            writer.writeheader()
            writer.writerows(rows)
        print(f"Generated {OUTPUT_CSV} with {len(rows):,} pairs.")
        return True
    else:
        print("No pairs could be extracted from available directories.")
        return False


if __name__ == "__main__":
    generate_manifest()
