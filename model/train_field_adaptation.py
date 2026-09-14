"""
AgriSmart AI — Field-Domain Model Adaptation Pipeline
Trains an experimental EfficientNet-B0 candidate on combined:
  70% PlantVillage foundational data + 30% compatible PlantDoc field data.

Key Principles:
1. Strict Model Isolation: Saves ONLY to model/weights/field_adapted_model.pth.
   Production model/weights/best_model.pth remains FROZEN and UNTOUCHED.
2. Controlled Sampling: Uses WeightedRandomSampler to ensure field-domain data
   maintains ~30% effective sample weight per epoch and is not swamped by PV.
3. Class Alignment via MappedImageFolder: All 24 field classes are mapped directly
   into the global 33-class target space, preventing alphabetical offset bugs.
4. Realistic Smartphone Augmentation: Simulates field lighting, blur, and occlusions
   without altering disease morphology.
5. Strict Split Discipline: Evaluated against field validation + PV validation.
   Locked field test set is STRICTLY UNTOUCHED until one-time final evaluation.
"""

import os
os.environ["PYTHONUNBUFFERED"] = "1"

import sys
import json
import time
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchvision import transforms, models
from PIL import Image

PROJECT_ROOT = Path(__file__).parent.parent
PV_SPLIT_DIR = PROJECT_ROOT / "data" / "split"
FIELD_SPLIT_DIR = PROJECT_ROOT / "data" / "field_split"
WEIGHTS_DIR = PROJECT_ROOT / "model" / "weights"
ARTIFACTS_DIR = PROJECT_ROOT / "ml" / "artifacts"
CLASS_MAPPING_PATH = ARTIFACTS_DIR / "class_mapping.json"
OUTPUT_CHECKPOINT = WEIGHTS_DIR / "field_adapted_model.pth"


class MappedImageFolder(Dataset):
    """
    Dataset loader that maps folder names directly to the global 33-class indices.
    Prevents alphabetical indexing corruption when fewer than 33 classes are present.
    """
    def __init__(self, root_dir: Path, class_to_idx: Dict[str, int], transform=None):
        self.transform = transform
        self.samples = []
        root = Path(root_dir)
        for class_dir in sorted(root.iterdir()):
            if class_dir.is_dir() and class_dir.name in class_to_idx:
                target_idx = class_to_idx[class_dir.name]
                for img_path in sorted(class_dir.glob("*.*")):
                    if img_path.suffix.lower() in [".jpg", ".jpeg", ".png", ".bmp"]:
                        self.samples.append((str(img_path), target_idx))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, target = self.samples[idx]
        img = Image.open(path).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, target


class MixedDataset(Dataset):
    """
    Combines PlantVillage foundational dataset and Field-domain dataset
    with metadata tags tracking image domain origin.
    """
    def __init__(self, pv_dataset, field_dataset, field_weight=0.30):
        self.pv_dataset = pv_dataset
        self.field_dataset = field_dataset
        self.pv_len = len(pv_dataset) if pv_dataset else 0
        self.field_len = len(field_dataset) if field_dataset else 0
        self.total_len = self.pv_len + self.field_len
        self.field_weight = field_weight

    def __len__(self):
        return self.total_len

    def __getitem__(self, idx):
        if idx < self.pv_len:
            img, label = self.pv_dataset[idx]
            is_field = 0
        else:
            img, label = self.field_dataset[idx - self.pv_len]
            is_field = 1
        return img, label, is_field

    def get_sampler_weights(self):
        """Compute sample weights to achieve desired domain mix ratio."""
        pv_weight = (1.0 - self.field_weight) / max(1, self.pv_len)
        field_weight = self.field_weight / max(1, self.field_len)

        weights = [pv_weight] * self.pv_len + [field_weight] * self.field_len
        return torch.DoubleTensor(weights)


def get_field_transforms(img_size=224):
    """
    Tailored augmentation for farmer smartphone photographs:
    - ColorJitter: outdoor sunlight, overcast, shadows
    - RandomResizedCrop: distance, framing, angle
    - GaussianBlur: mobile lens autofocus softness
    - RandomRotation & Flip: handheld phone orientation
    - RandomErasing: occlusions from stems, soil, adjacent leaves
    """
    mean = [0.485, 0.456, 0.406]
    std = [0.229, 0.224, 0.225]

    train_transform = transforms.Compose([
        transforms.RandomResizedCrop(img_size, scale=(0.70, 1.0), ratio=(0.80, 1.25)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.2),
        transforms.RandomRotation(20),
        transforms.ColorJitter(brightness=0.30, contrast=0.30, saturation=0.25, hue=0.06),
        transforms.RandomApply([transforms.GaussianBlur(kernel_size=5, sigma=(0.1, 1.2))], p=0.30),
        transforms.ToTensor(),
        transforms.Normalize(mean, std),
        transforms.RandomErasing(p=0.15, scale=(0.02, 0.10)),
    ])

    eval_transform = transforms.Compose([
        transforms.Resize(int(img_size * 1.15)),
        transforms.CenterCrop(img_size),
        transforms.ToTensor(),
        transforms.Normalize(mean, std),
    ])

    return train_transform, eval_transform


