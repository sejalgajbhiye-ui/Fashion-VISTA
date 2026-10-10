"""
Fashion-MNIST Classification Training & Evaluation.

Trains:
1. Baseline Linear Classifier (SGD with log-loss / Logistic Regression)
2. PyTorch Deep Convolutional Neural Network (FashionCNN)

Saves:
- models/fmnist_baseline.joblib
- models/fmnist_cnn.pt
- models/fmnist_classes.json
- datasets/reports/classifier_eval.json
- datasets/reports/classifier_eval.md
"""

import os
import sys
import json
import gzip
import struct
import time
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
import joblib

BASE_DIR = Path(__file__).resolve().parent.parent.parent
RAW_DIR = BASE_DIR / "datasets" / "fashion_mnist" / "raw"
MODELS_DIR = BASE_DIR / "models"
REPORTS_DIR = BASE_DIR / "datasets" / "reports"

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


def read_idx_images(gz_path):
    with gzip.open(gz_path, "rb") as f:
        magic, num_images, rows, cols = struct.unpack(">IIII", f.read(16))
        data = np.frombuffer(f.read(), dtype=np.uint8)
        return data.reshape((num_images, rows, cols))


def read_idx_labels(gz_path):
    with gzip.open(gz_path, "rb") as f:
        magic, num_items = struct.unpack(">II", f.read(8))
        return np.frombuffer(f.read(), dtype=np.uint8)


class FashionCNN(nn.Module):
    def __init__(self, num_classes=10):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 32, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(32)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(64)
        self.pool = nn.MaxPool2d(2, 2)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.25)
        self.fc1 = nn.Linear(64 * 7 * 7, 128)
        self.fc2 = nn.Linear(128, num_classes)

    def forward(self, x):
        # Input: (B, 1, 28, 28)
        x = self.relu(self.bn1(self.conv1(x)))
        x = self.pool(x)  # (B, 32, 14, 14)
        x = self.relu(self.bn2(self.conv2(x)))
        x = self.pool(x)  # (B, 64, 7, 7)
        x = x.view(x.size(0), -1)  # (B, 64*7*7 = 3136)
        x = self.dropout(self.relu(self.fc1(x)))
        x = self.fc2(x)
        return x


