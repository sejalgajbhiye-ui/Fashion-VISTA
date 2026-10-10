# Fashion VISTA — AI/ML System & Backend Integration Guide

Fashion VISTA is an AI-powered personalized fashion decision assistant featuring virtual wardrobe management, color-theory-driven outfit recommendations, multi-task fashion attribute tagging, garment classification, transfer learning, and virtual try-on workflow readiness.

---

## 1. System Architecture Overview

```
                      +------------------------------------------+
                      |         Fashion VISTA Frontend           |
                      |   React + Vite + Tailwind CSS + Lucide   |
                      +--------------------+---------------------+
                                           |
                                  HTTP / JSON (REST)
                                           v
                      +------------------------------------------+
                      |           Flask Backend API              |
                      |          (backend/app.py :5000)          |
                      +----+-----------+-----------+----------+--+
                           |           |           |          |
          +----------------+   +-------+---+   +---+----+  +--+-------------+
          |                    |               |        |                   |
          v                    v               v        v                   v
+-------------------+ +------------------+ +--------+ +---------+ +-----------------+
| Garment Classifier| | Attribute Parser | | Color  | | Digital | | Virtual Try-On  |
|  (FashionCNN &    | | (Fashion Product | | Theory | | Wardrobe| |  (VITON-HD HD   |
|   MobileNetV2 TL) | |  TF-IDF + LogReg)| | Engine | | (SQLite)| | Hardware Check) |
+-------------------+ +------------------+ +--------+ +---------+ +-----------------+
          |                    |               |        |                   |
          +--------------------+-------+-------+--------+-------------------+
                                       |
                                       v
                      +----------------------------------+
                      |  Trained Models & SQLite Storage |
                      | - models/fmnist_cnn.pt           |
                      | - models/mobilenet_v2_fmnist.pt  |
                      | - models/product_attribute_*.joblib
                      | - backend/data/wardrobe.db       |
                      | - datasets/ (332k+ records)      |
                      +----------------------------------+
```

---

## 2. Prepared Datasets & Quality Profiling

All 4 datasets contain genuine data (no dummy/placeholder data) and are summarized in `datasets/dataset_summary.csv`. Detailed quality metrics can be found in `datasets/reports/dataset_quality_report.md`.

| Dataset | Records / Rows | Classes / Scope | File Location | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Fashion-MNIST** | 70,000 | 10 clothing classes (T-shirt, Trouser, Pullover, Dress, Coat, Sandal, Shirt, Sneaker, Bag, Ankle boot) | `datasets/fashion_mnist/csv/fashion_mnist_labels.csv` + 7,000 extracted PNGs | Garment image classification & transfer learning |
| **Fashion Product Images** | 44,446 | 7 attributes: masterCategory, subCategory, articleType, baseColour, season, year, usage | `datasets/fashion_product_images/csv/fashion_products.csv` | Multi-target metadata prediction & recommendation catalog |
| **DeepFashion** | 215,781 | 1,000 attributes across 50 categories | `datasets/deepfashion/csv/deepfashion_attributes.csv` | Category & fine-grained attribute grounding |
| **VITON-HD** | 2,032 pairs | Paired person-to-garment references | `datasets/viton_hd/csv/viton_hd_pairs.csv` | Virtual try-on pairing evaluation & test manifest |

---

## 3. Machine Learning Models & Evaluation Metrics

All models were evaluated on separate held-out test splits. Metrics and artifacts are documented below:

### Module A: Garment Image Classifier (Three-Tier Comparison)
We implemented and benchmarked three distinct model paradigms:

| Model Architecture | Paradigm | Held-Out Test Accuracy | Weighted F1 | Model Artifact |
| :--- | :--- | :---: | :---: | :--- |
| **Baseline SGD (Log-Loss)** | Classical Linear Model | 81.93% | 0.8220 | `models/fmnist_baseline.joblib` |
| **MobileNetV2 Transfer Learning** | Pretrained ImageNet Backbone + Custom Head | 79.80% | 0.7981 | `models/mobilenet_v2_fmnist.pt` |
| **Specialized FashionCNN** | Custom PyTorch 2-block Conv2D + BatchNorm + Dropout | **89.79%** | **0.8961** | `models/fmnist_cnn.pt` |

- **Evaluation Reports**:
  - `datasets/reports/classifier_eval.md`
  - `datasets/reports/transfer_learning_eval.md`

### Module B: Multi-Attribute Extraction Model
- **Algorithm**: TF-IDF Vectorizer (6,000 features, unigrams + bigrams) + multi-target Logistic Regression.
- **Dataset**: 44,446 fashion products (80% train / 20% test split).
- **Test Performance**:
  - `masterCategory`: **99.57% Accuracy** | **99.44% Weighted F1**
  - `subCategory`: **98.54% Accuracy** | **98.33% Weighted F1**
  - `usage` (Occasion): **93.97% Accuracy** | **93.63% Weighted F1**
  - `season`: **81.80% Accuracy** | **81.54% Weighted F1**
- **Artifacts**: `models/product_attribute_model.joblib`
- **Report**: `datasets/reports/attributes_eval.md`

### Module C: Color-Theory & Occasion-Aware Outfit Recommender
- **Engine**: Rule-governed recommendation engine (`ml/utils/color_theory.py` & `ml/inference/recommender_engine.py`).
- **Rules Enforced**:
  1. **Slot Completeness**: Always provides Top + Bottom + Footwear (+ optional Accessory/Layer).
  2. **No Duplication**: Zero duplicate slots per outfit (e.g., never two tops or two shoes).
  3. **Occasion & Season Filter**: Matches selected usage (`Casual`, `Formal`, `Party`, `Sports`, `Ethnic`).
  4. **Color Harmony Scoring**: Uses Color Wheel geometry (monochromatic, complementary, analogous, triad, neutral grounding).
