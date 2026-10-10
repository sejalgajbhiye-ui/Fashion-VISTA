"""
Comprehensive Test Suite for Fashion VISTA AI/ML Pipeline & Backend.

Tests:
1. Dataset files & schema integrity
2. Model loading & inference accuracy
3. Outfit recommendation & color harmony rules
4. Wardrobe matching & missing item coverage
5. Flask REST API endpoints & error handlers
"""

import os
import sys
import json
import io
import base64
import pytest
from pathlib import Path
from PIL import Image
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.app import create_app
from backend.services.classifier_service import ClassifierService
from ml.inference.recommender_engine import OutfitRecommender
from backend.services.wardrobe_service import match_outfit_against_wardrobe
from backend.services.tryon_service import get_vto_system_status


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


# ============================================================================
# 1. DATASET INTEGRITY TESTS
# ============================================================================
def test_dataset_files_exist():
    datasets_dir = BASE_DIR / "datasets"
    assert (datasets_dir / "fashion_mnist" / "csv" / "fashion_mnist_labels.csv").exists()
    assert (datasets_dir / "fashion_product_images" / "csv" / "fashion_products.csv").exists()
    assert (datasets_dir / "deepfashion" / "csv" / "deepfashion_attributes.csv").exists()
    assert (datasets_dir / "viton_hd" / "csv" / "viton_hd_pairs.csv").exists()
    assert (datasets_dir / "dataset_summary.csv").exists()


def test_dataset_summary_metrics():
    summary_csv = BASE_DIR / "datasets" / "dataset_summary.csv"
    with open(summary_csv, "r", encoding="utf-8") as f:
        content = f.read()
    assert "Fashion-MNIST" in content
    assert "70000" in content
    assert "DeepFashion" in content
    assert "215781" in content
    assert "44446" in content
    assert "2032" in content


# ============================================================================
# 2. MODEL INFERENCE TESTS
# ============================================================================
def test_clothing_classifier():
    svc = ClassifierService()
    assert len(svc.classes) == 10

    # Test with synthetic 28x28 grayscale image
    test_img = Image.new("L", (28, 28), color=255)
    res = svc.classify(test_img)

    assert "category" in res
    assert "confidence" in res
    assert res["category"] in svc.classes.values()
    assert 0.0 <= res["confidence"] <= 1.0
    assert len(res["top_candidates"]) > 0


def test_recommender_rules():
    rec_engine = OutfitRecommender()
    prefs = {"occasion": "College", "colour": "Black", "style": "Casual", "season": "Summer"}
    outfit = rec_engine.recommend_outfit(prefs)

    assert "items" in outfit
    items = outfit["items"]
    assert len(items) >= 3

    slots = [i["slot"] for i in items]
    assert "Top" in slots
    assert "Bottom" in slots
    assert "Shoes" in slots

    # Verify no duplicate slots among main items
    assert slots.count("Top") == 1
    assert slots.count("Bottom") == 1
    assert slots.count("Shoes") == 1
    assert outfit["compatibility_score"] > 80
    assert "explanation" in outfit


def test_wardrobe_matching():
    outfit_items = [
        {"name": "Black T-shirt", "slot": "Top", "colour": "Black"},
        {"name": "Blue Jeans", "slot": "Bottom", "colour": "Blue"},
        {"name": "White Sneakers", "slot": "Shoes", "colour": "White"},
        {"name": "Brown Leather Jacket", "slot": "Layer", "colour": "Brown"}
    ]
    user_wardrobe = [
        {"id": 1, "name": "Black Oversized Top", "category": "Tops", "colour": "Black", "owned": True},
        {"id": 2, "name": "Blue Denim Pants", "category": "Bottoms", "colour": "Blue", "owned": True},
        {"id": 3, "name": "White Canvas Shoes", "category": "Shoes", "colour": "White", "owned": True}
    ]

    res = match_outfit_against_wardrobe(outfit_items, user_wardrobe)
    assert res["matched_count"] == 3
    assert res["required_count"] == 4
    assert res["wardrobe_coverage"] == 0.75
    assert "Brown Leather Jacket" in res["missing_items"]
    assert len(res["matches"]) == 3


