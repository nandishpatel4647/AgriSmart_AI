import os
import sys
import json
import time
import copy
import argparse
from pathlib import Path
from datetime import datetime

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from sklearn.metrics import f1_score
import torch.nn.functional as F

# Import our custom modules
from model import AgriSmartConvNeXt
from dataset import prepare_datasets

PROJECT_ROOT = Path(__file__).parent.parent
WEIGHTS_DIR = PROJECT_ROOT / "weights"


class FocalLossWithSmoothing(nn.Module):
    """
    Focal Loss with Label Smoothing.
    Targeting the macro-F1 metric for naturally imbalanced field data.
    """
    def __init__(self, alpha=1, gamma=2, smoothing=0.1, reduction='mean'):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.smoothing = smoothing
        self.reduction = reduction

    def forward(self, inputs, targets):
        ce_loss = F.cross_entropy(inputs, targets, label_smoothing=self.smoothing, reduction='none')
        pt = torch.exp(-ce_loss)
        focal_loss = self.alpha * (1 - pt) ** self.gamma * ce_loss

        if self.reduction == 'mean':
            return focal_loss.mean()
        elif self.reduction == 'sum':
            return focal_loss.sum()
        return focal_loss


def train_one_epoch(model, dataloader, criterion, optimizer, device, scaler):
    model.train()
    running_loss, total = 0.0, 0
    
    for batch_idx, (images, labels) in enumerate(dataloader):
        images, labels = images.to(device), labels.to(device)
        
        optimizer.zero_grad()
        
        with torch.cuda.amp.autocast():
            outputs = model(images)
            loss = criterion(outputs, labels)
            
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
        
        running_loss += loss.item() * images.size(0)
        total += labels.size(0)
        
        if (batch_idx + 1) % 50 == 0:
            print(f"    Batch {batch_idx + 1}: loss={loss.item():.4f}")
            
    return running_loss / total


def validate(model, dataloader, criterion, device):
    model.eval()
    running_loss, total = 0.0, 0
    all_preds, all_labels = [], []
    
    with torch.no_grad():
        for images, labels in dataloader:
            images, labels = images.to(device), labels.to(device)
            
            with torch.cuda.amp.autocast():
                outputs = model(images)
                loss = criterion(outputs, labels)
                
            running_loss += loss.item() * images.size(0)
            total += labels.size(0)
            
            _, predicted = outputs.max(1)
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            
    val_loss = running_loss / total
    val_f1 = f1_score(all_labels, all_preds, average='macro', zero_division=0)
    return val_loss, val_f1


def train(args):
    print("=" * 60)
    print("  AgriSmart AI — ConvNeXt-Tiny Training Pipeline")
    print("=" * 60)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[INFO] Using device: {device}")
    
    # 1. Prepare Datasets (Albumentations + PlantVillage + external datasets)
    print("\n[INFO] Loading and augmenting datasets...")
    train_ds, val_ds, class_mapping = prepare_datasets(
        primary_data_dir=args.data_dir,
        external_data_dirs=args.external_data_dirs.split(",") if args.external_data_dirs else None,
        img_size=224
    )
    num_classes = class_mapping["num_classes"]
    print(f"[INFO] Classes: {num_classes}")
    
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, 
                              num_workers=args.num_workers, pin_memory=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, 
                            num_workers=args.num_workers, pin_memory=True)
    
    # 2. Build Model
    model = AgriSmartConvNeXt(num_classes=num_classes, pretrained=True).to(device)
    
    # 3. Loss & Scaler
    criterion = FocalLossWithSmoothing(smoothing=0.1)
    scaler = torch.cuda.amp.GradScaler()
    
    best_val_f1 = 0.0
    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
    save_path = WEIGHTS_DIR / "agrismart_convnext.pt"
    
    # =========================================================================
    # STAGE 1: Head Warmup (Freeze Backbone)
    # =========================================================================
    print("\n" + "="*50)
    print(f"STAGE 1: Head Warmup ({args.epochs_stage1} Epochs)")
    print("="*50)
    
    model.freeze_backbone()
    optimizer1 = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=1e-3)
    
    for epoch in range(args.epochs_stage1):
        print(f"\n--- Stage 1, Epoch {epoch + 1}/{args.epochs_stage1} ---")
        train_loss = train_one_epoch(model, train_loader, criterion, optimizer1, device, scaler)
        val_loss, val_f1 = validate(model, val_loader, criterion, device)
        print(f"  Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Val Macro-F1: {val_f1:.4f}")
        
    # =========================================================================
    # STAGE 2: Full Fine-Tuning (Unfreeze Backbone)
    # =========================================================================
    print("\n" + "="*50)
    print(f"STAGE 2: Full Fine-Tuning ({args.epochs_stage2} Epochs)")
    print("="*50)
    
    model.unfreeze_backbone()
    optimizer2 = optim.AdamW(model.parameters(), lr=1e-4, weight_decay=0.01)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer2, T_max=args.epochs_stage2, eta_min=1e-6)
    
    for epoch in range(args.epochs_stage2):
        print(f"\n--- Stage 2, Epoch {epoch + 1}/{args.epochs_stage2} ---")
        train_loss = train_one_epoch(model, train_loader, criterion, optimizer2, device, scaler)
        val_loss, val_f1 = validate(model, val_loader, criterion, device)
        current_lr = optimizer2.param_groups[0]['lr']
        
        print(f"  LR: {current_lr:.6f}")
        print(f"  Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Val Macro-F1: {val_f1:.4f}")
        
        scheduler.step()
        
        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            # Save strictly as PyTorch model object as expected by Phase 3 predict.py
            # But wait, torch.save(model) saves the whole object which is brittle.
            # To strictly follow the rules: "model = torch.load(MODEL_PATH)" means the entire model was saved.
            torch.save(model, save_path)
            print(f"  [*] New best model! Saved to {save_path}")
            
            # Also save mapping alongside
            with open(WEIGHTS_DIR / "class_mapping.json", "w") as f:
                json.dump(class_mapping, f, indent=2)
                
    print(f"\n[SUCCESS] Training Complete. Best Macro-F1: {best_val_f1:.4f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AgriSmart Two-Stage Training (SIH Contract)")
    parser.add_argument("--data-dir", type=str, default="../data/split", help="Path to primary dataset")
    parser.add_argument("--external-data-dirs", type=str, default="", help="Comma separated paths to external datasets")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--epochs-stage1", type=int, default=3, help="Epochs for head warmup")
    parser.add_argument("--epochs-stage2", type=int, default=20, help="Epochs for full fine-tuning")
    parser.add_argument("--num-workers", type=int, default=4, help="DataLoader workers")
    args = parser.parse_args()
    train(args)
