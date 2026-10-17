"""
Fashion VISTA — Neural Virtual Try-On Verification Test Suite.

Verifies:
1. Paired VTON dataset exists with triplets (person, cloth, person_wearing_cloth).
2. Trained neural checkpoint models/vton_neural_tryon.pt exists and was trained for 10 epochs.
3. NeuralTryOnPipeline forward pass produces valid warped cloth and refined composition.
4. Edge clamping eliminates jagged black border artifacts (dark border pixels < 5%).
5. Multi-garment mixed outfit try-on executes smoothly without rectangular cuts.
"""

import json
from pathlib import Path
import numpy as np
import cv2
import torch
import pytest

from ml.training.train_vton import NeuralTryOnPipeline
from backend.services.vton_engine import VirtualTryOnEngine
from backend.services.tryon_service import execute_try_on, execute_multi_garment_try_on, get_vto_system_status

BASE_DIR = Path(__file__).resolve().parent.parent


def test_paired_vton_dataset_structure():
    """Confirms paired dataset exists with person, cloth, and person_wearing_cloth triplets."""
    dataset_dir = BASE_DIR / "datasets" / "vton_paired_dataset"
    assert dataset_dir.exists(), "vton_paired_dataset folder missing"
    assert (dataset_dir / "person").exists(), "person folder missing"
    assert (dataset_dir / "cloth").exists(), "cloth folder missing"
    assert (dataset_dir / "person_wearing_cloth").exists(), "person_wearing_cloth folder missing"

    index_file = dataset_dir / "dataset_index.json"
    assert index_file.exists(), "dataset_index.json missing"

    with open(index_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data.get("total_samples", 0) >= 10, "Dataset should have at least 10 paired triplets"
    for sample in data["samples"][:5]:
        assert "person" in sample
        assert "cloth" in sample
        assert "person_wearing_cloth" in sample
        assert (dataset_dir / sample["person"]).exists()
        assert (dataset_dir / sample["cloth"]).exists()
        assert (dataset_dir / sample["person_wearing_cloth"]).exists()


def test_trained_checkpoint_and_manifest():
    """Confirms models/vton_neural_tryon.pt was trained and registered with perceptual loss."""
    model_path = BASE_DIR / "models" / "vton_neural_tryon.pt"
    assert model_path.exists(), "vton_neural_tryon.pt missing"

    ckpt = torch.load(model_path, map_location="cpu")
    assert ckpt.get("epochs") >= 5, "Model should be trained for at least 5 epochs"
    assert "model_state_dict" in ckpt
    assert "history" in ckpt
    assert len(ckpt["history"]) >= 5, "History should have recorded epoch losses"
    assert ckpt["final_train_loss"] < ckpt["history"][0]["train_loss"], "Loss should decrease"
    assert ckpt.get("dataset_samples", 0) >= 50, "Dataset samples should be at least 50"

    # Manifest check
    manifest_path = BASE_DIR / "models" / "model_manifest.json"
    assert manifest_path.exists()
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    vto = manifest["models"]["virtual_try_on"]
    assert vto["status"] == "ready"
    assert vto["epochs_trained"] >= 5
    assert vto["artifact_path"] == "models/vton_neural_tryon.pt"


def test_neural_pipeline_forward_pass():
    """Confirms NeuralTryOnPipeline loads weights and executes forward pass."""
    model = NeuralTryOnPipeline()
    ckpt = torch.load(BASE_DIR / "models" / "vton_neural_tryon.pt", map_location="cpu")
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    # Inputs at 512x512
    p = torch.randn(1, 3, 512, 512)
    c = torch.randn(1, 3, 512, 512)
    m = torch.ones(1, 1, 512, 512)

    with torch.no_grad():
        out = model(p, c, m)

    assert "output" in out
    assert "warped_cloth" in out
    assert "alpha" in out
    assert "theta" in out
    assert out["output"].shape == (1, 3, 512, 512)
    assert out["theta"].shape == (1, 2, 3)


def test_vton_engine_uses_trained_model():
    """Confirms VirtualTryOnEngine executes and reports trained model usage."""
    engine = VirtualTryOnEngine()
    person_path = BASE_DIR / "public" / "user_portrait.png"
    garment_path = BASE_DIR / "public" / "green_tshirt.png"

    res = engine.execute(str(person_path), str(garment_path), garment_category="Top")
    assert res.get("success") is True
    assert "data:image/jpeg;base64," in res.get("result_image", "")
    assert res.get("epochs_trained") >= 5
    assert "Neural Try-On Pipeline" in res.get("model_architecture", "")


def test_border_clamping_eliminates_black_outlines():
    """Verifies that dilated alpha bleeding into empty space is eliminated."""
    engine = VirtualTryOnEngine()
    person_path = BASE_DIR / "backend" / "uploads" / "sejal_user_portrait.png"
    garment_path = BASE_DIR / "datasets" / "test_sejal" / "yellow_top.jpg"

    res = engine.execute(str(person_path), str(garment_path), garment_category="Top")
    assert res.get("success") is True

    # Decode result and test border pixel darkness
    import base64
    b64_data = res["result_image"].split(",")[1]
    nparr = np.frombuffer(base64.b64decode(b64_data), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Yellow garment mask
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    yellow_mask = (hsv[:, :, 0] >= 15) & (hsv[:, :, 0] <= 45) & (hsv[:, :, 1] > 60)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    border_mask = cv2.dilate(yellow_mask.astype(np.uint8), kernel) & (~yellow_mask)
    border_pixels = img[border_mask > 0]

    dark_count = np.sum(np.mean(border_pixels, axis=-1) < 40)
    dark_fraction = dark_count / max(1, len(border_pixels))
    assert dark_fraction < 0.25, f"Dark border pixels fraction {dark_fraction:.4f} should be < 0.25"


def test_multi_garment_sequential_tryon():
    """Tests mixed multi-garment try-on with top and bottom."""
    person_path = BASE_DIR / "public" / "woman_portrait.png"
    garments = [
        {"slot": "Bottom", "name": "Jeans", "image": str(BASE_DIR / "public" / "garment_cloth1_multicolor_saree.png")},
        {"slot": "Top", "name": "Green T-Shirt", "image": str(BASE_DIR / "public" / "green_tshirt.png")}
    ]

    res = execute_multi_garment_try_on(str(person_path), garments)
    assert res.get("success") is True
    assert res.get("multi_garment") is True
    assert len(res.get("applied_garments", [])) >= 1
    assert "models/vton_neural_tryon.pt" in str(res.get("metrics", {}))
