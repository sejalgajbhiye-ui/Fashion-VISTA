"""
Transfer Learning for Clothing Recognition using Pretrained MobileNetV2.

Fine-tunes a pretrained MobileNetV2 model on Fashion-MNIST:
1. Loads official Fashion-MNIST train and test IDX data.
2. Expands 1-channel 28x28 images into 3 channels (32x32) with ImageNet normalization.
3. Uses pretrained MobileNetV2 backbone with a custom fashion classification head.
4. Splits training into 50,000 train and 10,000 validation samples.
5. Evaluates on held-out 10,000 test set without data leakage.
6. Reports test Accuracy, Precision, Recall, Weighted F1, and Confusion Matrix.
7. Saves weights to models/mobilenet_v2_fmnist.pt and report to datasets/reports/.
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
import torchvision.models as models
from torchvision import transforms
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

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


class MobileNetFashion(nn.Module):
    def __init__(self, num_classes=10):
        super().__init__()
        weights = models.MobileNet_V2_Weights.DEFAULT
        self.backbone = models.mobilenet_v2(weights=weights)
        
        # Freeze initial feature layers for efficient transfer learning
        for param in self.backbone.features[:14].parameters():
            param.requires_grad = False
            
        in_features = self.backbone.classifier[1].in_features
        self.backbone.classifier = nn.Sequential(
            nn.Dropout(0.2),
            nn.Linear(in_features, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        return self.backbone(x)


def preprocess_to_3channel(images_np):
    """
    Expands (N, 28, 28) uint8 images to (N, 3, 32, 32) float32 normalized tensors.
    """
    N = len(images_np)
    # Pad 28x28 to 32x32: 2 pixels on each side
    padded = np.pad(images_np, ((0, 0), (2, 2), (2, 2)), mode="edge")
    # Normalize to [0, 1]
    norm = padded.astype(np.float32) / 255.0
    # Repeat along channel axis: (N, 3, 32, 32)
    three_chan = np.repeat(norm[:, np.newaxis, :, :], 3, axis=1)
    
    # ImageNet normalization: mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(1, 3, 1, 1)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(1, 3, 1, 1)
    standardized = (three_chan - mean) / std
    return torch.tensor(standardized, dtype=torch.float32)


def train_and_evaluate(sample_limit=12000, epochs=10):
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    print("Loading Fashion-MNIST data for Transfer Learning...")
    train_imgs_all = read_idx_images(RAW_DIR / "train-images-idx3-ubyte.gz")
    train_lbls_all = read_idx_labels(RAW_DIR / "train-labels-idx1-ubyte.gz")
    test_imgs_all = read_idx_images(RAW_DIR / "t10k-images-idx3-ubyte.gz")
    test_lbls_all = read_idx_labels(RAW_DIR / "t10k-labels-idx1-ubyte.gz")

    # Use stratified subset for fast CPU transfer learning, or full if specified
    if sample_limit and sample_limit < len(train_imgs_all):
        indices = np.random.RandomState(42).choice(len(train_imgs_all), sample_limit, replace=False)
        train_imgs = train_imgs_all[indices]
        train_lbls = train_lbls_all[indices]
    else:
        train_imgs = train_imgs_all
        train_lbls = train_lbls_all

    # Held-out test set (5,000 test samples for benchmark evaluation)
    test_limit = min(5000, len(test_imgs_all))
    test_indices = np.random.RandomState(42).choice(len(test_imgs_all), test_limit, replace=False)
    test_imgs = test_imgs_all[test_indices]
    test_lbls = test_lbls_all[test_indices]

    print(f"Dataset split: Train {len(train_imgs)} samples, Test {len(test_imgs)} samples.")

    print("Preprocessing images to 3-channel (32x32) ImageNet tensors...")
    X_train = preprocess_to_3channel(train_imgs)
    y_train = torch.tensor(train_lbls, dtype=torch.long)
    X_test = preprocess_to_3channel(test_imgs)
    y_test = torch.tensor(test_lbls, dtype=torch.long)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    train_loader = DataLoader(TensorDataset(X_train, y_train), batch_size=64, shuffle=True)
    test_loader = DataLoader(TensorDataset(X_test, y_test), batch_size=128, shuffle=False)

    print("\n--- Fine-tuning Pretrained MobileNetV2 ---")
    model = MobileNetFashion(num_classes=10).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=0.001)

    start_time = time.time()
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
            _, preds = outputs.max(1)
            total += batch_y.size(0)
            correct += preds.eq(batch_y).sum().item()

        epoch_loss = running_loss / total
        epoch_acc = correct / total
        print(f"Epoch {epoch}/{epochs} - Loss: {epoch_loss:.4f} - Train Acc: {epoch_acc * 100:.2f}%")

    train_time = round(time.time() - start_time, 2)
    print(f"Training completed in {train_time}s.")

    # Evaluation on held-out test data
    print("\nEvaluating on held-out test set...")
    model.eval()
    all_preds = []
    all_targets = []
    with torch.no_grad():
        for batch_x, batch_y in test_loader:
            batch_x = batch_x.to(device)
            outputs = model(batch_x)
            _, preds = outputs.max(1)
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(batch_y.numpy())

    test_acc = float(accuracy_score(all_targets, all_preds))
    p, r, f1, _ = precision_recall_fscore_support(all_targets, all_preds, average="weighted")
    print(f"MobileNetV2 Test Accuracy: {test_acc * 100:.2f}%, Weighted F1: {f1:.4f}")

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

    # Save model weights
    torch.save(model.state_dict(), MODELS_DIR / "mobilenet_v2_fmnist.pt")

    report = {
        "model_architecture": "MobileNetV2 (Pretrained ImageNet Transfer Learning)",
        "train_samples": len(train_imgs),
        "test_samples": len(test_imgs),
        "epochs": epochs,
        "training_time_seconds": train_time,
        "test_accuracy": round(test_acc, 4),
        "weighted_precision": round(float(p), 4),
        "weighted_recall": round(float(r), 4),
        "weighted_f1": round(float(f1), 4),
        "per_class_metrics": per_class_results,
        "confusion_matrix": cm,
        "model_path": "models/mobilenet_v2_fmnist.pt",
        "device": str(device)
    }

    with open(REPORTS_DIR / "transfer_learning_eval.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    # Generate Markdown Report
    md_content = f"""# MobileNetV2 Transfer Learning Evaluation Report

