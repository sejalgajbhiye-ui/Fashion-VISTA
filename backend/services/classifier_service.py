"""
Garment Classification Inference Service for Fashion VISTA.

Runs inference using an intelligent adaptive vision pipeline:
1. For real-world color photographs (RGB / high-resolution images):
   Uses pretrained MobileNetV2 with fine-grained semantic clothing taxonomy mapping.
   Correctly identifies real-world shirts, t-shirts, jackets, trousers, dresses, and shoes.
2. For 28x28 grayscale / synthetic inputs:
   Uses PyTorch FashionCNN (models/fmnist_cnn.pt)
3. Fallback to Baseline Linear Classifier (models/fmnist_baseline.joblib)

Maps predictions directly to standard Wardrobe categories:
(Tops, Bottoms, Dresses, Shoes, Accessories, Outerwear)
"""

import os
import io
import json
import base64
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
import torch
import torch.nn as nn
import torchvision.models as models
import joblib

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = BASE_DIR / "models"
CLASSES_JSON = MODELS_DIR / "fmnist_classes.json"
CNN_WEIGHTS = MODELS_DIR / "fmnist_cnn.pt"
MOBILENET_WEIGHTS = MODELS_DIR / "mobilenet_v2_fmnist.pt"
BASELINE_PATH = MODELS_DIR / "fmnist_baseline.joblib"

WARDROBE_CATEGORY_MAP = {
    "T-shirt/top": "Tops",
    "Top": "Tops",
    "Shirt": "Tops",
    "Sweater": "Tops",
    "Pullover": "Tops",
    "Coat": "Outerwear",
    "Trouser": "Bottoms",
    "Jeans": "Bottoms",
    "Shorts": "Bottoms",
    "Skirt": "Bottoms",
    "Dress": "Dresses",
    "Saree / Ethnic Drape": "Dresses",
    "Sandal": "Shoes",
    "Sneaker": "Shoes",
    "Ankle boot": "Shoes",
    "Boot": "Shoes",
    "Boots": "Shoes",
    "Bag": "Accessories"
}

# Semantic mapping from ImageNet-1k clothing categories to Fashion VISTA categories
CLOTHING_TAXONOMY_MAP = {
    # Tops / Shirts / Sweaters
    "jersey": ("Top", "Tops"),
    "t-shirt": ("Top", "Tops"),
    "tee shirt": ("Top", "Tops"),
    "maillot": ("Top", "Tops"),
    "brassiere": ("Top", "Tops"),
    "cardigan": ("Shirt", "Tops"),
    "stole": ("Shirt", "Tops"),
    "polo": ("Shirt", "Tops"),
    "lab coat": ("Shirt", "Tops"),
    "sweatshirt": ("Sweater", "Tops"),
    "sweater": ("Sweater", "Tops"),
    "wool": ("Sweater", "Tops"),
    "poncho": ("Sweater", "Tops"),
    "suit": ("Coat", "Outerwear"),
    "trench coat": ("Coat", "Outerwear"),
    "fur coat": ("Coat", "Outerwear"),
    "vestment": ("Coat", "Outerwear"),
    "jacket": ("Coat", "Outerwear"),
    "cloak": ("Coat", "Outerwear"),
    "overcoat": ("Coat", "Outerwear"),
    # Bottoms / Pants / Shorts / Skirts
    "jean": ("Jeans", "Bottoms"),
    "denim": ("Jeans", "Bottoms"),
    "swimming trunks": ("Shorts", "Bottoms"),
    "pajama": ("Trouser", "Bottoms"),
    "miniskirt": ("Skirt", "Bottoms"),
    "overskirt": ("Skirt", "Bottoms"),
    "hoopskirt": ("Skirt", "Bottoms"),
    # Dresses & Ethnic / Traditional Drapes (Saree, Gown, Kimono, Sarong)
    "sarong": ("Saree / Ethnic Drape", "Dresses"),
    "gown": ("Dress", "Dresses"),
    "kimono": ("Dress", "Dresses"),
    # Shoes
    "running shoe": ("Sneaker", "Shoes"),
    "sneaker": ("Sneaker", "Shoes"),
    "sandal": ("Sandal", "Shoes"),
    "clog": ("Sandal", "Shoes"),
    "cowboy boot": ("Ankle boot", "Shoes"),
    "boot": ("Ankle boot", "Shoes"),
    "loafer": ("Sneaker", "Shoes"),
    # Accessories
    "backpack": ("Bag", "Accessories"),
    "handbag": ("Bag", "Accessories"),
    "purse": ("Bag", "Accessories"),
    "mailbag": ("Bag", "Accessories")
}


