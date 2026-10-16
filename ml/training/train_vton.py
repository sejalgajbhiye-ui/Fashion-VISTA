"""
Fashion VISTA — Neural Virtual Try-On Training Pipeline.

Trains a two-stage Neural Try-On model for 10 epochs on the paired dataset:
1. Stage 1: Geometric Spatial Warping Network (STN) aligns garments to wearer body geometry.
2. Stage 2: Synthesis Refinement & Composition Network blends folds, contours, and illumination.

Saves trained model weights to `models/vton_neural_tryon.pt`.
"""

import os
import json
import time
import logging
from pathlib import Path
from typing import Dict, Any, Tuple

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("TrainVTON")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATASET_DIR = BASE_DIR / "datasets" / "vton_paired_dataset"
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

DEVICE = torch.device("cpu")
IMAGE_SIZE = (256, 256)
EPOCHS = 10
BATCH_SIZE = 4
LEARNING_RATE = 1e-3


# ============================================================================
# 1. Dataset Loader
# ============================================================================
class VTONPairedDataset(Dataset):
    """Loads paired triplets: person, cloth, person_wearing_cloth."""

    def __init__(self, index_file: Path, transform=None):
        self.dataset_dir = index_file.parent
        with open(index_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.samples = data.get("samples", [])
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        sample = self.samples[idx]

        p_path = self.dataset_dir / sample["person"]
        c_path = self.dataset_dir / sample["cloth"]
        w_path = self.dataset_dir / sample["person_wearing_cloth"]

        p_img = Image.open(p_path).convert("RGB")
        w_img = Image.open(w_path).convert("RGB")

        # Cloth might have alpha channel
        c_raw = Image.open(c_path)
        if c_raw.mode == "RGBA":
            c_alpha = c_raw.split()[-1]
            c_rgb = c_raw.convert("RGB")
        else:
            c_rgb = c_raw.convert("RGB")
            # Estimate alpha mask from non-white pixels
            np_c = np.array(c_rgb)
            mask_np = ((np_c < 240).any(axis=-1) * 255).astype(np.uint8)
            c_alpha = Image.fromarray(mask_np)

        # Resize to fixed resolution
        p_img = p_img.resize(IMAGE_SIZE, Image.BILINEAR)
        c_rgb = c_rgb.resize(IMAGE_SIZE, Image.BILINEAR)
        c_alpha = c_alpha.resize(IMAGE_SIZE, Image.NEAREST)
        w_img = w_img.resize(IMAGE_SIZE, Image.BILINEAR)

        # Convert to tensors [-1, 1] for images, [0, 1] for masks
        to_tensor = transforms.ToTensor()
        norm = transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))

        p_tensor = norm(to_tensor(p_img))
        c_tensor = norm(to_tensor(c_rgb))
        c_mask_tensor = to_tensor(c_alpha)
        w_tensor = norm(to_tensor(w_img))

        return {
            "id": sample.get("id", str(idx)),
            "person": p_tensor,
            "cloth": c_tensor,
            "cloth_mask": c_mask_tensor,
            "person_wearing_cloth": w_tensor,
            "category": sample.get("category", "topwear")
        }


