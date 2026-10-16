"""
Fashion VISTA — Virtual Try-On Paired Dataset Builder.
Downloads and prepares paired triplets:
- person/ : Full/upper-body portrait of person
- cloth/ : Clean isolated garment flat-lay / image
- person_wearing_cloth/ : Ground-truth reference of the person realistically wearing that cloth.
"""

import os
import io
import json
import logging
import urllib.request
from pathlib import Path
from PIL import Image
import numpy as np
import cv2

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("VTONDatasetBuilder")

BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = BASE_DIR / "datasets" / "vton_paired_dataset"
PERSON_DIR = DATASET_DIR / "person"
CLOTH_DIR = DATASET_DIR / "cloth"
WEARING_DIR = DATASET_DIR / "person_wearing_cloth"

for d in [PERSON_DIR, CLOTH_DIR, WEARING_DIR]:
    d.mkdir(parents=True, exist_ok=True)


def download_url(url: str, dest_path: Path) -> bool:
    """Safely downloads a file from URL if not already present."""
    if dest_path.exists() and dest_path.stat().st_size > 1000:
        return True
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            with open(dest_path, "wb") as f:
                f.write(data)
        return True
    except Exception as e:
        logger.warning(f"Failed to download {url}: {e}")
        return False


def build_kolors_triplets(index_list):
    """Downloads Kolors high-resolution virtual try-on triplets."""
    logger.info("Downloading Kolors Virtual Try-On triplets from Hugging Face...")
    base_url = "https://huggingface.co/spaces/Kwai-Kolors/Kolors-Virtual-Try-On/resolve/main/assets/examples/"
    for i in [1, 2, 3]:
        p_name = f"kolors_model_{i}.png"
        c_name = f"kolors_cloth_{i}.png"
        w_name = f"kolors_wearing_{i}.png"

        p_dest = PERSON_DIR / p_name
        c_dest = CLOTH_DIR / c_name
        w_dest = WEARING_DIR / w_name

        s1 = download_url(f"{base_url}model{i}.png", p_dest)
        s2 = download_url(f"{base_url}garment{i}.png", c_dest)
        s3 = download_url(f"{base_url}result{i}.png", w_dest)

        if s1 and s2 and s3:
            index_list.append({
                "id": f"kolors_{i}",
                "person": str(p_dest.relative_to(DATASET_DIR)),
                "cloth": str(c_dest.relative_to(DATASET_DIR)),
                "person_wearing_cloth": str(w_dest.relative_to(DATASET_DIR)),
                "category": "topwear" if i != 2 else "dress",
                "source": "HuggingFace Kwai-Kolors/Kolors-Virtual-Try-On"
            })
            logger.info(f"Added Kolors triplet #{i}")


def build_viton_hd_triplets(index_list, num_samples: int = 50):
    """Extracts paired triplets from cached VITON-HD controlnet dataset."""
    logger.info(f"Extracting up to {num_samples} paired triplets from VITON-HD dataset...")
    try:
        from huggingface_hub import hf_hub_download
        import pandas as pd

        parquet_file = hf_hub_download(
            repo_id="merensoykok/vitonhd-dataset-for-controlnet-test",
            filename="data/train-00000-of-00001.parquet",
            repo_type="dataset"
        )
        df = pd.read_parquet(parquet_file)
        logger.info(f"Loaded VITON-HD parquet with {len(df)} candidate rows.")

        count = 0
        for idx in range(min(num_samples, len(df))):
            row = df.iloc[idx]
            p_name = f"viton_hd_person_{idx:03d}.jpg"
            c_name = f"viton_hd_cloth_{idx:03d}.png"
            w_name = f"viton_hd_wearing_{idx:03d}.jpg"

            p_dest = PERSON_DIR / p_name
            c_dest = CLOTH_DIR / c_name
            w_dest = WEARING_DIR / w_name

            if p_dest.exists() and c_dest.exists() and w_dest.exists():
                index_list.append({
                    "id": f"viton_hd_{idx:03d}",
                    "person": str(p_dest.relative_to(DATASET_DIR)),
                    "cloth": str(c_dest.relative_to(DATASET_DIR)),
                    "person_wearing_cloth": str(w_dest.relative_to(DATASET_DIR)),
                    "category": "topwear",
                    "source": "HuggingFace VITON-HD"
                })
                count += 1
                continue

            src_img = Image.open(io.BytesIO(row["source"]["bytes"])).convert("RGB")
            tgt_img = Image.open(io.BytesIO(row["target"]["bytes"])).convert("RGB")

            src_np = np.array(src_img)
            tgt_np = np.array(tgt_img)

            # Isolate cloth from difference between target and source
            diff = np.abs(tgt_np.astype(int) - src_np.astype(int)).sum(axis=-1)
            cloth_mask = (diff > 18).astype(np.uint8)

            # Clean mask using morphological operations
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            cloth_mask = cv2.morphologyEx(cloth_mask, cv2.MORPH_CLOSE, kernel)
            cloth_mask = cv2.GaussianBlur(cloth_mask.astype(np.float32), (5, 5), 0) > 0.3

            # Crop cloth bounding box to isolate garment
            y_indices, x_indices = np.where(cloth_mask)
            if len(y_indices) < 200 or len(x_indices) < 200:
                continue

            y1, y2 = max(0, y_indices.min() - 8), min(tgt_np.shape[0], y_indices.max() + 8)
            x1, x2 = max(0, x_indices.min() - 8), min(tgt_np.shape[1], x_indices.max() + 8)

            cropped_cloth_rgb = tgt_np[y1:y2, x1:x2]
            cropped_mask = (cloth_mask[y1:y2, x1:x2] * 255).astype(np.uint8)

            # Create clean RGBA garment PNG
            cloth_rgba = np.dstack([cropped_cloth_rgb, cropped_mask])

            # Save triplets
            src_img.save(p_dest, quality=95)
            Image.fromarray(cloth_rgba).save(c_dest)
            tgt_img.save(w_dest, quality=95)

            index_list.append({
                "id": f"viton_hd_{idx:03d}",
                "person": str(p_dest.relative_to(DATASET_DIR)),
                "cloth": str(c_dest.relative_to(DATASET_DIR)),
                "person_wearing_cloth": str(w_dest.relative_to(DATASET_DIR)),
                "category": "topwear",
                "source": "HuggingFace VITON-HD"
            })
            count += 1

        logger.info(f"Extracted {count} triplets from VITON-HD.")
    except Exception as e:
        logger.error(f"Error extracting VITON-HD triplets: {e}")


