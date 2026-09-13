"""
AgriSmart AI — Training Pipeline
Transfer learning with EfficientNet-B0 for crop disease classification.
"""

import os
os.environ["PYTHONUNBUFFERED"] = "1"

import sys
sys.stdout.reconfigure(line_buffering=True) if hasattr(sys.stdout, 'reconfigure') else None

import json
import time
import copy
import argparse
from pathlib import Path
from datetime import datetime

import numpy as np
from PIL import Image

# These will be available after PyTorch CUDA install
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import transforms, datasets, models

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
SPLIT_DIR = PROJECT_ROOT / "data" / "split"
WEIGHTS_DIR = PROJECT_ROOT / "model" / "weights"
ARTIFACTS_DIR = PROJECT_ROOT / "ml" / "artifacts"
CLASS_MAPPING_PATH = ARTIFACTS_DIR / "class_mapping.json"


def get_device():
    """Get the best available device."""
    if torch.cuda.is_available():
        device = torch.device("cuda")
        print(f"[INFO] Using GPU: {torch.cuda.get_device_name(0)}")
        print(f"[INFO] VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    else:
        device = torch.device("cpu")
        print("[WARN] CUDA not available — training on CPU (will be slow)")
    return device


def get_transforms(img_size=224):
    """
    Get train and val/test transforms.
    
    Train augmentation strategy for lab→field generalization:
    - ColorJitter: field photos have variable lighting
    - RandomResizedCrop: field photos have varying distances/angles
    - RandomRotation: leaves can be at any angle
    - GaussianBlur: field photos may be slightly out of focus
    - RandomErasing: simulates occlusion from other leaves/stems
    - RandomHorizontalFlip/VerticalFlip: orientation invariance
    """
    # ImageNet normalization
    mean = [0.485, 0.456, 0.406]
    std = [0.229, 0.224, 0.225]
    
    train_transform = transforms.Compose([
        transforms.RandomResizedCrop(img_size, scale=(0.7, 1.0), ratio=(0.8, 1.2)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.3),
        transforms.RandomRotation(30),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.1),
        transforms.RandomApply([transforms.GaussianBlur(kernel_size=5, sigma=(0.1, 2.0))], p=0.3),
        transforms.ToTensor(),
        transforms.Normalize(mean, std),
        transforms.RandomErasing(p=0.2, scale=(0.02, 0.15)),
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize(int(img_size * 1.15)),  # slight oversize then center crop
        transforms.CenterCrop(img_size),
        transforms.ToTensor(),
        transforms.Normalize(mean, std),
    ])
    
    return train_transform, val_transform


def create_model(num_classes, pretrained=True):
    """
    Create EfficientNet-B0 model with transfer learning.
    
    Strategy:
    - Use pretrained ImageNet weights
    - Replace classifier head for our number of classes
    - Will freeze backbone initially, then unfreeze for fine-tuning
    """
    # EfficientNet-B0: good accuracy/speed tradeoff, fits in 6GB VRAM
    weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
    model = models.efficientnet_b0(weights=weights)
    
    # Replace classifier
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, num_classes),
    )
    
    return model


def get_class_weights(dataset):
    """Compute class weights for imbalanced dataset handling."""
    targets = []
    for _, label in dataset.samples:
        targets.append(label)
    
    class_counts = np.bincount(targets)
    total = len(targets)
    
    # Inverse frequency weighting
    class_weights = total / (len(class_counts) * class_counts.astype(float))
    
    # Also compute sample weights for WeightedRandomSampler
    sample_weights = [class_weights[t] for t in targets]
    
    return torch.FloatTensor(class_weights), sample_weights


def train_one_epoch(model, dataloader, criterion, optimizer, device, scaler=None):
    """Train for one epoch with optional mixed precision."""
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    
    for batch_idx, (images, labels) in enumerate(dataloader):
        images, labels = images.to(device), labels.to(device)
        
        optimizer.zero_grad()
        
        if scaler is not None:
            with torch.amp.autocast('cuda'):
                outputs = model(images)
                loss = criterion(outputs, labels)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
        else:
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
        
        running_loss += loss.item() * images.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()
        
        if (batch_idx + 1) % 50 == 0:
            print(f"    Batch {batch_idx + 1}: loss={loss.item():.4f}")
    
    epoch_loss = running_loss / total
    epoch_acc = correct / total
    return epoch_loss, epoch_acc


def validate(model, dataloader, criterion, device):
    """Validate the model."""
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    all_preds = []
    all_labels = []
    
    with torch.no_grad():
        for images, labels in dataloader:
            images, labels = images.to(device), labels.to(device)
            
            with torch.amp.autocast('cuda') if device.type == 'cuda' else torch.no_grad():
                outputs = model(images)
                loss = criterion(outputs, labels)
            
            running_loss += loss.item() * images.size(0)
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
            
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
    
    epoch_loss = running_loss / total
    epoch_acc = correct / total
    return epoch_loss, epoch_acc, np.array(all_preds), np.array(all_labels)