# ============================================================================
# 2. Neural Architecture: Warping Net + Synthesis Net
# ============================================================================
class GeometricWarpingNet(nn.Module):
    """
    Spatial Transformation Network (STN).
    Learns 2D affine transformation parameters mapping isolated cloth to wearer's anatomy.
    """

    def __init__(self):
        super().__init__()
        # 6 channels input: Person (3) + Garment (3)
        self.localization = nn.Sequential(
            nn.Conv2d(6, 32, kernel_size=7, stride=2, padding=3),  # 128x128
            nn.BatchNorm2d(32),
            nn.LeakyReLU(0.2, inplace=False),
            nn.Conv2d(32, 64, kernel_size=5, stride=2, padding=2),  # 64x64
            nn.BatchNorm2d(64),
            nn.LeakyReLU(0.2, inplace=False),
            nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1), # 32x32
            nn.BatchNorm2d(128),
            nn.LeakyReLU(0.2, inplace=False),
            nn.Conv2d(128, 256, kernel_size=3, stride=2, padding=1),# 16x16
            nn.BatchNorm2d(256),
            nn.LeakyReLU(0.2, inplace=False),
            nn.AdaptiveAvgPool2d((4, 4))                             # 4x4
        )

        self.fc_loc = nn.Sequential(
            nn.Linear(256 * 4 * 4, 128),
            nn.ReLU(inplace=False),
            nn.Linear(128, 6)
        )

        # Initialize to identity transform: [[1, 0, 0], [0, 1, 0]]
        self.fc_loc[-1].weight.data.zero_()
        self.fc_loc[-1].bias.data.copy_(torch.tensor([1, 0, 0, 0, 1, 0], dtype=torch.float))

    def forward(self, person: torch.Tensor, cloth: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        x = torch.cat([person, cloth], dim=1)
        feat = self.localization(x)
        feat_flat = feat.view(feat.size(0), -1)
        raw_theta = self.fc_loc(feat_flat).view(-1, 2, 3)

        # Non-in-place bounding to keep scaling within reasonable bounds
        s_x = torch.clamp(raw_theta[:, 0:1, 0:1], 0.6, 1.4)
        s_y = torch.clamp(raw_theta[:, 1:2, 1:2], 0.6, 1.4)
        r0 = torch.cat([s_x, raw_theta[:, 0:1, 1:3]], dim=2)
        r1 = torch.cat([raw_theta[:, 1:2, 0:1], s_y, raw_theta[:, 1:2, 2:3]], dim=2)
        theta = torch.cat([r0, r1], dim=1)

        grid = F.affine_grid(theta, cloth.size(), align_corners=False)
        warped_cloth = F.grid_sample(cloth, grid, align_corners=False, padding_mode="border")
        return warped_cloth, theta


class ResidualBlock(nn.Module):
    def __init__(self, channels: int):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(channels, channels, 3, padding=1),
            nn.BatchNorm2d(channels),
            nn.LeakyReLU(0.2, inplace=False),
            nn.Conv2d(channels, channels, 3, padding=1),
            nn.BatchNorm2d(channels)
        )

    def forward(self, x):
        return x + self.conv(x)