def test_virtual_try_on_readiness():
    vto = get_vto_system_status()
    assert "capability" in vto
    assert "is_ready" in vto
    assert vto["manifest_available"] is True
    assert vto["verified_pairs_count"] == 2032
    assert "message" in vto


# ============================================================================
# 3. BACKEND FLASK REST API TESTS
# ============================================================================
def test_api_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "ok"
    assert "version" in data


def test_api_ml_status(client):
    response = client.get("/api/ml/status")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "online"
    assert "registry" in data
    assert "virtual_try_on" in data


def test_api_classify_valid(client):
    # Create test image in memory
    img = Image.new("L", (28, 28), color=100)
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="PNG")
    img_byte_arr.seek(0)

    data = {
        "image": (img_byte_arr, "test.png")
    }
    response = client.post("/api/ml/classify", content_type="multipart/form-data", data=data)
    assert response.status_code == 200
    res_data = response.get_json()
    assert res_data["status"] == "success"
    assert "prediction" in res_data
    assert "category" in res_data["prediction"]


def test_api_classify_missing_input(client):
    response = client.post("/api/ml/classify", json={})
    assert response.status_code == 400
    data = response.get_json()
    assert data["status"] == "error"


def test_api_attributes(client):
    payload = {"product_name": "Puma Men Grey Casual T-shirt"}
    response = client.post("/api/ml/attributes", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert "predicted_attributes" in data
    assert "category" in data["predicted_attributes"]
    assert "subcategory" in data["predicted_attributes"]


def test_api_recommend(client):
    payload = {
        "preferences": {
            "occasion": "Office",
            "colour": "White",
            "style": "Formal",
            "season": "Summer"
        },
        "wardrobe": [
            {"id": 101, "name": "White Formal Shirt", "category": "Tops", "colour": "White", "owned": True}
        ]
    }
    response = client.post("/api/ml/recommend", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert "recommendation" in data
    assert "items" in data["recommendation"]
    assert len(data["recommendation"]["items"]) >= 3


def test_api_wardrobe_match(client):
    payload = {
        "outfit_items": [
            {"name": "Black Tee", "slot": "Top", "colour": "Black"},
            {"name": "Blue Jeans", "slot": "Bottom", "colour": "Blue"}
        ],
        "wardrobe": [
            {"id": 1, "name": "Black Tee", "category": "Tops", "colour": "Black", "owned": True}
        ]
    }
    response = client.post("/api/ml/wardrobe-match", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert data["result"]["matched_count"] == 1
    assert data["result"]["required_count"] == 2
    assert data["result"]["wardrobe_coverage"] == 0.5


def test_api_try_on(client):
    response = client.post("/api/ml/try-on", json={"sample_id": "viton_000001"})
    assert response.status_code == 200
    data = response.get_json()
    assert "status" in data
    assert "details" in data


def test_api_404_handling(client):
    response = client.get("/api/unknown_endpoint")
    assert response.status_code == 404
    data = response.get_json()
    assert data["status"] == "error"


# ============================================================================
# 4. FUNCTIONALITY 1: AI CLOTHING RECOGNITION & WARDROBE CRUD TESTS
# ============================================================================
def test_wardrobe_classify_valid_file(client):
    img = Image.new("RGB", (64, 64), color=(200, 100, 50))
    byte_arr = io.BytesIO()
    img.save(byte_arr, format="JPEG")
    byte_arr.seek(0)

    data = {"image": (byte_arr, "shirt.jpg")}
    response = client.post("/api/wardrobe/classify", content_type="multipart/form-data", data=data)
    assert response.status_code == 200
    res = response.get_json()
    assert res["status"] == "success"
    assert "predicted_category" in res
    assert "mapped_category" in res
    assert "confidence" in res
    assert "confidence_pct" in res
    assert "image_url" in res
    assert res["image_url"].startswith("/api/wardrobe/uploads/")
    assert len(res["top_candidates"]) > 0


def test_wardrobe_classify_valid_base64(client):
    img = Image.new("L", (28, 28), color=180)
    byte_arr = io.BytesIO()
    img.save(byte_arr, format="PNG")
    b64_str = "data:image/png;base64," + base64.b64encode(byte_arr.getvalue()).decode("utf-8")

    response = client.post("/api/wardrobe/classify", json={"image_base64": b64_str})
    assert response.status_code == 200
    res = response.get_json()
    assert res["status"] == "success"
    assert "predicted_category" in res
    assert "mapped_category" in res


def test_wardrobe_classify_invalid_extension(client):
    byte_arr = io.BytesIO(b"Hello text file")
    data = {"image": (byte_arr, "document.txt")}
    response = client.post("/api/wardrobe/classify", content_type="multipart/form-data", data=data)
    assert response.status_code == 400
    res = response.get_json()
    assert res["status"] == "error"
    assert "Invalid file type" in res["error"]


def test_wardrobe_classify_corrupted_image(client):
    byte_arr = io.BytesIO(b"Not an actual image binary payload")
    data = {"image": (byte_arr, "corrupted.png")}
    response = client.post("/api/wardrobe/classify", content_type="multipart/form-data", data=data)
    assert response.status_code == 400
    res = response.get_json()
    assert res["status"] == "error"
    assert "Corrupted or invalid image" in res["error"]


def test_wardrobe_classify_empty_payload(client):
    response = client.post("/api/wardrobe/classify", json={})
    assert response.status_code == 400
    res = response.get_json()
    assert res["status"] == "error"


def test_wardrobe_items_crud_sqlite(client):
    # 1. GET all items (should have seed items)
    get_res = client.get("/api/wardrobe/items")
    assert get_res.status_code == 200
    get_data = get_res.get_json()
    assert get_data["status"] == "success"
    assert isinstance(get_data["items"], list)
    initial_count = len(get_data["items"])
    assert initial_count >= 1

    # 2. POST create new item
    new_item = {
        "name": "Emerald Silk Midi Dress",
        "category": "Dresses",
        "colour": "Emerald",
        "style": "Party",
        "season": "Summer",
        "brand": "Mango",
        "description": "Silk dress for evening parties",
        "predicted_category": "Dress",
        "confidence": 0.94,
        "model_used": "FashionCNN (PyTorch)"
    }
    post_res = client.post("/api/wardrobe/items", json=new_item)
    assert post_res.status_code == 201
    created_item = post_res.get_json()["item"]
    item_id = created_item["id"]
    assert created_item["name"] == "Emerald Silk Midi Dress"
    assert created_item["category"] == "Dresses"

    # 3. GET item by ID
    get_single = client.get(f"/api/wardrobe/items/{item_id}")
    assert get_single.status_code == 200
    assert get_single.get_json()["item"]["id"] == item_id

    # 4. PUT update item
    update_res = client.put(f"/api/wardrobe/items/{item_id}", json={"name": "Updated Emerald Silk Dress", "colour": "Dark Green"})
    assert update_res.status_code == 200
    updated_item = update_res.get_json()["item"]
    assert updated_item["name"] == "Updated Emerald Silk Dress"
    assert updated_item["colour"] == "Dark Green"

    # 5. DELETE item
    del_res = client.delete(f"/api/wardrobe/items/{item_id}")
    assert del_res.status_code == 200
    assert del_res.get_json()["status"] == "success"

    # 6. Verify item is deleted
    get_after = client.get(f"/api/wardrobe/items/{item_id}")
    assert get_after.status_code == 404


def test_wardrobe_items_validation_errors(client):
    # Missing name
    res1 = client.post("/api/wardrobe/items", json={"category": "Tops"})
    assert res1.status_code == 400
    assert "Item name is required" in res1.get_json()["error"]

    # Missing category
    res2 = client.post("/api/wardrobe/items", json={"name": "Shirt"})
    assert res2.status_code == 400
    assert "Item category is required" in res2.get_json()["error"]


def test_transfer_learning_model_artifacts_exist():
    tl_weights = BASE_DIR / "models" / "mobilenet_v2_fmnist.pt"
    tl_report = BASE_DIR / "datasets" / "reports" / "transfer_learning_eval.json"
    assert tl_weights.exists()
    assert tl_report.exists()

    with open(tl_report, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert data["test_accuracy"] > 0.70
    assert "MobileNetV2" in data["model_architecture"]


# ============================================================================
# 6. FUNCTIONALITY 2: RECOMMENDATION PIPELINE & API TESTS
# ============================================================================
def test_recommender_preference_filtering():
    engine = OutfitRecommender()
    prefs = {
        "occasion": "Office",
        "style": "Formal",
        "colour": "Blue",
        "season": "Summer",
        "budget": "2500"
    }
    result = engine.recommend_outfits(preferences=prefs, limit=3)
    assert result["status"] == "success"
    assert "primary_recommendation" in result
    primary = result["primary_recommendation"]
    assert primary["occasion"] == "Office"
    assert primary["style"] == "Formal"
    assert primary["season"] == "Summer"
    assert 0 <= primary["compatibility_score"] <= 100
    assert len(primary["items"]) >= 3


def test_recommender_slot_completeness():
    engine = OutfitRecommender()
    result = engine.recommend_outfits(preferences={"occasion": "College"}, limit=2)
    curated = result["recommendations"]
    assert len(curated) >= 1

    for outfit in curated:
        slots = [item["slot"] for item in outfit["items"]]
        assert "Top" in slots, "Top slot must be present"
        assert "Bottom" in slots, "Bottom slot must be present"
        assert "Shoes" in slots, "Shoes slot must be present"
        # Verify no duplicate Top, Bottom, or Shoes
        assert slots.count("Top") == 1
        assert slots.count("Bottom") == 1
        assert slots.count("Shoes") == 1
        for item in outfit["items"]:
            assert item["image"].startswith("http")
            assert len(item["name"]) > 0


def test_recommender_color_harmony():
    engine = OutfitRecommender()
    res = engine.recommend_outfits(preferences={"colour": "Black", "occasion": "Party"}, limit=2)
    primary = res["primary_recommendation"]
    assert "color_score" in primary
    assert 0 <= primary["color_score"] <= 100
    assert "color_harmony_explanation" in primary
    assert len(primary["color_harmony_explanation"]) > 5
    assert len(primary["reasons"]) >= 3


def test_recommender_multiple_curations():
    engine = OutfitRecommender()
    res = engine.recommend_outfits(preferences={"occasion": "Casual"}, limit=4)
    assert res["status"] == "success"
    assert res["primary_recommendation"] is not None
    assert len(res["alternatives"]) >= 1
    assert len(res["recommendations"]) <= 4

    # Verify that alternatives have appropriate structure
    for alt in res["alternatives"]:
        assert "id" in alt
        assert "name" in alt
        assert "items" in alt
        assert "heroImage" in alt
        assert "wardrobe_match" in alt


def test_api_recommendations_endpoint(client):
    payload = {
        "preferences": {
            "occasion": "College",
            "style": "Casual",
            "colour": "Black",
            "season": "Summer",
            "budget": "1800"
        },
        "wardrobe": [
            {"id": "w1", "name": "Black Tee", "category": "Tops", "colour": "Black"},
            {"id": "w2", "name": "Blue Jeans", "category": "Bottoms", "colour": "Blue"}
        ],
        "limit": 4
    }
    response = client.post("/api/recommendations", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert "primary_recommendation" in data
    assert "alternatives" in data
    assert "recommendations" in data

    primary = data["primary_recommendation"]
    assert primary["occasion"] == "College"
    assert len(primary["items"]) >= 3
    assert primary["wardrobe_match"]["matched_count"] >= 0
    assert primary["wardrobe_match"]["percentage"] >= 0


def test_api_recommendations_partial_preferences(client):
    # Empty payload
    res1 = client.post("/api/recommendations", json={})
    assert res1.status_code == 200
    data1 = res1.get_json()
    assert data1["status"] == "success"
    assert "primary_recommendation" in data1
    assert len(data1["primary_recommendation"]["items"]) >= 3

    # Partial preferences
    res2 = client.post("/api/recommendations", json={"preferences": {"occasion": "Party"}})
    assert res2.status_code == 200
    data2 = res2.get_json()
    assert data2["primary_recommendation"]["occasion"] == "Party"


def test_recommender_formal_style_calibration():
    engine = OutfitRecommender()
    prefs = {
        "occasion": "College",
        "outfitType": "Full Outfit",
        "colour": "Black",
        "style": "Formal",
        "season": "Summer"
    }
    result = engine.recommend_outfits(preferences=prefs, limit=2)
    assert result["status"] == "success"
    primary = result["primary_recommendation"]

    # Verify Hero image matches formal + black
    assert "photo-1594938298603" in primary["heroImage"]

    # Verify garment slots
    slots = {item["slot"]: item for item in primary["items"]}
    assert "Top" in slots
    assert "Bottom" in slots
    assert "Shoes" in slots

    top = slots["Top"]
    bottom = slots["Bottom"]
    shoes = slots["Shoes"]

    # Formal top must be a Shirt (not T-shirt)
    assert top["article_type"].lower() == "shirts"
    assert "black" in top["colour"].lower()

    # Formal bottom must be Trousers
    assert "trouser" in bottom["article_type"].lower()

    # Formal shoes must be Formal Shoes
    assert "formal" in shoes["article_type"].lower() or "shoe" in shoes["article_type"].lower()


def test_recommender_outfit_type_and_colour():
    engine = OutfitRecommender()
    prefs = {
        "occasion": "Casual",
        "outfitType": "Jeans",
        "colour": "Blue",
        "style": "Casual",
        "season": "Summer"
    }
    result = engine.recommend_outfits(preferences=prefs, limit=2)
    primary = result["primary_recommendation"]
    slots = {item["slot"]: item for item in primary["items"]}

    # Bottom must be Jeans
    assert "jeans" in slots["Bottom"]["article_type"].lower()
    # Top must be Blue
    assert "blue" in slots["Top"]["colour"].lower()


def test_look_generator_canvas_creation():
    from backend.services.look_generator import generate_composed_outfit_canvas
    test_outfit = {
        "id": "rec_test_canvas",
        "name": "Formal Test Ensemble",
        "occasion": "College",
        "style": "Formal",
        "season": "Summer",
        "compatibility_score": 95,
        "items": [
            {"slot": "Top", "name": "Black Formal Shirt", "colour": "Black", "article_type": "Shirts", "owned": True, "image": None},
            {"slot": "Bottom", "name": "Dark Grey Trousers", "colour": "Grey", "article_type": "Trousers", "owned": True, "image": None},
            {"slot": "Shoes", "name": "Black Oxford Shoes", "colour": "Black", "article_type": "Formal Shoes", "owned": False, "image": None},
            {"slot": "Layer", "name": "Tailored Blazer", "colour": "Charcoal", "article_type": "Blazers", "owned": True, "image": None}
        ]
    }
    url = generate_composed_outfit_canvas(test_outfit)
    assert url is not None
    assert url.startswith("/api/wardrobe/uploads/looks/")
    
    # Check that file exists on disk
    filename = url.split("/")[-1]
    disk_path = BASE_DIR / "backend" / "uploads" / "looks" / filename
    assert disk_path.exists()
    assert disk_path.stat().st_size > 1000