def train_and_evaluate():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    print("Loading raw Fashion-MNIST IDX files...")
    train_imgs = read_idx_images(RAW_DIR / "train-images-idx3-ubyte.gz")
    train_lbls = read_idx_labels(RAW_DIR / "train-labels-idx1-ubyte.gz")
    test_imgs = read_idx_images(RAW_DIR / "t10k-images-idx3-ubyte.gz")
    test_lbls = read_idx_labels(RAW_DIR / "t10k-labels-idx1-ubyte.gz")

    print(f"Loaded: Train {train_imgs.shape}, Test {test_imgs.shape}")

    # Normalize to [0, 1]
    X_train_norm = train_imgs.astype(np.float32) / 255.0
    X_test_norm = test_imgs.astype(np.float32) / 255.0

    # 1. Train Baseline Classifier
    print("\n--- Training Baseline Classifier (SGD Log-Loss) ---")
    start_time = time.time()
    X_train_flat = X_train_norm.reshape(len(X_train_norm), -1)
    X_test_flat = X_test_norm.reshape(len(X_test_norm), -1)

    baseline_clf = SGDClassifier(loss="log_loss", max_iter=25, random_state=42, n_jobs=-1)
    baseline_clf.fit(X_train_flat, train_lbls)
    base_train_time = round(time.time() - start_time, 2)

    base_preds = baseline_clf.predict(X_test_flat)
    base_acc = float(accuracy_score(test_lbls, base_preds))
    base_p, base_r, base_f1, _ = precision_recall_fscore_support(test_lbls, base_preds, average="weighted")
    print(f"Baseline Test Accuracy: {base_acc:.4f}, Weighted F1: {base_f1:.4f} (Trained in {base_train_time}s)")

    joblib.dump(baseline_clf, MODELS_DIR / "fmnist_baseline.joblib")

    # 2. Train PyTorch CNN
    print("\n--- Training PyTorch Deep CNN (FashionCNN) ---")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using compute device: {device}")

    # Add channel dimension: (N, 1, 28, 28)
    X_train_t = torch.tensor(X_train_norm[:, np.newaxis, :, :], dtype=torch.float32)
    y_train_t = torch.tensor(train_lbls, dtype=torch.long)
    X_test_t = torch.tensor(X_test_norm[:, np.newaxis, :, :], dtype=torch.float32)
    y_test_t = torch.tensor(test_lbls, dtype=torch.long)

    train_loader = DataLoader(TensorDataset(X_train_t, y_train_t), batch_size=64, shuffle=True)
    test_loader = DataLoader(TensorDataset(X_test_t, y_test_t), batch_size=128, shuffle=False)

    model = FashionCNN(num_classes=10).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    epochs = 4
    cnn_start = time.time()
    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            optimizer.zero_grad()
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * batch_x.size(0)
            _, predicted = outputs.max(1)
            total += batch_y.size(0)
            correct += predicted.eq(batch_y).sum().item()

        epoch_loss = running_loss / total
        epoch_acc = correct / total
        print(f"Epoch {epoch}/{epochs} - Loss: {epoch_loss:.4f} - Train Acc: {epoch_acc:.4f}")

    cnn_train_time = round(time.time() - cnn_start, 2)

    # Evaluate CNN on Test Set
    model.eval()
    all_preds = []
    all_targets = []
    with torch.no_grad():
        for batch_x, batch_y in test_loader:
            batch_x = batch_x.to(device)
            outputs = model(batch_x)
            _, predicted = outputs.max(1)
            all_preds.extend(predicted.cpu().numpy())
            all_targets.extend(batch_y.numpy())

    cnn_acc = float(accuracy_score(all_targets, all_preds))
    cnn_p, cnn_r, cnn_f1, _ = precision_recall_fscore_support(all_targets, all_preds, average="weighted")
    print(f"\nCNN Final Test Accuracy: {cnn_acc:.4f}, Weighted F1: {cnn_f1:.4f} (Trained in {cnn_train_time}s)")

    # Per-class metrics
    class_p, class_r, class_f1, class_supp = precision_recall_fscore_support(all_targets, all_preds, average=None)
    cm = confusion_matrix(all_targets, all_preds).tolist()

    per_class_results = {}
    for idx, name in LABEL_NAMES.items():
        per_class_results[name] = {
            "precision": round(float(class_p[idx]), 4),
            "recall": round(float(class_r[idx]), 4),
            "f1_score": round(float(class_f1[idx]), 4),
            "support": int(class_supp[idx])
        }

    # Save model weights & metadata
    torch.save(model.state_dict(), MODELS_DIR / "fmnist_cnn.pt")
    with open(MODELS_DIR / "fmnist_classes.json", "w", encoding="utf-8") as f:
        json.dump(LABEL_NAMES, f, indent=2)

    # Save Evaluation Report JSON
    eval_report = {
        "task": "Clothing Category Classification",
        "dataset": "Fashion-MNIST (Official Zalando Research)",
        "train_samples": len(train_lbls),
        "test_samples": len(test_lbls),
        "num_classes": 10,
        "classes": LABEL_NAMES,
        "baseline_model": {
            "model_type": "SGD Linear Classifier (Log-Loss)",
            "test_accuracy": round(base_acc, 4),
            "test_precision": round(float(base_p), 4),
            "test_recall": round(float(base_r), 4),
            "test_f1": round(float(base_f1), 4),
            "training_time_seconds": base_train_time
        },
        "deep_model": {
            "model_type": "FashionCNN (2 Conv Layers + BatchNorm + Dropout + 2 Linear)",
            "test_accuracy": round(cnn_acc, 4),
            "test_precision": round(float(cnn_p), 4),
            "test_recall": round(float(cnn_r), 4),
            "test_f1": round(float(cnn_f1), 4),
            "training_time_seconds": cnn_train_time,
            "epochs": epochs,
            "device": str(device)
        },
        "per_class_metrics": per_class_results,
        "confusion_matrix": cm,
        "limitations": "Model trained on 28x28 grayscale images. Recommended for silhouette and thumbnail category benchmarking, not complex unsegmented color photographs."
    }

    with open(REPORTS_DIR / "classifier_eval.json", "w", encoding="utf-8") as f:
        json.dump(eval_report, f, indent=2)

    # Generate Markdown Report
    md_content = f"""# Fashion VISTA — Clothing Classifier Evaluation Report

### 1. Model Comparison on Held-Out Test Set (10,000 samples)
| Model Architecture | Test Accuracy | Precision | Recall | Weighted F1 | Training Time |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Baseline (SGD Log-Loss)** | {base_acc * 100:.2f}% | {base_p:.4f} | {base_r:.4f} | {base_f1:.4f} | {base_train_time}s |
| **FashionCNN (PyTorch)** | **{cnn_acc * 100:.2f}%** | **{cnn_p:.4f}** | **{cnn_r:.4f}** | **{cnn_f1:.4f}** | {cnn_train_time}s |

---

### 2. Per-Class Performance (FashionCNN)
| Class ID | Clothing Category | Precision | Recall | F1-Score | Support |
| :---: | :--- | :---: | :---: | :---: | :---: |
"""
    for idx, name in LABEL_NAMES.items():
        m = per_class_results[name]
        md_content += f"| {idx} | **{name}** | {m['precision']:.4f} | {m['recall']:.4f} | {m['f1_score']:.4f} | {m['support']} |\n"

    md_content += f"""
---

### 3. Confusion Matrix (10x10)
Diagonal elements represent correct predictions across test items:
```text
{np.array2string(np.array(cm), separator=', ')}
```
"""
    with open(REPORTS_DIR / "classifier_eval.md", "w", encoding="utf-8") as f:
        f.write(md_content)

    print(f"\nAll models trained and saved to {MODELS_DIR}")
    print(f"Evaluation report saved to {REPORTS_DIR / 'classifier_eval.json'}")


if __name__ == "__main__":
    train_and_evaluate()