def create_candidate_model(num_classes, init_weights_path=None):
    """Create EfficientNet-B0 model initialized from validated baseline."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, num_classes),
    )

    if init_weights_path and Path(init_weights_path).exists():
        print(f"[INIT] Transfer learning from validated baseline: {init_weights_path}")
        ckpt = torch.load(init_weights_path, map_location=device, weights_only=False)
        model.load_state_dict(ckpt["model_state_dict"])
    else:
        print("[INIT] Initializing with default ImageNet pretrained weights")
        model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.3, inplace=True),
            nn.Linear(in_features, num_classes),
        )

    return model.to(device)


def train_field_adaptation(
    epochs=10,
    batch_size=32,
    field_mix_ratio=0.30,
    lr=1e-4,
    init_weights="model/weights/best_model.pth",
):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("=" * 70)
    print("  AGRISMART AI — FIELD-DOMAIN CONTROLLED TRAINING EXPERIMENT")
    print(f"  Device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}")
    print(f"  Field Mix Ratio: {field_mix_ratio * 100:.1f}%")
    print(f"  Output Checkpoint: {OUTPUT_CHECKPOINT}")
    print("=" * 70)

    # 1. Load class mapping
    with open(CLASS_MAPPING_PATH) as f:
        mapping = json.load(f)
    class_to_idx = mapping["class_to_idx"]
    idx_to_class = {int(k): v for k, v in mapping["idx_to_class"].items()}
    num_classes = len(class_to_idx)

    train_tf, eval_tf = get_field_transforms(224)

    # 2. Datasets via MappedImageFolder
    pv_train_dir = PV_SPLIT_DIR / "train"
    field_train_dir = FIELD_SPLIT_DIR / "train"
    pv_train_ds = MappedImageFolder(pv_train_dir, class_to_idx, transform=train_tf) if pv_train_dir.exists() else None
    field_train_ds = MappedImageFolder(field_train_dir, class_to_idx, transform=train_tf) if field_train_dir.exists() else None

    print(f"[DATA] PlantVillage Train Samples: {len(pv_train_ds) if pv_train_ds else 0}")
    print(f"[DATA] Field Train Samples:        {len(field_train_ds) if field_train_ds else 0}")

    # Combine datasets
    mixed_train = MixedDataset(pv_train_ds, field_train_ds, field_weight=field_mix_ratio)
    sampler_weights = mixed_train.get_sampler_weights()
    sampler = WeightedRandomSampler(sampler_weights, num_samples=len(mixed_train), replacement=True)

    train_loader = DataLoader(
        mixed_train,
        batch_size=batch_size,
        sampler=sampler,
        num_workers=2,
        pin_memory=True,
    )

    # Validation datasets (Mapped)
    field_val_dir = FIELD_SPLIT_DIR / "val"
    field_val_loader = None
    if field_val_dir.exists():
        field_val_ds = MappedImageFolder(field_val_dir, class_to_idx, transform=eval_tf)
        field_val_loader = DataLoader(field_val_ds, batch_size=batch_size, shuffle=False, num_workers=2)

    pv_val_dir = PV_SPLIT_DIR / "val"
    pv_val_loader = None
    if pv_val_dir.exists():
        pv_val_ds = MappedImageFolder(pv_val_dir, class_to_idx, transform=eval_tf)
        pv_val_loader = DataLoader(pv_val_ds, batch_size=batch_size, shuffle=False, num_workers=2)

    # 3. Model & Optimizer
    model = create_candidate_model(num_classes, init_weights_path=init_weights)

    # Differential learning rate: slightly lower for backbone, higher for head
    backbone_params = [p for n, p in model.named_parameters() if "classifier" not in n]
    classifier_params = [p for n, p in model.named_parameters() if "classifier" in n]

    optimizer = optim.AdamW([
        {"params": backbone_params, "lr": lr * 0.5},
        {"params": classifier_params, "lr": lr * 1.5},
    ], weight_decay=1e-4)

    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.05)

    # 4. Training Loop
    best_val_score = 0.0
    best_state = None
    history = []
    start_time = time.time()
    peak_vram_mb = 0.0

    print(f"\n[TRAINING] Starting {epochs} epochs of field adaptation...")
    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        field_count_in_epoch = 0

        for images, labels, is_field in train_loader:
            images = images.to(device)
            labels = labels.to(device)
            field_count_in_epoch += is_field.sum().item()

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * images.size(0)
            preds = outputs.argmax(dim=1)
            train_correct += (preds == labels).sum().item()
            train_total += images.size(0)

        scheduler.step()

        train_loss = train_loss / train_total
        train_acc = train_correct / train_total
        actual_field_ratio = field_count_in_epoch / train_total

        # Validation
        model.eval()
        field_val_acc = 0.0
        if field_val_loader:
            f_correct, f_total = 0, 0
            with torch.no_grad():
                for imgs, lbls in field_val_loader:
                    imgs, lbls = imgs.to(device), lbls.to(device)
                    f_correct += (model(imgs).argmax(dim=1) == lbls).sum().item()
                    f_total += imgs.size(0)
            field_val_acc = f_correct / max(1, f_total)

        pv_val_acc = 0.0
        if pv_val_loader:
            p_correct, p_total = 0, 0
            with torch.no_grad():
                for imgs, lbls in pv_val_loader:
                    imgs, lbls = imgs.to(device), lbls.to(device)
                    p_correct += (model(imgs).argmax(dim=1) == lbls).sum().item()
                    p_total += imgs.size(0)
            pv_val_acc = p_correct / max(1, p_total)

        # Combined validation score: 50% PV Val + 50% Field Val
        combined_score = 0.5 * pv_val_acc + 0.5 * field_val_acc

        if torch.cuda.is_available():
            mem = torch.cuda.max_memory_allocated() / (1024 * 1024)
            peak_vram_mb = max(peak_vram_mb, mem)

        print(
            f"Epoch {epoch:2d}/{epochs:2d} | "
            f"Loss: {train_loss:.4f} | Acc: {train_acc*100:.1f}% | "
            f"Field Mix: {actual_field_ratio*100:.1f}% | "
            f"PV Val: {pv_val_acc*100:.2f}% | Field Val: {field_val_acc*100:.2f}% | "
            f"Score: {combined_score*100:.2f}%"
        )

        history.append({
            "epoch": epoch,
            "train_loss": train_loss,
            "train_acc": train_acc,
            "actual_field_mix": actual_field_ratio,
            "pv_val_acc": pv_val_acc,
            "field_val_acc": field_val_acc,
            "combined_score": combined_score,
        })

        if combined_score > best_val_score:
            best_val_score = combined_score
            best_state = {
                "model_state_dict": {k: v.cpu() for k, v in model.state_dict().items()},
                "epoch": epoch,
                "val_score": combined_score,
                "field_val_acc": field_val_acc,
                "pv_val_acc": pv_val_acc,
                "num_classes": num_classes,
                "img_size": 224,
                "field_mix_ratio": field_mix_ratio,
                "timestamp": datetime.now().isoformat(),
                "class_mapping": mapping,
            }

    # 5. Save Model B checkpoint safely
    OUTPUT_CHECKPOINT.parent.mkdir(parents=True, exist_ok=True)
    torch.save(best_state, OUTPUT_CHECKPOINT)
    total_time_s = time.time() - start_time

    # Compute SHA-256 of candidate model
    import hashlib
    h = hashlib.sha256(open(OUTPUT_CHECKPOINT, "rb").read()).hexdigest().upper()

    print("\n" + "=" * 70)
    print("  TRAINING COMPLETED SUCCESSFULLY")
    print(f"  Saved Checkpoint: {OUTPUT_CHECKPOINT}")
    print(f"  Model B SHA-256:  {h}")
    print(f"  Best Epoch:       {best_state['epoch']} (Score: {best_val_score*100:.2f}%)")
    print(f"  Field Val Acc:    {best_state['field_val_acc']*100:.2f}%")
    print(f"  PV Val Acc:       {best_state['pv_val_acc']*100:.2f}%")
    print(f"  Total Runtime:    {total_time_s / 60:.1f} minutes")
    print(f"  Peak GPU VRAM:    {peak_vram_mb:.1f} MB")
    print("=" * 70)

    # Save training record
    record = {
        "output_checkpoint": str(OUTPUT_CHECKPOINT),
        "sha256": h,
        "best_epoch": best_state["epoch"],
        "best_val_score": best_val_score,
        "best_field_val_acc": best_state["field_val_acc"],
        "best_pv_val_acc": best_state["pv_val_acc"],
        "runtime_seconds": round(total_time_s, 2),
        "peak_vram_mb": round(peak_vram_mb, 2),
        "history": history,
    }
    with open(ARTIFACTS_DIR / "field_adaptation_training_record.json", "w") as f:
        json.dump(record, f, indent=2)

    return record


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--mix_ratio", type=float, default=0.30)
    parser.add_argument("--lr", type=float, default=1e-4)
    args = parser.parse_args()

    train_field_adaptation(
        epochs=args.epochs,
        batch_size=args.batch_size,
        field_mix_ratio=args.mix_ratio,
        lr=args.lr,
    )