- **Evaluation (120 test query benchmark across all genders & occasions)**:
  - **Slot Completeness**: **100.0%**
  - **Slot Duplication Rate**: **0.0%**
  - **Mean Color Harmony Score**: **93.61 / 100**
  - **Mean Overall Compatibility**: **92.73 / 100**
- **Report**: `datasets/reports/recommender_eval.md`

### Module D: Digital Wardrobe & Persistence (Functionality 1)
- **Database**: SQLite database stored at `backend/data/wardrobe.db` via `backend/database.py`.
- **Uploaded Media**: User garment photos are stored in `backend/uploads/` and served via static route.
- **Persistence Guarantee**: Garments remain saved across page refreshes and server restarts.

### Module E: Virtual Try-On Pipeline Status
- **Engine**: `backend/services/tryon_service.py`
- Transparent hardware verification checking CUDA GPU availability and VRAM threshold ($\ge 12\text{ GB}$). Returns honest diagnostics without synthetic simulations.

---

## 4. Flask Backend REST API Reference

Base URL: `http://localhost:5000`

### Functionality 1: Wardrobe & Clothing Recognition Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/wardrobe/classify` | Classifies garment photo, validates image format/integrity, returns predicted category, mapped wardrobe category (`Tops`, `Bottoms`, `Dresses`, `Shoes`, `Accessories`, `Outerwear`), confidence score, and persistent image URL |
| `GET` | `/api/wardrobe/items` | Retrieves all saved wardrobe items from SQLite database |
| `POST` | `/api/wardrobe/items` | Creates a new wardrobe item in SQLite database with image upload support |
| `PUT` | `/api/wardrobe/items/<id>` | Updates an existing wardrobe item's metadata |
| `DELETE` | `/api/wardrobe/items/<id>` | Deletes a wardrobe item from SQLite database |
| `GET` | `/api/wardrobe/uploads/<filename>` | Statically serves saved user garment images |

#### Example Request: `POST /api/wardrobe/classify`
Upload multipart form data with `image` file:
```bash
curl -X POST -F "image=@shirt.jpg" http://localhost:5000/api/wardrobe/classify
```
Response:
```json
{
  "status": "success",
  "predicted_category": "T-shirt/top",
  "mapped_category": "Tops",
  "confidence": 0.942,
  "confidence_pct": 94.2,
  "model_used": "FashionCNN (PyTorch)",
  "top_candidates": [
    {"category": "T-shirt/top", "mapped_category": "Tops", "probability": 0.942},
    {"category": "Shirt", "mapped_category": "Tops", "probability": 0.041},
    {"category": "Pullover", "mapped_category": "Tops", "probability": 0.012}
  ],
  "image_url": "/api/wardrobe/uploads/garment_abc123.jpg"
}
```

### General AI & Stylist Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health & service ping |
| `GET` | `/api/ml/status` | Model registry & hardware diagnostics |
| `POST` | `/api/ml/attributes` | Predicts category, subcategory, occasion, and season from title |
| `POST` | `/api/ml/recommend` | Generates color-harmonized, slot-complete outfits |
| `POST` | `/api/ml/wardrobe-match` | Computes wardrobe coverage against an outfit bundle |
| `POST` | `/api/ml/try-on` | Virtual try-on pipeline verification |

---

## 5. Frontend Integration (Functionality 1)

The React frontend has been enhanced to seamlessly integrate with Functionality 1:

1. **`src/services/api.js`**:
   - `classifyWardrobeGarment(imageSource)`
   - `fetchWardrobeItems()`
   - `createWardrobeItem(itemData)`
   - `updateWardrobeItemAPI(id, fields)`
   - `deleteWardrobeItemAPI(id)`
2. **`src/pages/Wardrobe.jsx`**:
   - **File Upload & Instant AI Detection**: Users select an image file or choose a preset.
   - **Visual Feedback**: Animated spinner shows during inference; an AI card displays the detected garment category and confidence percentage.
   - **Manual Correction**: Automatically selects the mapped category in the dropdown, allowing full manual correction.
   - **Persistence**: Clicking "Add to Wardrobe" saves the item to the SQLite backend and local state. Items remain intact after page reload.
   - **Deletion**: Clicking "Delete" permanently removes the item from the SQLite database.
3. **`src/context/FashionContext.jsx`**:
   - Syncs with `GET /api/wardrobe/items` on mount.
   - Provides optimistic UI updates with backend synchronization and fallback to localStorage.

---

## 6. How to Run & Verify

### Step 1: Install Python ML Dependencies
```powershell
pip install -r requirements-ml.txt
```

### Step 2: Run Automated Unit & Integration Tests (23 Passing Tests)
```powershell
python -m pytest tests/
```
Expected Output:
```
============================= 23 passed in ~11s =============================
```

### Step 3: Start the Flask ML Backend
```powershell
python backend/app.py
```
*(Runs on `http://127.0.0.1:5000`)*

### Step 4: Start the React Frontend
In a second terminal window:
```powershell
npm run dev
```
*(Runs on `http://localhost:5173`)*

---

## 7. Retraining Models (Optional)

1. **Retrain FashionCNN & Baseline Classifier**:
   ```powershell
   python ml/training/train_classifier.py
   ```
2. **Retrain MobileNetV2 Transfer Learning Model**:
   ```powershell
   python ml/training/train_transfer_learning.py
   ```
3. **Retrain Multi-Attribute Classifier**:
   ```powershell
   python ml/training/train_attributes.py
   ```
4. **Re-evaluate Outfit Recommender**:
   ```powershell
   python ml/evaluation/evaluate_recommender.py
   ```
