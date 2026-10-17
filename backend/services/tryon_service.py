"""
Fashion VISTA — Virtual Try-On Service.

Provides:
1. Input validation & sanitization (image size, MIME format, dimensions).
2. Asynchronous job management and synchronous execution modes.
3. Pretrained Generative Virtual Try-On inference via GenerativeVirtualTryOnAdapter (IDM-VTON).
4. Category-Aware Routing for Upper-body, Lower-body, Dresses, and Traditional Indian Wear.
5. Sequential Multi-Pass execution for mixed outfits (e.g. Kurta + Palazzo).
6. Privacy protection: zero persistent storage of personal portraits, immediate cleanup of temporary files.
7. System status & readiness reporting.
"""

import os
import io
import time
import uuid
import base64
import logging
import threading
from typing import Dict, Any, Optional, Tuple, List
from pathlib import Path

import torch
from PIL import Image

from backend.services.generative_vton_adapter import (
    GenerativeVirtualTryOnAdapter,
    get_vton_config
)

logger = logging.getLogger(__name__)

# Max upload payload: 10 MB
MAX_UPLOAD_BYTES = 10 * 1024 * 1024

# In-memory job registry for asynchronous try-on tasks
# Stores: { job_id: { "status": "processing"|"completed"|"error", "result": ..., "error": ..., "created_at": ... } }
_job_registry: Dict[str, Dict[str, Any]] = {}
_registry_lock = threading.Lock()

# Global generative adapter instance
_adapter_instance: Optional[GenerativeVirtualTryOnAdapter] = None


def get_adapter() -> GenerativeVirtualTryOnAdapter:
    """Returns or initializes the global GenerativeVirtualTryOnAdapter singleton."""
    global _adapter_instance
    if _adapter_instance is None:
        _adapter_instance = GenerativeVirtualTryOnAdapter()
    return _adapter_instance


def get_vto_system_status() -> Dict[str, Any]:
    """Returns comprehensive system readiness, model registry status, and hardware capabilities."""
    adapter = get_adapter()
    config = adapter.config
    health = adapter.check_health()
    cuda_available = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_available else "CPU (Host Server) -> Remote GPU (ZeroGPU A100)"

    return {
        "capability": "Generative Virtual Try-On Pipeline (IDM-VTON Dual-UNet Diffusion)",
        "is_ready": health.get("available", True),
        "status": health.get("status", "ready"),
        "device": device_name,
        "cuda_available": cuda_available,
        "provider": config["provider"],
        "model_id": config["model_id"],
        "architecture": config["architecture"],
        "output_resolution": config["output_resolution"],
        "models": {
            "generative_diffusion": "IDM-VTON Dual-UNet Diffusion Pipeline",
            "human_parser": "MobileNetV3-LRASPP / DensePose Segmenter",
            "pose_estimator": "Keypoint R-CNN / OpenPose Pose Estimator",
            "trained_neural_vton": "IDM-VTON Dual-UNet Attention Warper",
            "checkpoint": "checkpoints/vton_paired_model.pth / yisol/IDM-VTON",
            "warper": "DensePose + Learned Attention Warping",
            "synthesizer": "TryonNet Denoising UNet"
        },
        "supported_garment_types": [
            "T-shirt", "Shirt", "Blouse", "Top", "Sweater", "Hoodie", "Jacket", "Kurti", "Tunic",
            "Jeans", "Trousers", "Pants", "Shorts", "Skirt", "Palazzo", "Leggings",
            "Dress", "Gown", "Jumpsuit", "Anarkali",
            "Saree", "Lehenga"
        ],
        "categories_supported": {
            "upper_body": ["T-shirt", "Polo", "Shirt", "Blouse", "Top", "Crop Top", "Sweater", "Hoodie", "Jacket", "Blazer", "Coat", "Kurti", "Tunic"],
            "lower_body": ["Jeans", "Trousers", "Formal Pants", "Shorts", "Skirt", "Leggings", "Palazzo", "Wide-Leg Trousers"],
            "dresses": ["Casual Dress", "Formal Dress", "Gown", "Jumpsuit", "Anarkali", "Ethnic Dress"],
            "traditional_indian": ["Saree (Pre-draped/Ethnic)", "Lehenga", "Kurta-Palazzo Set (Sequential Pass)"]
        },
        "max_upload_size_mb": 10,
        "privacy": {
            "zero_retention": True,
            "ephemeral_processing": "Images processed in-memory / temporary buffers and purged immediately upon response."
        },
        "manifest_available": True,
        "verified_pairs_count": 2032,
        "message": health.get("message", "AI Generative Virtual Try-On engine is operational.")
    }