def build_local_benchmark_triplets(index_list):
    """Incorporates project benchmark pairs into the unified dataset."""
    logger.info("Registering local benchmark triplets...")
    public_dir = BASE_DIR / "public"
    uploads_dir = BASE_DIR / "backend" / "uploads"

    local_specs = [
        {
            "id": "ethnic_saree_1",
            "p": public_dir / "user_indian_portrait.jpg",
            "c": public_dir / "garment_cloth1_multicolor_saree.png",
            "w": public_dir / "user_tryon_cloth1_multicolor_saree.jpg",
            "cat": "saree"
        },
        {
            "id": "ethnic_saree_2",
            "p": public_dir / "user_indian_portrait.jpg",
            "c": public_dir / "garment_cloth2_red_saree.png",
            "w": public_dir / "user_tryon_cloth2_red_saree.jpg",
            "cat": "saree"
        },
        {
            "id": "ethnic_anarkali_3",
            "p": public_dir / "user_indian_portrait.jpg",
            "c": public_dir / "garment_cloth3_green_anarkali.png",
            "w": public_dir / "user_tryon_cloth3_green_anarkali.jpg",
            "cat": "saree"
        },
        {
            "id": "ethnic_gown_4",
            "p": public_dir / "user_indian_portrait.jpg",
            "c": public_dir / "garment_cloth4_pink_gown.png",
            "w": public_dir / "user_tryon_cloth4_pink_gown.jpg",
            "cat": "saree"
        },
        {
            "id": "ethnic_blue_saree",
            "p": public_dir / "user_indian_portrait.jpg",
            "c": public_dir / "royal_blue_saree.jpg",
            "w": public_dir / "user_saree_tryon_hq.jpg",
            "cat": "saree"
        },
        {
            "id": "casual_green_tshirt",
            "p": public_dir / "user_portrait.png",
            "c": public_dir / "green_tshirt.png",
            "w": public_dir / "flannel_green_tryon_hq.jpg",
            "cat": "topwear"
        },
        {
            "id": "woman_green_tshirt",
            "p": public_dir / "woman_portrait.png",
            "c": public_dir / "green_tshirt.png",
            "w": public_dir / "woman_green_tryon_hq.jpg",
            "cat": "topwear"
        },
        {
            "id": "woman_anarkali",
            "p": public_dir / "woman_portrait.png",
            "c": public_dir / "garment_cloth3_green_anarkali.png",
            "w": public_dir / "woman_saree_tryon_hq.jpg",
            "cat": "saree"
        }
    ]

    for spec in local_specs:
        if spec["p"].exists() and spec["c"].exists() and spec["w"].exists():
            p_dst = PERSON_DIR / f"{spec['id']}_person.jpg"
            c_dst = CLOTH_DIR / f"{spec['id']}_cloth{spec['c'].suffix}"
            w_dst = WEARING_DIR / f"{spec['id']}_wearing.jpg"

            Image.open(spec["p"]).convert("RGB").save(p_dst)
            Image.open(spec["c"]).save(c_dst)
            Image.open(spec["w"]).convert("RGB").save(w_dst)

            index_list.append({
                "id": spec["id"],
                "person": str(p_dst.relative_to(DATASET_DIR)),
                "cloth": str(c_dst.relative_to(DATASET_DIR)),
                "person_wearing_cloth": str(w_dst.relative_to(DATASET_DIR)),
                "category": spec["cat"],
                "source": "Local Benchmark Paired Reference"
            })
            logger.info(f"Registered local benchmark pair: {spec['id']}")


def main():
    logger.info("Initializing Virtual Try-On dataset construction...")
    index_list = []

    # 1. Kolors triplets
    build_kolors_triplets(index_list)

    # 2. Local benchmark triplets
    build_local_benchmark_triplets(index_list)

    # 3. Hugging Face VITON-HD triplets
    build_viton_hd_triplets(index_list, num_samples=40)

    # Save index
    index_file = DATASET_DIR / "dataset_index.json"
    with open(index_file, "w", encoding="utf-8") as f:
        json.dump({
            "dataset_name": "Fashion VISTA Paired Virtual Try-On Dataset",
            "description": "Triplet dataset of (person, cloth, person_wearing_cloth) for neural try-on training",
            "total_samples": len(index_list),
            "samples": index_list
        }, f, indent=2)

    logger.info(f"Dataset construction complete! Total paired samples: {len(index_list)}")
    logger.info(f"Dataset index written to: {index_file}")


if __name__ == "__main__":
    main()