def freeze_backbone(model):
    """Freeze all layers except the classifier."""
    for param in model.features.parameters():
        param.requires_grad = False
    print("[INFO] Backbone frozen — training classifier head only")


def unfreeze_backbone(model):
    """Unfreeze all layers for fine-tuning."""
    for param in model.parameters():
        param.requires_grad = True
    print("[INFO] Backbone unfrozen — fine-tuning all layers")


def train(args):
    """Main training loop."""
    print("=" * 70)
    print("AGRISMART AI — MODEL TRAINING")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    device = get_device()
    
    # Load class mapping
    with open(CLASS_MAPPING_PATH) as f:
        class_mapping = json.load(f)
    num_classes = class_mapping["num_classes"]
    print(f"\n[INFO] Number of classes: {num_classes}")
    
    # Create transforms
    train_transform, val_transform = get_transforms(args.img_size)
    
    # Load datasets
    print("\n[INFO] Loading datasets...")
    train_dir = SPLIT_DIR / "train"
    val_dir = SPLIT_DIR / "val"
    
    if not train_dir.exists():
        print(f"[ERROR] Training directory not found: {train_dir}")
        print("[INFO] Run data_prep.py first.")
        sys.exit(1)
    
    train_dataset = datasets.ImageFolder(train_dir, transform=train_transform)
    val_dataset = datasets.ImageFolder(val_dir, transform=val_transform)
    
    print(f"[INFO] Training samples: {len(train_dataset)}")
    print(f"[INFO] Validation samples: {len(val_dataset)}")
    
    # Verify class mapping consistency
    actual_classes = train_dataset.classes
    print(f"[INFO] Dataset classes: {len(actual_classes)}")
    
    # Save the actual class-to-index mapping from the dataset
    actual_mapping = {
        "class_to_idx": train_dataset.class_to_idx,
        "idx_to_class": {str(v): k for k, v in train_dataset.class_to_idx.items()},
        "num_classes": len(train_dataset.classes),
        "classes": train_dataset.classes,
    }
    with open(CLASS_MAPPING_PATH, "w") as f:
        json.dump(actual_mapping, f, indent=2)
    num_classes = actual_mapping["num_classes"]
    
    # Handle class imbalance
    print("\n[INFO] Computing class weights for imbalanced classes...")
    class_weights, sample_weights = get_class_weights(train_dataset)
    
    # Use WeightedRandomSampler for balanced batches
    sampler = WeightedRandomSampler(
        weights=sample_weights,
        num_samples=len(sample_weights),
        replacement=True
    )
    
    # DataLoaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        sampler=sampler,
        num_workers=args.num_workers,
        pin_memory=True if device.type == 'cuda' else False,
        drop_last=True,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        pin_memory=True if device.type == 'cuda' else False,
    )
    
    # Create model
    print(f"\n[INFO] Creating EfficientNet-B0 model (pretrained={args.pretrained})...")
    model = create_model(num_classes, pretrained=args.pretrained)
    model = model.to(device)
    
    # Loss function with class weights
    criterion = nn.CrossEntropyLoss(weight=class_weights.to(device))
    
    # Mixed precision scaler
    scaler = torch.amp.GradScaler('cuda') if device.type == 'cuda' and args.mixed_precision else None
    if scaler:
        print("[INFO] Mixed precision (FP16) enabled")
    
    # Training phases
    # Phase 1: Frozen backbone (train classifier head only)
    # Phase 2: Unfrozen (fine-tune entire model)
    
    best_val_f1 = 0.0
    best_model_state = None
    history = {"train_loss": [], "val_loss": [], "train_acc": [], "val_acc": [], "val_f1": []}
    patience_counter = 0
    
    total_epochs = args.epochs_frozen + args.epochs_unfrozen
    
    for epoch in range(total_epochs):
        epoch_start = time.time()
        
        # Phase management
        if epoch == 0:
            freeze_backbone(model)
            optimizer = optim.Adam(
                filter(lambda p: p.requires_grad, model.parameters()),
                lr=args.lr_frozen,
                weight_decay=1e-4
            )
            scheduler = optim.lr_scheduler.CosineAnnealingLR(
                optimizer, T_max=args.epochs_frozen
            )
            print(f"\n{'='*50}")
            print(f"PHASE 1: Training classifier head (epochs 1-{args.epochs_frozen})")
            print(f"Learning rate: {args.lr_frozen}")
            print(f"{'='*50}")
        
        elif epoch == args.epochs_frozen:
            unfreeze_backbone(model)
            optimizer = optim.Adam(
                model.parameters(),
                lr=args.lr_unfrozen,
                weight_decay=1e-4
            )
            scheduler = optim.lr_scheduler.CosineAnnealingLR(
                optimizer, T_max=args.epochs_unfrozen
            )
            patience_counter = 0  # Reset patience for phase 2
            print(f"\n{'='*50}")
            print(f"PHASE 2: Fine-tuning all layers (epochs {args.epochs_frozen+1}-{total_epochs})")
            print(f"Learning rate: {args.lr_unfrozen}")
            print(f"{'='*50}")
        
        print(f"\n--- Epoch {epoch + 1}/{total_epochs} ---")
        
        # Train
        train_loss, train_acc = train_one_epoch(
            model, train_loader, criterion, optimizer, device, scaler
        )
        
        # Validate
        val_loss, val_acc, val_preds, val_labels = validate(
            model, val_loader, criterion, device
        )
        
        # Compute macro-F1
        from sklearn.metrics import f1_score
        val_f1 = f1_score(val_labels, val_preds, average='macro', zero_division=0)
        
        scheduler.step()
        
        epoch_time = time.time() - epoch_start
        
        # Log
        current_lr = optimizer.param_groups[0]['lr']
        print(f"  Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.4f}")
        print(f"  Val   Loss: {val_loss:.4f} | Val Acc:   {val_acc:.4f} | Val F1: {val_f1:.4f}")
        print(f"  LR: {current_lr:.6f} | Time: {epoch_time:.1f}s")
        
        # Track history
        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        history["train_acc"].append(train_acc)
        history["val_acc"].append(val_acc)
        history["val_f1"].append(val_f1)
        
        # Save best model (by macro-F1)
        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            best_model_state = copy.deepcopy(model.state_dict())
            patience_counter = 0
            print(f"  ★ New best model! F1={val_f1:.4f}")
            
            # Save checkpoint
            WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
            checkpoint = {
                "model_state_dict": best_model_state,
                "num_classes": num_classes,
                "class_mapping": actual_mapping,
                "epoch": epoch + 1,
                "val_f1": val_f1,
                "val_acc": val_acc,
                "img_size": args.img_size,
                "architecture": "efficientnet_b0",
            }
            torch.save(checkpoint, WEIGHTS_DIR / "best_model.pth")
            print(f"  ✓ Checkpoint saved to {WEIGHTS_DIR / 'best_model.pth'}")
        else:
            patience_counter += 1
            if patience_counter >= args.patience and epoch >= args.epochs_frozen:
                print(f"\n[INFO] Early stopping triggered (patience={args.patience})")
                break
    
    # Save training history
    history_path = ARTIFACTS_DIR / "training_history.json"
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(history_path, "w") as f:
        json.dump(history, f, indent=2)
    
    # Plot training history
    try:
        _plot_training_history(history, ARTIFACTS_DIR / "training_history.png")
    except Exception as e:
        print(f"[WARN] Could not plot training history: {e}")
    
    print(f"\n{'='*70}")
    print(f"TRAINING COMPLETE")
    print(f"Best validation macro-F1: {best_val_f1:.4f}")
    print(f"Model saved to: {WEIGHTS_DIR / 'best_model.pth'}")
    print(f"{'='*70}")
    
    return best_val_f1


