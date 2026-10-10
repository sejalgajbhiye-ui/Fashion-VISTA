import os
import sys
import gzip
import struct
import urllib.request
import csv
from pathlib import Path
from PIL import Image
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = BASE_DIR / "datasets" / "fashion_mnist"
RAW_DIR = DATASET_DIR / "raw"
PROCESSED_DIR = DATASET_DIR / "processed"
CSV_DIR = DATASET_DIR / "csv"
IMAGES_DIR = PROCESSED_DIR / "images"

FILES = {
    "train_images": "train-images-idx3-ubyte.gz",
    "train_labels": "train-labels-idx1-ubyte.gz",
    "test_images": "t10k-images-idx3-ubyte.gz",
    "test_labels": "t10k-labels-idx1-ubyte.gz"
}

BASE_URL = "http://fashion-mnist.s3-website.eu-central-1.amazonaws.com/"

LABEL_NAMES = {
    0: "T-shirt/top",
    1: "Trouser",
    2: "Pullover",
    3: "Dress",
    4: "Coat",
    5: "Sandal",
    6: "Shirt",
    7: "Sneaker",
    8: "Bag",
    9: "Ankle boot"
}


def download_files():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    for key, filename in FILES.items():
        dest = RAW_DIR / filename
        if not dest.exists():
            url = BASE_URL + filename
            print(f"Downloading {filename} from {url}...")
            urllib.request.urlretrieve(url, dest)
            print(f"Saved: {dest} ({dest.stat().st_size:,} bytes)")
        else:
            print(f"File already exists: {dest} ({dest.stat().st_size:,} bytes)")


def read_idx_images(gz_path):
    with gzip.open(gz_path, "rb") as f:
        magic, num_images, rows, cols = struct.unpack(">IIII", f.read(16))
        assert magic == 2051, f"Invalid magic number {magic} in {gz_path}"
        data = np.frombuffer(f.read(), dtype=np.uint8)
        data = data.reshape((num_images, rows, cols))
        return data


def read_idx_labels(gz_path):
    with gzip.open(gz_path, "rb") as f:
        magic, num_items = struct.unpack(">II", f.read(8))
        assert magic == 2049, f"Invalid magic number {magic} in {gz_path}"
        labels = np.frombuffer(f.read(), dtype=np.uint8)
        return labels


def process_dataset():
    CSV_DIR.mkdir(parents=True, exist_ok=True)
    csv_file = CSV_DIR / "fashion_mnist_labels.csv"

    print("Parsing raw IDX files...")
    train_images = read_idx_images(RAW_DIR / FILES["train_images"])
    train_labels = read_idx_labels(RAW_DIR / FILES["train_labels"])
    test_images = read_idx_images(RAW_DIR / FILES["test_images"])
    test_labels = read_idx_labels(RAW_DIR / FILES["test_labels"])

    print(f"Train data: {len(train_images)} images, {len(train_labels)} labels")
    print(f"Test data: {len(test_images)} images, {len(test_labels)} labels")

    splits = [
        ("train", train_images, train_labels),
        ("test", test_images, test_labels)
    ]

    total_images_saved = 0
    (IMAGES_DIR / "train").mkdir(parents=True, exist_ok=True)
    (IMAGES_DIR / "test").mkdir(parents=True, exist_ok=True)

    print("Exporting PNG images and generating CSV manifest...")
    # Export 500 per class for train (5,000) and 200 per class for test (2,000)
    export_limit_train = 5000
    export_limit_test = 2000

    rows = []

    for split_name, images, labels in splits:
        limit = export_limit_train if split_name == "train" else export_limit_test
        
        for idx in range(len(images)):
            image_id = f"fmnist_{split_name}_{idx:05d}"
            lbl = int(labels[idx])
            cat_name = LABEL_NAMES.get(lbl, "Unknown")
            
            if idx < limit:
                rel_img_path = f"datasets/fashion_mnist/processed/images/{split_name}/{image_id}.png"
                full_img_path = BASE_DIR / rel_img_path
                if not full_img_path.exists():
                    img = Image.fromarray(images[idx], mode="L")
                    img.save(full_img_path)
                total_images_saved += 1
            else:
                rel_img_path = ""

            rows.append({
                "image_id": image_id,
                "label": lbl,
                "category": cat_name,
                "split": split_name,
                "image_path": rel_img_path
            })

    print(f"Writing {len(rows)} records to {csv_file}...")
    with open(csv_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["image_id", "label", "category", "split", "image_path"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Done! Saved CSV to {csv_file}")
    print(f"Total rows: {len(rows):,}")
    print(f"Total exported PNG images: {total_images_saved:,}")


if __name__ == "__main__":
    download_files()
    process_dataset()