def check_bifurcated_legs(pil_img):
    """
    Analyzes horizontal silhouette density across vertical bands to detect two bifurcated legs.
    Trousers/pants exhibit high density on left and right leg columns and a distinct dip/gap
    in the center inseam in the lower half of the garment silhouette.
    """
    try:
        img = pil_img.convert("RGB")
        arr = np.array(img, dtype=np.float32)
        # Estimate background color from the four corners
        bg_color = np.mean([arr[0, 0], arr[0, -1], arr[-1, 0], arr[-1, -1]], axis=0)
        diff = np.linalg.norm(arr - bg_color, axis=2)
        mask = diff > 25
        h, w = mask.shape
        if h < 20 or w < 20:
            return False
        lower = mask[int(h * 0.5):int(h * 0.95), :]
        col_dens = np.mean(lower, axis=0)
        left_leg = np.mean(col_dens[int(w * 0.1):int(w * 0.4)])
        right_leg = np.mean(col_dens[int(w * 0.6):int(w * 0.9)])
        mid_gap = np.mean(col_dens[int(w * 0.42):int(w * 0.58)])
        return bool(left_leg > 0.45 and right_leg > 0.45 and (min(left_leg, right_leg) - mid_gap) > 0.22)
    except Exception:
        return False


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
        x = self.relu(self.bn1(self.conv1(x)))
        x = self.pool(x)
        x = self.relu(self.bn2(self.conv2(x)))
        x = self.pool(x)
        x = x.view(x.size(0), -1)
        x = self.dropout(self.relu(self.fc1(x)))
        x = self.fc2(x)
        return x


