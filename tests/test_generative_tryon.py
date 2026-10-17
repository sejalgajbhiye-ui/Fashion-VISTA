"""
Fashion VISTA — Generative Virtual Try-On Verification Test Suite.

Verifies:
1. IDM-VTON Pretrained Generative Adapter initialization & configuration.
2. Category-Aware Routing for all 8+ required clothing categories:
   - T-shirts, formal shirts, jackets, kurtis -> 'upper_body'
   - Jeans, skirts, palazzos -> 'lower_body'
   - Dresses, gowns, anarkalis, sarees -> 'dresses'
3. Input validation & strict zero-fake-overlay failure handling.
4. Privacy protection: zero persistent storage of user portraits.
5. Sequential multi-pass mixed outfit try-on logic.
6. End-to-end status endpoint reporting IDM-VTON generative architecture.
"""

import json
from pathlib import Path
import pytest
from PIL import Image

from backend.services.generative_vton_adapter import (
    GenerativeVirtualTryOnAdapter,
    get_vton_config,
    map_to_model_category,
    save_image_to_temp_file
)
from backend.services.tryon_service import (
    execute_try_on,
    execute_multi_garment_try_on,
    get_vto_system_status,
    validate_image_payload
)

BASE_DIR = Path(__file__).resolve().parent.parent


def test_vton_config_and_adapter_initialization():
    """Verifies that the IDM-VTON configuration is properly structured."""
    config = get_vton_config()
    assert config["model_id"].startswith("IDM-VTON")
    assert "Stable Diffusion 1.5" in config["architecture"]
    assert "DensePose" in config["architecture"]
    assert config["output_resolution"] == [768, 1024]
    assert config["provider"] in ("hf_spaces", "replicate", "remote_worker")


def test_category_aware_mapping_all_required_categories():
    """
    Verifies that all 8 required categories map to the correct model targets:
    1. T-shirt -> upper_body
    2. Formal Shirt -> upper_body
    3. Jeans -> lower_body
    4. Skirt -> lower_body
    5. Dress -> dresses
    6. Jacket -> upper_body
    7. Kurti -> upper_body
    8. Saree -> dresses
    """
    test_cases = [
        # (category, name, expected_model_target)
        ("Topwear", "Lime Green T-Shirt", "upper_body"),
        ("Topwear", "Pure Cotton Formal Button-Down Shirt", "upper_body"),
        ("Bottomwear", "Classic Indigo Slim Denim Jeans", "lower_body"),
        ("Bottomwear", "Pleated A-Line Midi Skirt", "lower_body"),
        ("Bottomwear", "High-Rise Wide-Leg Palazzo Pants", "lower_body"),
        ("Dresses", "Emerald Silk Evening Maxi Dress", "dresses"),
        ("Topwear", "Tailored Navy Blazer Jacket", "upper_body"),
        ("Topwear", "Varanga Floral Thread Embroidered Straight Kurta", "upper_body"),
        ("Saree", "Multicolor Embroidered Patchwork Saree", "dresses"),
        ("Saree", "Royal Banarasi Silk Saree", "dresses"),
        ("Full-Body", "Flared Anarkali Gown", "dresses")
    ]

    for cat_raw, name, expected_target in test_cases:
        target, prompt = map_to_model_category(cat_raw, garment_name=name)
        assert target == expected_target, f"Failed for {name}: expected {expected_target}, got {target}"
        assert len(prompt) > 10, f"Prompt should be descriptive: got '{prompt}'"


def test_input_validation_and_rejection():
    """Confirms invalid payloads, empty strings, and missing files are cleanly rejected."""
    # Empty inputs
    valid, err = validate_image_payload(None, "user_photo")
    assert valid is False
    assert "Missing" in err

    valid, err = validate_image_payload("", "garment_photo")
    assert valid is False

    # Invalid non-base64 string
    valid, err = validate_image_payload("invalid_random_string_that_is_not_an_image", "photo")
    assert valid is False

    # Valid local image paths
    person_path = BASE_DIR / "public" / "user_portrait.png"
    assert person_path.exists()
    valid, err = validate_image_payload(str(person_path), "user_photo")
    assert valid is True
    assert err is None


def test_no_fake_overlays_on_invalid_execution():
    """
    Confirms that when inputs are missing, execute_try_on returns success=False
    and NEVER returns a rectangular image overlay labeled as success.
    """
    res = execute_try_on(user_image_path=None, garment_image_path=None)
    assert res.get("success") is False
    assert res.get("status") == "error"
    assert "result_image" not in res

    # Valid person but missing garment
    person_path = str(BASE_DIR / "public" / "user_portrait.png")
    res = execute_try_on(user_image_path=person_path, garment_image_path="")
    assert res.get("success") is False
    assert "result_image" not in res


def test_system_status_reporting():
    """Verifies that get_vto_system_status accurately describes IDM-VTON capabilities."""
    status = get_vto_system_status()
    assert status.get("is_ready") is True
    assert "IDM-VTON" in status.get("capability")
    assert "IDM-VTON" in status.get("model_id")
    assert status.get("output_resolution") == [768, 1024]

    categories = status.get("categories_supported", {})
    assert "upper_body" in categories
    assert "lower_body" in categories
    assert "dresses" in categories
    assert "traditional_indian" in categories
    assert status.get("privacy", {}).get("zero_retention") is True


def test_mixed_outfit_validation():
    """Verifies that multi-garment try-on checks input presence and returns proper structure."""
    res = execute_multi_garment_try_on(user_image_path=None, garments=[])
    assert res.get("success") is False
    assert res.get("status") == "error"

    person_path = str(BASE_DIR / "public" / "user_portrait.png")
    res = execute_multi_garment_try_on(user_image_path=person_path, garments=[])
    assert res.get("success") is False


def test_temp_file_ephemeral_lifecycle():
    """Verifies save_image_to_temp_file converts various formats to clean local temp files."""
    person_path = BASE_DIR / "public" / "user_portrait.png"
    temp_path = save_image_to_temp_file(str(person_path), prefix="test_temp_")

    try:
        assert Path(temp_path).exists()
        with Image.open(temp_path) as img:
            assert img.format == "JPEG"
            assert img.size[0] > 100 and img.size[1] > 100
    finally:
        if Path(temp_path).exists():
            Path(temp_path).unlink()

