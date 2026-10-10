"""
Product Attribute & Understanding Model Training.

Dataset: datasets/fashion_product_images/csv/fashion_products.csv (44,446 items)

Trains multi-attribute classifiers for:
- masterCategory (Apparel, Footwear, Accessories, etc.)
- subCategory (Topwear, Bottomwear, Shoes, Watches, etc.)
- usage (Casual, Formal, Sports, Ethnic, Party)
- season (Summer, Fall, Winter, Spring)

Saves:
- models/product_attribute_model.joblib
- datasets/reports/attributes_eval.json
- datasets/reports/attributes_eval.md
"""

import os
import sys
import json
import csv
import time
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
import joblib

BASE_DIR = Path(__file__).resolve().parent.parent.parent
CSV_PATH = BASE_DIR / "datasets" / "fashion_product_images" / "csv" / "fashion_products.csv"
MODELS_DIR = BASE_DIR / "models"
REPORTS_DIR = BASE_DIR / "datasets" / "reports"


def train_and_evaluate_attributes():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Loading products from {CSV_PATH}...")
    texts = []
    categories = []
    subcategories = []
    usages = []
    seasons = []

    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            name = r.get("product_name", "").strip()
            cat = r.get("category", "").strip()
            sub = r.get("subcategory", "").strip()
            usg = r.get("usage", "").strip()
            sea = r.get("season", "").strip()

            if name and cat and sub:
                texts.append(name)
                categories.append(cat)
                subcategories.append(sub)
                usages.append(usg if usg else "Casual")
                seasons.append(sea if sea else "All Season")

    print(f"Total valid samples: {len(texts):,}")

    # Split train/test (80/20)
    X_train_text, X_test_text, idx_train, idx_test = train_test_split(
        texts, list(range(len(texts))), test_size=0.2, random_state=42
    )

    vectorizer = TfidfVectorizer(max_features=6000, ngram_range=(1, 2))
    X_train_vec = vectorizer.fit_transform(X_train_text)
    X_test_vec = vectorizer.transform(X_test_text)

    targets = {
        "category": ([categories[i] for i in idx_train], [categories[i] for i in idx_test]),
        "subcategory": ([subcategories[i] for i in idx_train], [subcategories[i] for i in idx_test]),
        "usage": ([usages[i] for i in idx_train], [usages[i] for i in idx_test]),
        "season": ([seasons[i] for i in idx_train], [seasons[i] for i in idx_test])
    }

    trained_models = {}
    eval_metrics = {}

    start_total = time.time()
    for attr_name, (y_tr, y_te) in targets.items():
        print(f"\nTraining attribute classifier for: '{attr_name}'...")
        clf = LogisticRegression(max_iter=200, random_state=42, n_jobs=-1)
        t0 = time.time()
        clf.fit(X_train_vec, y_tr)
        dur = round(time.time() - t0, 2)

        preds = clf.predict(X_test_vec)
        acc = float(accuracy_score(y_te, preds))
        p, r, f1, _ = precision_recall_fscore_support(y_te, preds, average="weighted", zero_division=0)

        print(f"[{attr_name}] Test Acc: {acc:.4f}, Weighted F1: {f1:.4f} (Fit time: {dur}s)")
        trained_models[attr_name] = clf
        eval_metrics[attr_name] = {
            "accuracy": round(acc, 4),
            "precision": round(float(p), 4),
            "recall": round(float(r), 4),
            "f1_score": round(float(f1), 4),
            "classes": sorted(list(set(y_tr))),
            "training_time_seconds": dur
        }

    total_time = round(time.time() - start_total, 2)

    # Save bundle
    model_artifact = {
        "vectorizer": vectorizer,
        "models": trained_models,
        "attributes": list(targets.keys())
    }
    save_path = MODELS_DIR / "product_attribute_model.joblib"
    joblib.dump(model_artifact, save_path)
    print(f"\nSaved attribute model bundle to {save_path}")

    # Save JSON report
    report_json = {
        "task": "Product Attribute Understanding and Categorization",
        "dataset": "Fashion Product Images (Small)",
        "train_samples": len(X_train_text),
        "test_samples": len(X_test_text),
        "total_training_time_seconds": total_time,
        "attributes_evaluated": eval_metrics
    }
    with open(REPORTS_DIR / "attributes_eval.json", "w", encoding="utf-8") as f:
        json.dump(report_json, f, indent=2)

    # Save Markdown report
    md_content = f"""# Fashion VISTA — Attribute Classifier Evaluation Report

### 1. Attribute Prediction Performance on Test Set ({len(X_test_text):,} samples)
| Target Attribute | Test Accuracy | Precision | Recall | Weighted F1 | Training Time | Classes |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
"""
    for attr, m in eval_metrics.items():
        md_content += f"| **{attr}** | **{m['accuracy'] * 100:.2f}%** | {m['precision']:.4f} | {m['recall']:.4f} | {m['f1_score']:.4f} | {m['training_time_seconds']}s | {len(m['classes'])} classes |\n"

    md_content += f"""
---

### 2. Supported Attributes
- `category`: Identifies high-level garment type (Apparel, Footwear, Accessories, etc.)
- `subcategory`: Identifies specific functional role (Topwear, Bottomwear, Shoes, Bags, etc.)
- `usage`: Detects intended occasion context (Casual, Formal, Sports, Ethnic, Party)
- `season`: Detects seasonal suitability (Summer, Winter, Fall, Spring, All Season)
"""

    with open(REPORTS_DIR / "attributes_eval.md", "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"Generated {REPORTS_DIR / 'attributes_eval.json'} and Markdown report.")


if __name__ == "__main__":
    train_and_evaluate_attributes()