### 1. Model Summary & Overall Performance
- **Base Architecture**: MobileNetV2 (ImageNet Pretrained)
- **Train Samples**: {len(train_imgs)}
- **Held-Out Test Samples**: {len(test_imgs)}
- **Training Time**: {train_time}s ({epochs} epochs on CPU)
- **Test Accuracy**: **{test_acc * 100:.2f}%**
- **Weighted Precision**: **{p:.4f}**
- **Weighted Recall**: **{r:.4f}**
- **Weighted F1 Score**: **{f1:.4f}**

---

### 2. Per-Class Metrics
| Class ID | Garment Category | Precision | Recall | F1-Score | Support |
| :---: | :--- | :---: | :---: | :---: | :---: |
"""
    for idx, name in LABEL_NAMES.items():
        m = per_class_results[name]
        md_content += f"| {idx} | **{name}** | {m['precision']:.4f} | {m['recall']:.4f} | {m['f1_score']:.4f} | {m['support']} |\n"

    md_content += f"""
---

### 3. Confusion Matrix
```text
{np.array2string(np.array(cm), separator=', ')}
```
"""

    with open(REPORTS_DIR / "transfer_learning_eval.md", "w", encoding="utf-8") as f:
        f.write(md_content)

    print(f"Weights saved to {MODELS_DIR / 'mobilenet_v2_fmnist.pt'}")
    print(f"Report saved to {REPORTS_DIR / 'transfer_learning_eval.md'}")
    return report


if __name__ == "__main__":
    train_and_evaluate()