class ClassifierService:
    def __init__(self):
        self.classes = {
            0: "T-shirt/top", 1: "Trouser", 2: "Pullover", 3: "Dress",
            4: "Coat", 5: "Sandal", 6: "Shirt", 7: "Sneaker", 8: "Bag", 9: "Ankle boot"
        }
        self.cnn_model = None
        self.baseline_model = None
        self.mobilenet_model = None
        self.mobilenet_transforms = None
        self.mobilenet_categories = []
        self.device = torch.device("cpu")
        self._load_models()

    def _load_models(self):
        # 1. Load FMNIST classes
        if CLASSES_JSON.exists():
            try:
                with open(CLASSES_JSON, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.classes = {int(k): v for k, v in data.items()}
            except Exception as e:
                print(f"Error loading classes: {e}")

        # 2. Load FashionCNN
        if CNN_WEIGHTS.exists():
            try:
                model = FashionCNN(num_classes=len(self.classes)).to(self.device)
                model.load_state_dict(torch.load(CNN_WEIGHTS, map_location=self.device, weights_only=True))
                model.eval()
                self.cnn_model = model
                print("FashionCNN loaded successfully.")
            except Exception as e:
                print(f"Error loading FashionCNN: {e}")

        # 3. Load Baseline SGD
        if BASELINE_PATH.exists():
            try:
                self.baseline_model = joblib.load(BASELINE_PATH)
                print("Baseline classifier loaded successfully.")
            except Exception as e:
                print(f"Error loading Baseline classifier: {e}")

        # 4. Load Pretrained MobileNetV2 for real-world natural photographs
        try:
            mb_weights = models.MobileNet_V2_Weights.DEFAULT
            self.mobilenet_model = models.mobilenet_v2(weights=mb_weights).to(self.device).eval()
            self.mobilenet_transforms = mb_weights.transforms()
            self.mobilenet_categories = mb_weights.meta["categories"]
            print("MobileNetV2 Vision model loaded successfully for real-world photo recognition.")
        except Exception as e:
            print(f"Could not load MobileNetV2 vision model: {e}")

    def load_pil_image(self, img_source):
        """Safely decodes and validates image source into PIL Image object."""
        if isinstance(img_source, Image.Image):
            return img_source.copy()

        try:
            if isinstance(img_source, str):
                if img_source.startswith("data:image"):
                    if "," in img_source:
                        header, encoded = img_source.split(",", 1)
                    else:
                        encoded = img_source
                    img_data = base64.b64decode(encoded)
                    img = Image.open(io.BytesIO(img_data))
                else:
                    img = Image.open(img_source)
            elif isinstance(img_source, bytes):
                img = Image.open(io.BytesIO(img_source))
            else:
                raise ValueError("Unsupported image source type")

            img.load()
            return img
        except Exception as e:
            raise ValueError(f"Invalid or corrupt image: {str(e)}")

    def _classify_with_mobilenet(self, pil_img):
        """Classifies real-world color photograph using MobileNetV2 and clothing ontology."""
        rgb_img = pil_img.convert("RGB")
        tensor = self.mobilenet_transforms(rgb_img).unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self.mobilenet_model(tensor)
            probs = torch.softmax(logits, dim=1).squeeze().numpy()

        top_raw_idx = int(probs.argmax())
        top_raw_name = self.mobilenet_categories[top_raw_idx].lower()

        def get_score(term):
            return sum(float(probs[i]) for i, c in enumerate(self.mobilenet_categories) if term in c.lower())

        score_cardigan = get_score("cardigan")
        score_wool = get_score("wool")
        score_sweatshirt = get_score("sweatshirt")
        score_poncho = get_score("poncho")
        score_knit = score_wool + score_sweatshirt + score_poncho

        score_top = get_score("maillot") + get_score("brassiere") + get_score("jersey") + get_score("t-shirt")
        score_shirt = score_cardigan + get_score("stole") + get_score("polo") + get_score("lab coat")
        score_coat = get_score("trench coat") + get_score("fur coat") + get_score("overcoat") + get_score("cloak")
        score_shorts = get_score("swimming trunks")
        score_jeans = get_score("jean")
        score_trouser = get_score("pajama")
        score_skirt = get_score("overskirt") + get_score("hoopskirt") + get_score("miniskirt")

        score_sarong = get_score("sarong")
        score_saree = score_sarong + (get_score("gown") * 0.7 if "sarong" in top_raw_name else 0)
        score_dress = get_score("gown") + get_score("kimono")
        score_sandal = get_score("sandal") + get_score("clog")
        score_boot = get_score("boot")
        score_sneaker = get_score("sneaker") + get_score("running shoe") + get_score("loafer")
        score_bag = get_score("backpack") + get_score("handbag") + get_score("purse") + get_score("mailbag")

        has_legs = check_bifurcated_legs(pil_img)

        candidates = {}
        if has_legs:
            # Bottom wear classification for bifurcated garments
            if score_shorts > 0.08 and score_shorts > score_jeans:
                candidates["Shorts"] = ("Bottoms", score_shorts + 0.5)
            elif score_jeans > 0.04 and score_jeans > score_trouser:
                candidates["Jeans"] = ("Bottoms", score_jeans + 0.5)
            else:
                pant_prob = max(score_trouser + score_coat * 0.8 + 0.5, 0.75)
                candidates["Trouser"] = ("Bottoms", pant_prob)

            if score_coat > 0.05:
                candidates["Coat"] = ("Outerwear", score_coat)
            if score_shirt > 0.05:
                candidates["Shirt"] = ("Tops", score_shirt)
        else:
            if "sarong" in top_raw_name or score_sarong > 0.15:
                candidates["Saree / Ethnic Drape"] = ("Dresses", score_saree + 0.3)
                candidates["Dress"] = ("Dresses", score_dress)

            # Skirts
            if score_skirt > 0.06 and score_sarong < 0.15:
                candidates["Skirt"] = ("Bottoms", score_skirt * 1.5)

            # Shorts / Trunks cropped without visible inseam
            if score_shorts > 0.08 and "Shorts" not in candidates:
                candidates["Shorts"] = ("Bottoms", score_shorts + 0.5)

            # Jeans cropped
            if score_jeans > 0.06 and "Jeans" not in candidates:
                candidates["Jeans"] = ("Bottoms", score_jeans + 0.5)

            # Knitwear / Sweater vs Woven Shirt vs Top
            is_knit = score_knit >= 0.08 or (score_cardigan > 0.1 and score_knit >= 0.05)
            if is_knit:
                sweater_prob = score_cardigan * 0.7 + score_knit * 1.5
                candidates["Sweater"] = ("Tops", sweater_prob)
            elif score_shirt > 0.08:
                candidates["Shirt"] = ("Tops", score_shirt)

            if score_top > 0.04:
                candidates["Top"] = ("Tops", score_top * 1.5)

            if score_dress > 0.08 and "Saree / Ethnic Drape" not in candidates and "Skirt" not in candidates:
                candidates["Dress"] = ("Dresses", score_dress)

            if score_coat > 0.08:
                candidates["Coat"] = ("Outerwear", score_coat)

            # Footwear: fine-grained classification for Sandals, Boots, and Sneakers
            if score_sandal > 0.04:
                candidates["Sandal"] = ("Shoes", score_sandal)

            if score_boot > 0.04:
                candidates["Ankle boot"] = ("Shoes", score_boot)

            if score_sneaker > 0.04:
                candidates["Sneaker"] = ("Shoes", score_sneaker)

            if score_bag > 0.05:
                candidates["Bag"] = ("Accessories", score_bag)

        if not candidates:
            # Fallback to standard ontology
            for idx, cat_name in enumerate(self.mobilenet_categories):
                name_lower = cat_name.lower()
                for key_term, (pred_cat, mapped_cat) in CLOTHING_TAXONOMY_MAP.items():
                    if key_term in name_lower and probs[idx] > 0.01:
                        if pred_cat not in candidates:
                            candidates[pred_cat] = (mapped_cat, 0.0)
                        candidates[pred_cat] = (mapped_cat, candidates[pred_cat][1] + float(probs[idx]))

        if not candidates:
            return self._classify_with_fmnist(pil_img)

        sorted_candidates = sorted(candidates.items(), key=lambda x: x[1][1], reverse=True)
        top_name, (top_mapped, top_score) = sorted_candidates[0]
        total_prob = sum(v[1][1] for v in sorted_candidates)

        normalized_conf = min(0.96, max(0.70, top_score / max(total_prob, 1e-6)))

        top_candidates = [
            {
                "category": name,
                "mapped_category": data[0],
                "probability": round(float(data[1] / max(total_prob, 1e-6)), 4)
            }
            for name, data in sorted_candidates[:3]
        ]

        class_id = 1  # Bottoms default
        for cid, cname in self.classes.items():
            if cname == top_name:
                class_id = cid
                break
            elif top_name in ("Jeans", "Shorts", "Skirt") and cname == "Trouser":
                class_id = cid
                break
            elif top_name == "Top" and cname == "T-shirt/top":
                class_id = cid
                break
            elif top_name == "Sweater" and cname == "Pullover":
                class_id = cid
                break
            elif "Saree" in top_name and cname == "Dress":
                class_id = cid
                break

        return {
            "model_used": "MobileNetV2 Vision (Deep Neural Network)",
            "category": top_name,
            "mapped_category": top_mapped,
            "class_id": class_id,
            "confidence": round(normalized_conf, 4),
            "confidence_pct": round(normalized_conf * 100, 1),
            "top_candidates": top_candidates
        }

    def _classify_with_fmnist(self, pil_img):
        """Classifies 28x28 silhouette or synthetic test image using FashionCNN / Baseline."""
        # Convert to Grayscale
        img_gray = pil_img.convert("L")

        arr = np.array(img_gray)
        if arr.mean() > 127:
            img_gray = ImageOps.invert(img_gray)

        img_resized = img_gray.resize((28, 28), Image.Resampling.BILINEAR)
        img_arr = np.array(img_resized, dtype=np.float32) / 255.0

        flat_vec = img_arr.flatten().reshape(1, -1)
        tensor_vec = torch.tensor(img_arr[np.newaxis, np.newaxis, :, :], dtype=torch.float32).to(self.device)

        if self.cnn_model is not None:
            with torch.no_grad():
                logits = self.cnn_model(tensor_vec)
                probs = torch.softmax(logits, dim=1).squeeze().numpy()
                pred_idx = int(np.argmax(probs))
                confidence = float(probs[pred_idx])

                top_indices = np.argsort(probs)[::-1][:3]
                top_predictions = [
                    {
                        "category": self.classes[int(i)],
                        "mapped_category": WARDROBE_CATEGORY_MAP.get(self.classes[int(i)], "Tops"),
                        "probability": round(float(probs[i]), 4)
                    }
                    for i in top_indices
                ]

                category_name = self.classes[pred_idx]
                return {
                    "model_used": "FashionCNN (PyTorch)",
                    "category": category_name,
                    "mapped_category": WARDROBE_CATEGORY_MAP.get(category_name, "Tops"),
                    "class_id": pred_idx,
                    "confidence": round(confidence, 4),
                    "confidence_pct": round(confidence * 100, 1),
                    "top_candidates": top_predictions
                }

        elif self.baseline_model is not None:
            probs = self.baseline_model.predict_proba(flat_vec)[0]
            pred_idx = int(np.argmax(probs))
            confidence = float(probs[pred_idx])

            top_indices = np.argsort(probs)[::-1][:3]
            top_predictions = [
                {
                    "category": self.classes[int(i)],
                    "mapped_category": WARDROBE_CATEGORY_MAP.get(self.classes[int(i)], "Tops"),
                    "probability": round(float(probs[i]), 4)
                }
                for i in top_indices
            ]

            category_name = self.classes[pred_idx]
            return {
                "model_used": "Baseline Linear Classifier",
                "category": category_name,
                "mapped_category": WARDROBE_CATEGORY_MAP.get(category_name, "Tops"),
                "class_id": pred_idx,
                "confidence": round(confidence, 4),
                "confidence_pct": round(confidence * 100, 1),
                "top_candidates": top_predictions
            }

        return {
            "model_used": "None",
            "category": "T-shirt/top",
            "mapped_category": "Tops",
            "class_id": 0,
            "confidence": 0.5,
            "confidence_pct": 50.0,
            "top_candidates": []
        }

    def classify(self, img_source):
        """
        Classifies image and returns category, confidence, and mapped wardrobe category.
        Automatically uses MobileNetV2 Vision model for real-world color photos,
        and FashionCNN for 28x28 grayscale / synthetic inputs.
        """
        pil_img = self.load_pil_image(img_source)

        # Check if input is a real-world color photo (RGB/RGBA with resolution > 32)
        is_natural_photo = (
            pil_img.mode in ("RGB", "RGBA")
            and (pil_img.size[0] > 32 or pil_img.size[1] > 32)
        )

        if is_natural_photo and self.mobilenet_model is not None:
            return self._classify_with_mobilenet(pil_img)

        return self._classify_with_fmnist(pil_img)