def _plot_training_history(history, save_path):
    """Plot training curves."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    
    epochs = range(1, len(history["train_loss"]) + 1)
    
    # Loss
    axes[0].plot(epochs, history["train_loss"], label="Train")
    axes[0].plot(epochs, history["val_loss"], label="Val")
    axes[0].set_title("Loss")
    axes[0].set_xlabel("Epoch")
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)
    
    # Accuracy
    axes[1].plot(epochs, history["train_acc"], label="Train")
    axes[1].plot(epochs, history["val_acc"], label="Val")
    axes[1].set_title("Accuracy")
    axes[1].set_xlabel("Epoch")
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)
    
    # F1
    axes[2].plot(epochs, history["val_f1"], label="Val Macro-F1", color="green")
    axes[2].set_title("Validation Macro-F1")
    axes[2].set_xlabel("Epoch")
    axes[2].legend()
    axes[2].grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"[INFO] Training history plot saved to {save_path}")


def parse_args():
    parser = argparse.ArgumentParser(description="AgriSmart AI — Train crop disease classifier")
    parser.add_argument("--img-size", type=int, default=224, help="Input image size")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--epochs-frozen", type=int, default=3, help="Epochs with frozen backbone")
    parser.add_argument("--epochs-unfrozen", type=int, default=12, help="Epochs with unfrozen backbone")
    parser.add_argument("--lr-frozen", type=float, default=1e-3, help="LR for frozen phase")
    parser.add_argument("--lr-unfrozen", type=float, default=1e-4, help="LR for fine-tuning phase")
    parser.add_argument("--patience", type=int, default=5, help="Early stopping patience")
    parser.add_argument("--num-workers", type=int, default=4, help="DataLoader workers")
    parser.add_argument("--pretrained", action="store_true", default=True, help="Use pretrained weights")
    parser.add_argument("--mixed-precision", action="store_true", default=True, help="Use mixed precision (FP16)")
    parser.add_argument("--no-mixed-precision", dest="mixed_precision", action="store_false")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    train(args)
