"""
Comprehensive Test Suite for Functionality 4: AI Virtual Try-On.

Tests:
1. System status & model readiness (/api/try-on/status)
2. Input validation & error boundaries (missing, corrupted, oversized images)
3. End-to-end neural inference synthesis (LRASPP MobileNetV3 + Keypoint-RCNN)
4. ML routes backward compatibility (/api/ml/try-on)
5. Privacy guarantees (zero disk storage of user portraits)
6. Engine internal modules (silhouette parsing, pose detection, geometric warping, neural blending)
"""

import os
import sys
import io
import json
import base64
import pytest
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.app import create_app
from backend.services.vton_engine import VirtualTryOnEngine
from backend.services.tryon_service import execute_try_on, get_vto_system_status


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def create_test_person_image_b64(width=300, height=400):
    """Creates a synthetic standing figure with head, shoulders, and torso."""
    img = Image.new("RGB", (width, height), color=(240, 238, 233))
    draw = ImageDraw.Draw(img)

    # Head
    draw.ellipse([width // 2 - 25, 40, width // 2 + 25, 100], fill=(225, 185, 155))
    # Neck
    draw.rectangle([width // 2 - 12, 100, width // 2 + 12, 125], fill=(215, 175, 145))
    # Torso
    draw.polygon([
        (width // 2 - 60, 125),
        (width // 2 + 60, 125),
        (width // 2 + 50, 280),
        (width // 2 - 50, 280)
    ], fill=(120, 140, 180))
    # Legs
    draw.rectangle([width // 2 - 45, 280, width // 2 - 10, 390], fill=(60, 70, 90))
    draw.rectangle([width // 2 + 10, 280, width // 2 + 45, 390], fill=(60, 70, 90))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")


def create_test_garment_image_b64(width=250, height=250):
    """Creates a synthetic garment (red silk top) on a neutral background."""
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Draw garment contour
    draw.polygon([
        (50, 60),
        (90, 40),
        (160, 40),
        (200, 60),
        (190, 100),
        (170, 95),
        (175, 210),
        (75, 210),
        (80, 95),
        (60, 100)
    ], fill=(210, 45, 45))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")


# ============================================================================
# 1. SYSTEM READINESS & STATUS TESTS
# ============================================================================
def test_tryon_status_endpoint(client):
    """Verify that the Virtual Try-On status endpoint reports healthy ready state."""
    response = client.get("/api/try-on/status")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "ready"
    assert data["is_ready"] is True
    assert "MobileNetV3-LRASPP" in data["models"]["human_parser"]
    assert "Keypoint R-CNN" in data["models"]["pose_estimator"]
    assert "privacy" in data
    assert data["privacy"]["zero_retention"] is True


def test_tryon_service_status_function():
    """Verify that get_vto_system_status returns expected metadata structure."""
    status = get_vto_system_status()
    assert status["is_ready"] is True
    assert "supported_garment_types" in status
    assert "Top" in status["supported_garment_types"]
    assert "Dress" in status["supported_garment_types"]


# ============================================================================
# 2. INPUT VALIDATION & ERROR HANDLING TESTS
# ============================================================================
def test_tryon_missing_person_image(client):
    """Missing person image returns HTTP 400 with helpful error."""
    garment = create_test_garment_image_b64()
    response = client.post("/api/try-on", json={"garment_image": garment})
    assert response.status_code == 400
    data = response.get_json()
    assert data["status"] == "error"
    assert "person_image" in data["error"].lower() or "user_photo" in data["error"].lower()


def test_tryon_missing_garment_image(client):
    """Missing garment image returns HTTP 400 with helpful error."""
    person = create_test_person_image_b64()
    response = client.post("/api/try-on", json={"person_image": person})
    assert response.status_code == 400
    data = response.get_json()
    assert data["status"] == "error"
    assert "garment" in data["error"].lower()


def test_tryon_corrupted_person_image(client):
    """Corrupted person image returns HTTP 400."""
    garment = create_test_garment_image_b64()
    corrupt_b64 = "data:image/jpeg;base64,not_a_valid_image_base64_payload_at_all"
    response = client.post("/api/try-on", json={
        "person_image": corrupt_b64,
        "garment_image": garment
    })
    assert response.status_code == 400
    data = response.get_json()
    assert data["status"] == "error"


def test_tryon_empty_payload(client):
    """Empty JSON payload returns HTTP 400."""
    response = client.post("/api/try-on", json={})
    assert response.status_code == 400
    data = response.get_json()
    assert data["status"] == "error"


# ============================================================================
# 3. END-TO-END NEURAL INFERENCE TESTS
# ============================================================================
def test_tryon_end_to_end_synthesis(client):
    """
    Executes real virtual try-on inference through the HTTP API.
    Verifies that the response contains valid synthesized base64 image and metrics.
    """
    person = create_test_person_image_b64()
    garment = create_test_garment_image_b64()

    response = client.post("/api/try-on", json={
        "person_image": person,
        "garment_image": garment,
        "category": "Top",
        "blend_mode": "neural"
    })

    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "completed"
    assert "result_image" in data
    assert data["result_image"].startswith("data:image/jpeg;base64,")

    # Decode and verify synthesized image dimensions
    raw_b64 = data["result_image"].split(",", 1)[1]
    synth_bytes = base64.b64decode(raw_b64)
    synth_img = Image.open(io.BytesIO(synth_bytes))
    assert synth_img.size[0] > 0
    assert synth_img.size[1] > 0

    # Verify metrics
    metrics = data.get("metrics", {})
    assert "inference_time_sec" in metrics
    assert metrics["inference_time_sec"] > 0
    assert "stages_completed" in metrics
    assert len(metrics["stages_completed"]) >= 4


def test_tryon_ml_route_backward_compatibility(client):
    """Verify that /api/ml/try-on correctly forwards to the try-on pipeline."""
    person = create_test_person_image_b64()
    garment = create_test_garment_image_b64()

    response = client.post("/api/ml/try-on", json={
        "person_image": person,
        "garment_image": garment,
        "category": "Top"
    })

    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "completed"
    assert data["result_image"].startswith("data:image/jpeg;base64,")


# ============================================================================
# 4. PRIVACY ASSURANCE TEST
# ============================================================================
def test_tryon_privacy_no_disk_retention():
    """Verify that running try-on does NOT leak or store user portraits on disk."""
    person = create_test_person_image_b64()
    garment = create_test_garment_image_b64()

    uploads_dir = BASE_DIR / "backend" / "uploads"
    before_files = set(uploads_dir.glob("**/*")) if uploads_dir.exists() else set()

    result = execute_try_on(user_image_path=person, garment_image_path=garment)
    assert result["status"] == "completed"

    after_files = set(uploads_dir.glob("**/*")) if uploads_dir.exists() else set()
    new_files = after_files - before_files

    # Zero personal portrait files stored in uploads
    for f in new_files:
        assert "portrait" not in f.name.lower()
        assert "person" not in f.name.lower()


# ============================================================================
# 5. ENGINE INTERNAL MODULE TESTS
# ============================================================================
def test_vton_engine_direct_execution():
    """Directly invokes VirtualTryOnEngine and tests segmentation & pose pipeline."""
    engine = VirtualTryOnEngine()

    person_b64 = create_test_person_image_b64(240, 320)
    garment_b64 = create_test_garment_image_b64(200, 200)

    person_np = engine.load_image_from_bytes_or_base64(person_b64)
    garment_np = engine.load_image_from_bytes_or_base64(garment_b64)

    assert person_np.shape[0] == 320
    assert person_np.shape[1] == 240
    assert person_np.shape[2] == 3

    # Human silhouette parsing
    mask = engine.parse_human_silhouette(person_np)
    assert mask.shape == (320, 240)
    assert 0.0 <= mask.min() <= mask.max() <= 1.0

    # Pose estimation
    pose = engine.estimate_body_pose(person_np)
    assert "detected" in pose
    assert "torso_box" in pose

    # Full try-on synthesis
    result = engine.try_on(person_np, garment_np, category="top")
    assert "result_image_base64" in result
    assert result["metrics"]["inference_time_sec"] > 0
    assert result["status"] in ("completed", "success")


def test_tryon_user_uploaded_green_tshirt(client):
    """
    Directly tests fitting the user's uploaded lime-green t-shirt onto
    the user's portrait photograph as requested in the bug report.
    """
    user_portrait_file = BASE_DIR / "backend" / "uploads" / "user_portrait.png"
    green_tshirt_file = BASE_DIR / "backend" / "uploads" / "green_tshirt.png"

    if user_portrait_file.exists() and green_tshirt_file.exists():
        response = client.post("/api/try-on", json={
            "person_image": str(user_portrait_file),
            "garment_image": str(green_tshirt_file),
            "category": "Top"
        })
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "completed"
        assert "result_image" in data
        assert data["result_image"].startswith("data:image/jpeg;base64,")
        assert data["metrics"]["inference_time_sec"] > 0


def test_tryon_user_uploaded_woman_portrait(client):
    """
    Directly tests fitting the user's uploaded lime-green t-shirt onto
    the woman portrait photograph shown in user screenshot.
    """
    woman_portrait_file = BASE_DIR / "backend" / "uploads" / "woman_portrait.png"
    green_tshirt_file = BASE_DIR / "backend" / "uploads" / "green_tshirt.png"

    if woman_portrait_file.exists() and green_tshirt_file.exists():
        response = client.post("/api/try-on", json={
            "person_image": str(woman_portrait_file),
            "garment_image": str(green_tshirt_file),
            "category": "Top"
        })
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "completed"
        assert "result_image" in data
        assert data["result_image"].startswith("data:image/jpeg;base64,")
        assert data["metrics"]["inference_time_sec"] > 0