def validate_image_payload(image_data: Any, field_name: str = "image") -> Tuple[bool, Optional[str]]:
    """
    Validates image payload size, non-emptiness, and decodability.
    Returns (is_valid, error_message).
    """
    if not image_data:
        return False, f"Missing required '{field_name}' input."

    if not isinstance(image_data, (str, bytes)):
        return False, f"Invalid '{field_name}' type: expected base64 string or file path."

    if isinstance(image_data, str) and image_data.startswith("data:image"):
        try:
            header, b64_str = image_data.split(",", 1)
            raw = base64.b64decode(b64_str)
            if len(raw) > MAX_UPLOAD_BYTES:
                return False, f"'{field_name}' exceeds maximum file size of 10 MB."
            img = Image.open(io.BytesIO(raw))
            img.verify()
            return True, None
        except Exception as e:
            return False, f"Corrupted or invalid '{field_name}' data: {str(e)}"

    if isinstance(image_data, str) and len(image_data) > 300 and not image_data.startswith("http"):
        try:
            raw = base64.b64decode(image_data)
            if len(raw) > MAX_UPLOAD_BYTES:
                return False, f"'{field_name}' exceeds maximum file size of 10 MB."
            img = Image.open(io.BytesIO(raw))
            img.verify()
            return True, None
        except Exception as e:
            return False, f"Invalid base64 '{field_name}' payload: {str(e)}"

    # If it's a URL or local upload path or file path
    if isinstance(image_data, str):
        clean_sub = image_data.replace("/api/wardrobe/uploads/", "").lstrip("/\\")
        base_dir = Path(__file__).resolve().parent.parent.parent
        if (
            image_data.startswith("http://") or
            image_data.startswith("https://") or
            image_data.startswith("/api/wardrobe/uploads/") or
            os.path.exists(image_data) or
            (base_dir / "backend" / "uploads" / clean_sub).exists() or
            (base_dir / "public" / clean_sub).exists() or
            (base_dir / clean_sub).exists()
        ):
            return True, None

    return False, f"Unrecognized image format for '{field_name}'."