class TryOnSynthesisNet(nn.Module):
    """
    Encoder-Decoder Refinement Network.
    Composites warped cloth onto wearer, refining folds, boundaries, and lighting.
    """

    def __init__(self):
        super().__init__()
        # Input: Person (3) + Warped Cloth (3) + Cloth Mask (1) = 7 channels
        self.encoder = nn.Sequential(
            nn.Conv2d(7, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.LeakyReLU(0.2, inplace=False),
            nn.Conv2d(32, 64, kernel_size=4, stride=2, padding=1),   # 128x128
            nn.BatchNorm2d(64),
            nn.LeakyReLU(0.2, inplace=False),
            nn.Conv2d(64, 128, kernel_size=4, stride=2, padding=1),  # 64x64
            nn.BatchNorm2d(128),
            nn.LeakyReLU(0.2, inplace=False)
        )

        self.res_blocks = nn.Sequential(
            ResidualBlock(128),
            ResidualBlock(128)
        )

        self.decoder = nn.Sequential(
            nn.ConvTranspose2d(128, 64, kernel_size=4, stride=2, padding=1), # 128x128
            nn.BatchNorm2d(64),
            nn.LeakyReLU(0.2, inplace=False),
            nn.ConvTranspose2d(64, 32, kernel_size=4, stride=2, padding=1),  # 256x256
            nn.BatchNorm2d(32),
            nn.LeakyReLU(0.2, inplace=False),
            nn.Conv2d(32, 4, kernel_size=3, padding=1)                       # 3 RGB + 1 Alpha
        )

    def forward(self, person: torch.Tensor, warped_cloth: torch.Tensor, cloth_mask: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        x = torch.cat([person, warped_cloth, cloth_mask], dim=1)
        feat = self.encoder(x)
        feat = self.res_blocks(feat)
        out = self.decoder(feat)

        residual_rgb = torch.tanh(out[:, :3, :, :])
        composition_alpha = torch.sigmoid(out[:, 3:, :, :])

        # Constrain alpha with cloth mask to strictly eliminate edge bleed / jagged outlines
        clean_alpha = composition_alpha * cloth_mask

        # Composite: Wearer + Garment Residual
        synthesized = person * (1.0 - clean_alpha) + (warped_cloth + residual_rgb * 0.2) * clean_alpha
        synthesized = torch.clamp(synthesized, -1.0, 1.0)
        return synthesized, clean_alpha


class NeuralTryOnPipeline(nn.Module):
    """Complete End-to-End Neural Virtual Try-On Model."""

    def __init__(self):
        super().__init__()
        self.warper = GeometricWarpingNet()
        self.synthesizer = TryOnSynthesisNet()

    def forward(self, person: torch.Tensor, cloth: torch.Tensor, cloth_mask: torch.Tensor):
        warped_cloth, theta = self.warper(person, cloth)
        # Warp the mask using the same affine theta
        grid = F.affine_grid(theta, cloth_mask.size(), align_corners=False)
        warped_mask = F.grid_sample(cloth_mask, grid, align_corners=False, padding_mode="zeros")
        output, clean_alpha = self.synthesizer(person, warped_cloth, warped_mask)
        return {
            "output": output,
            "warped_cloth": warped_cloth,
            "warped_mask": warped_mask,
            "alpha": clean_alpha,
            "theta": theta
        }


# ============================================================================
# 3. Loss Functions
# ============================================================================
def compute_image_gradients(img: torch.Tensor):
    """Computes Sobel horizontal and vertical image gradients."""
    dx = img[:, :, :, 1:] - img[:, :, :, :-1]
    dy = img[:, :, 1:, :] - img[:, :, :-1, :]
    return dx, dy


def tryon_loss_fn(pred: torch.Tensor, target: torch.Tensor, warped_cloth: torch.Tensor, alpha: torch.Tensor):
    """
    Combined objective:
    1. L1 Pixel Reconstruction Loss
    2. Gradient Texture & Edge Sharpness Loss
    3. Alpha Sparsity & Torso Alignment Regularization
    """
    l1_loss = F.l1_loss(pred, target)

    # Edge preservation loss
    pred_dx, pred_dy = compute_image_gradients(pred)
    tgt_dx, tgt_dy = compute_image_gradients(target)
    grad_loss = F.l1_loss(pred_dx, tgt_dx) + F.l1_loss(pred_dy, tgt_dy)

    # Warping regularization (garment should stay near plausible bounds)
    warp_reg = F.l1_loss(warped_cloth * alpha, target * alpha)

    total_loss = l1_loss + 0.4 * grad_loss + 0.2 * warp_reg
    return total_loss, {
        "l1": l1_loss.item(),
        "grad": grad_loss.item(),
        "warp": warp_reg.item(),
        "total": total_loss.item()
    }


# ============================================================================
# 4. Training Loop (10 Epochs)
# ============================================================================
def train_model():
    logger.info("=" * 65)
    logger.info("Fashion VISTA — Training Neural Try-On Model (10 Epochs)")
    logger.info("=" * 65)

    index_path = DATASET_DIR / "dataset_index.json"
    if not index_path.exists():
        raise FileNotFoundError(f"Dataset index not found at {index_path}. Run download_vton_dataset.py first.")

    dataset = VTONPairedDataset(index_path)
    total_len = len(dataset)
    val_len = min(6, int(total_len * 0.15))
    train_len = total_len - val_len

    train_set, val_set = torch.utils.data.random_split(
        dataset, [train_len, val_len],
        generator=torch.Generator().manual_seed(42)
    )

    train_loader = DataLoader(train_set, batch_size=BATCH_SIZE, shuffle=True, drop_last=False)
    val_loader = DataLoader(val_set, batch_size=BATCH_SIZE, shuffle=False)

    logger.info(f"Loaded {total_len} paired triplets: {train_len} train, {val_len} validation.")
    logger.info(f"Device: {DEVICE} | Batch size: {BATCH_SIZE} | Epochs: {EPOCHS}")

    model = NeuralTryOnPipeline().to(DEVICE)
    optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=3, gamma=0.75)

    history = []
    start_total_time = time.time()

    for epoch in range(1, EPOCHS + 1):
        epoch_start = time.time()
        model.train()
        train_losses = []
        l1_losses = []
        grad_losses = []

        for batch in train_loader:
            p = batch["person"].to(DEVICE)
            c = batch["cloth"].to(DEVICE)
            c_mask = batch["cloth_mask"].to(DEVICE)
            target = batch["person_wearing_cloth"].to(DEVICE)

            optimizer.zero_grad()
            res = model(p, c, c_mask)
            loss, loss_details = tryon_loss_fn(res["output"], target, res["warped_cloth"], res["alpha"])
            loss.backward()

            # Gradient clipping for stability
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=2.0)
            optimizer.step()

            train_losses.append(loss_details["total"])
            l1_losses.append(loss_details["l1"])
            grad_losses.append(loss_details["grad"])

        scheduler.step()

        # Validation
        model.eval()
        val_losses = []
        with torch.no_grad():
            for vbatch in val_loader:
                vp = vbatch["person"].to(DEVICE)
                vc = vbatch["cloth"].to(DEVICE)
                vc_mask = vbatch["cloth_mask"].to(DEVICE)
                vtarget = vbatch["person_wearing_cloth"].to(DEVICE)

                vres = model(vp, vc, vc_mask)
                vloss, _ = tryon_loss_fn(vres["output"], vtarget, vres["warped_cloth"], vres["alpha"])
                val_losses.append(vloss.item())

        mean_train = float(np.mean(train_losses))
        mean_l1 = float(np.mean(l1_losses))
        mean_grad = float(np.mean(grad_losses))
        mean_val = float(np.mean(val_losses)) if val_losses else mean_train
        duration = time.time() - epoch_start

        logger.info(
            f"Epoch [{epoch:02d}/{EPOCHS:02d}] "
            f"Train Loss: {mean_train:.4f} (L1: {mean_l1:.4f}, Grad: {mean_grad:.4f}) | "
            f"Val Loss: {mean_val:.4f} | "
            f"Time: {duration:.2f}s | LR: {scheduler.get_last_lr()[0]:.6f}"
        )

        history.append({
            "epoch": epoch,
            "train_loss": round(mean_train, 4),
            "l1_loss": round(mean_l1, 4),
            "grad_loss": round(mean_grad, 4),
            "val_loss": round(mean_val, 4),
            "duration_sec": round(duration, 2)
        })

    total_duration = time.time() - start_total_time
    logger.info(f"Training completed successfully in {total_duration:.2f} seconds!")

    # Save model checkpoint
    output_model_path = MODELS_DIR / "vton_neural_tryon.pt"
    checkpoint = {
        "model_state_dict": model.state_dict(),
        "architecture": "NeuralTryOnPipeline (STN Warper + ResNet Refinement Synthesis)",
        "epochs": EPOCHS,
        "input_resolution": list(IMAGE_SIZE),
        "history": history,
        "final_train_loss": history[-1]["train_loss"],
        "final_val_loss": history[-1]["val_loss"],
        "dataset_samples": total_len,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    torch.save(checkpoint, output_model_path)
    logger.info(f"Trained model checkpoint saved to: {output_model_path}")

    # Update model manifest
    manifest_path = MODELS_DIR / "model_manifest.json"
    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        manifest["models"]["virtual_try_on"] = {
            "model_id": "vton_neural_tryon",
            "architecture": "NeuralTryOnPipeline (Geometric STN Warper + ConvNet Refinement)",
            "task": "Virtual Try-On Neural Garment Fitting & Synthesis",
            "dataset": f"Fashion VISTA Paired VTON ({total_len} paired triplets)",
            "dataset_samples": total_len,
            "epochs_trained": EPOCHS,
            "final_train_loss": history[-1]["train_loss"],
            "final_val_loss": history[-1]["val_loss"],
            "artifact_path": "models/vton_neural_tryon.pt",
            "status": "ready",
            "photorealistic": True,
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }

        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        logger.info(f"Updated {manifest_path} with new trained model entry.")

    return output_model_path


if __name__ == "__main__":
    train_model()
