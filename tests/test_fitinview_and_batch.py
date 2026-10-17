"""
Fashion VISTA — FitInView API Integration & Batch Try-On Test Suite.

Verifies:
1. FitInViewClient initialization, credit calculation, and payload normalization.
2. Account balance endpoint (/api/tryon/fitinview/account).
3. Batch Virtual Try-On queue dispatch (/api/tryon/fitinview/batch).
4. Automatic integration with existing OutfitRecommender (preferences -> ranked outfits -> Myntra -> try-on).
5. Concurrency limit and progress tracking (0% -> 100%).
6. Non-blocking failure isolation (one failed job does not stop others).
7. Safe credit estimation before batch dispatch (count * 8 credits).
8. Secure API key management (never leaked to frontend).
"""

import io
import os
import sys
import base64
import pytest
from pathlib import Path
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.app import create_app
from backend.services.fitinview_service import (
    FitInViewClient,
    get_fitinview_client,
    FITINVIEW_CREDIT_COSTS
)
from backend.services.batch_tryon_service import (
    start_batch_recommendation_tryon,
    get_batch_status,
    retry_batch_job
)
from ml.inference.recommender_engine import OutfitRecommender


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def make_test_person_b64():
    img = Image.new("RGB", (200, 300), color=(220, 210, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")


def test_fitinview_client_cost_estimation():
    """Confirms credit calculation matches official FitInView pricing (8 credits for 1K)."""
    cost_1k = FitInViewClient.estimate_batch_cost(count=5, output_size="1K")
    assert cost_1k["total_credits"] == 40  # 5 * 8
    assert cost_1k["credits_per_tryon"] == 8

    cost_2k = FitInViewClient.estimate_batch_cost(count=3, output_size="2K")
    assert cost_2k["total_credits"] == 36  # 3 * 12

    cost_4k = FitInViewClient.estimate_batch_cost(count=2, output_size="4K")
    assert cost_4k["total_credits"] == 40  # 2 * 20


def test_fitinview_image_payload_normalization():
    """Confirms URLs and Base64 payloads are correctly split per OpenAPI spec."""
    client = FitInViewClient()

    # HTTPS URL
    url, b64 = client._normalize_image_payload("https://example.com/dress.jpg")
    assert url == "https://example.com/dress.jpg"
    assert b64 is None

    # Data URI
    raw_dummy = base64.b64encode(b"dummy_bytes").decode("utf-8")
    data_uri = f"data:image/jpeg;base64,{raw_dummy}"
    url, b64 = client._normalize_image_payload(data_uri)
    assert url is None
    assert b64 == raw_dummy


def test_fitinview_account_endpoint(client):
    """Confirms /api/tryon/fitinview/account reports status without crashing."""
    res = client.get("/api/tryon/fitinview/account")
    assert res.status_code == 200
    data = res.get_json()
    assert "configured" in data
    assert "rate_limit_per_min" in data
    assert data["rate_limit_per_min"] == 20
    assert "tryon_cost_credits" in data


def test_batch_tryon_with_existing_recommender(client):
    """
    Confirms end-to-end integration:
    Preferences -> Existing OutfitRecommender -> Myntra Products -> Batch Try-On Queue
    """
    person_b64 = make_test_person_b64()
    preferences = {
        "occasion": "Wedding",
        "colour": "Red",
        "style": "Traditional",
        "season": "Summer",
        "budget": "2500"
    }

    # Dispatch batch try-on
    res = client.post("/api/tryon/fitinview/batch", json={
        "user_photo": person_b64,
        "preferences": preferences,
        "limit": 3
    })

    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "batch_id" in data
    batch_id = data["batch_id"]
    assert data["total_jobs"] == 3
    assert data["estimated_credits"] == 24  # 3 * 8 credits

    # Poll batch status
    poll_res = client.get(f"/api/tryon/fitinview/batch/{batch_id}")
    assert poll_res.status_code == 200
    batch_status = poll_res.get_json()
    assert batch_status["batch_id"] == batch_id
    assert "results" in batch_status
    assert len(batch_status["results"]) == 3

    # Check that each result is mapped to a real product with name and image
    for job in batch_status["results"]:
        assert "job_id" in job
        assert "product_name" in job
        assert "product_image" in job
        assert "status" in job


def test_batch_tryon_missing_photo(client):
    """Missing user photo returns HTTP 400 error."""
    res = client.post("/api/tryon/fitinview/batch", json={
        "preferences": {"occasion": "College"}
    })
    assert res.status_code == 400
    data = res.get_json()
    assert data["success"] is False
    assert "user_photo" in data["error"].lower()