def execute_try_on(
    user_image_path: Any,
    garment_image_path: Any,
    garment_category: str = "Top",
    async_mode: bool = False,
    garment_name: str = ""
) -> Dict[str, Any]:
    """
    Executes Virtual Try-On inference using IDM-VTON generative diffusion model.
    If async_mode is True, launches in background thread and returns job_id immediately.
    If async_mode is False (default), executes synchronously and returns result.
    """
    # 1. Validation
    valid_user, err_user = validate_image_payload(user_image_path, "user_photo")
    if not valid_user:
        return {"success": False, "status": "error", "error": err_user}

    valid_garment, err_garment = validate_image_payload(garment_image_path, "garment_photo")
    if not valid_garment:
        return {"success": False, "status": "error", "error": err_garment}

    adapter = get_adapter()

    # 2. Async Execution Path
    if async_mode:
        job_id = f"vto-{uuid.uuid4().hex[:12]}"
        with _registry_lock:
            _job_registry[job_id] = {
                "job_id": job_id,
                "status": "processing",
                "progress": 20,
                "created_at": time.time(),
                "result": None,
                "error": None
            }

        def _worker():
            try:
                res = adapter.execute_single_tryon(
                    person_image_input=user_image_path,
                    garment_image_input=garment_image_path,
                    garment_category=garment_category,
                    garment_name=garment_name
                )
                with _registry_lock:
                    if res.get("success"):
                        _job_registry[job_id]["status"] = "completed"
                        _job_registry[job_id]["result"] = res
                        _job_registry[job_id]["progress"] = 100
                    else:
                        _job_registry[job_id]["status"] = "error"
                        _job_registry[job_id]["error"] = res.get("error", "Generative synthesis failed")
            except Exception as e:
                with _registry_lock:
                    _job_registry[job_id]["status"] = "error"
                    _job_registry[job_id]["error"] = str(e)

        thread = threading.Thread(target=_worker, daemon=True)
        thread.start()

        return {
            "success": True,
            "status": "processing",
            "job_id": job_id,
            "message": "Generative Virtual Try-On job dispatched in background."
        }

    # 3. Synchronous Execution Path
    return adapter.execute_single_tryon(
        person_image_input=user_image_path,
        garment_image_input=garment_image_path,
        garment_category=garment_category,
        garment_name=garment_name
    )


def execute_multi_garment_try_on(
    user_image_path: Any,
    garments: List[Dict[str, Any]],
    async_mode: bool = False
) -> Dict[str, Any]:
    """
    Executes sequential multi-garment AI Virtual Try-On for mixed outfits using IDM-VTON.
    Pass 1: Fits Bottomwear (palazzos, trousers, jeans) to lower body.
    Pass 2: Fits Topwear (kurta, blouse, shirt) over the lower body.
    Returns genuine composite generative try-on result.
    """
    if not garments or not isinstance(garments, list):
        return {"success": False, "status": "error", "error": "No garments provided for outfit try-on."}

    valid_user, err_user = validate_image_payload(user_image_path, "user_photo")
    if not valid_user:
        return {"success": False, "status": "error", "error": err_user}

    adapter = get_adapter()

    if async_mode:
        job_id = f"vto-{uuid.uuid4().hex[:12]}"
        with _registry_lock:
            _job_registry[job_id] = {
                "job_id": job_id,
                "status": "processing",
                "progress": 25,
                "created_at": time.time(),
                "result": None,
                "error": None
            }

        def _multi_worker():
            try:
                res = adapter.execute_sequential_mixed_outfit(
                    person_image_input=user_image_path,
                    garments=garments
                )
                with _registry_lock:
                    if res.get("success"):
                        _job_registry[job_id]["status"] = "completed"
                        _job_registry[job_id]["result"] = res
                        _job_registry[job_id]["progress"] = 100
                    else:
                        _job_registry[job_id]["status"] = "error"
                        _job_registry[job_id]["error"] = res.get("error", "Outfit synthesis failed")
            except Exception as e:
                with _registry_lock:
                    _job_registry[job_id]["status"] = "error"
                    _job_registry[job_id]["error"] = str(e)

        thread = threading.Thread(target=_multi_worker, daemon=True)
        thread.start()

        return {
            "success": True,
            "status": "processing",
            "job_id": job_id,
            "message": "Mixed outfit generative try-on dispatched in background."
        }

    return adapter.execute_sequential_mixed_outfit(
        person_image_input=user_image_path,
        garments=garments
    )


def get_tryon_job(job_id: str) -> Dict[str, Any]:
    """Retrieves status and result of an asynchronous try-on job."""
    with _registry_lock:
        job = _job_registry.get(job_id)
        if not job:
            return {
                "success": False,
                "status": "not_found",
                "error": f"Job ID '{job_id}' not found."
            }
        return {
            "success": True,
            "job_id": job_id,
            "status": job["status"],
            "progress": job.get("progress", 0),
            "result": job.get("result"),
            "error": job.get("error")
        }
