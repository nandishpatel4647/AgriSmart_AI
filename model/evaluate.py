"""
AgriSmart AI — Model Evaluation
Computes macro-F1, confusion matrix, per-class precision/recall from real model runs.
"""

import json
import argparse
import numpy as np
from pathlib import Path

import torch
from torch.utils.data import DataLoader
from torchvision import transforms, datasets
from sklearn.metrics import (
    classification_report, confusion_matrix, f1_score,
    precision_recall_fscore_support, accuracy_score
)

PROJECT_ROOT = Path(__file__).parent.parent
SPLIT_DIR = PROJECT_ROOT / "data" / "split"
WEIGHTS_DIR = PROJECT_ROOT / "model" / "weights"
ARTIFACTS_DIR = PROJECT_ROOT / "ml" / "artifacts"
REPORT_DIR = PROJECT_ROOT / "report"


def load_model(weights_path, device):
    """Load trained model from checkpoint."""
    from train import create_model
    
    checkpoint = torch.load(weights_path, map_location=device, weights_only=False)
    num_classes = checkpoint["num_classes"]
    
    model = create_model(num_classes, pretrained=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model = model.to(device)
    model.eval()
    
    return model, checkpoint


def evaluate_split(model, data_dir, img_size, batch_size, device, num_workers=2):
    """Run evaluation on a data split."""
    mean = [0.485, 0.456, 0.406]
    std = [0.229, 0.224, 0.225]
    
    transform = transforms.Compose([
        transforms.Resize(int(img_size * 1.15)),
        transforms.CenterCrop(img_size),
        transforms.ToTensor(),
        transforms.Normalize(mean, std),
    ])
    
    dataset = datasets.ImageFolder(data_dir, transform=transform)
    loader = DataLoader(
        dataset, batch_size=batch_size, shuffle=False,
        num_workers=num_workers, pin_memory=True if device.type == 'cuda' else False
    )
    
    all_preds = []
    all_labels = []
    all_probs = []
    
    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device)
            
            if device.type == 'cuda':
                with torch.amp.autocast('cuda'):
                    outputs = model(images)
            else:
                outputs = model(images)
            
            probs = torch.softmax(outputs, dim=1)
            _, predicted = outputs.max(1)
            
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            all_probs.extend(probs.cpu().numpy())
    
    return np.array(all_preds), np.array(all_labels), np.array(all_probs), dataset.classes


def generate_evaluation_report(preds, labels, probs, class_names, split_name="validation"):
    """Generate comprehensive evaluation report with real metrics."""
    
    # Core metrics
    macro_f1 = f1_score(labels, preds, average='macro', zero_division=0)
    accuracy = accuracy_score(labels, preds)
    precision, recall, f1, support = precision_recall_fscore_support(
        labels, preds, average=None, zero_division=0
    )
    
    # Classification report
    class_report = classification_report(
        labels, preds, target_names=class_names, zero_division=0
    )
    
    # Confusion matrix
    cm = confusion_matrix(labels, preds)
    
    # Print results
    print("\n" + "=" * 70)
    print(f"EVALUATION RESULTS ({split_name} split)")
    print("=" * 70)
    print(f"\nMacro-F1 (PRIMARY METRIC): {macro_f1:.4f}")
    print(f"Accuracy (supplementary):  {accuracy:.4f}")
    print(f"\n{class_report}")
    
    # Save metrics JSON
    metrics = {
        "split": split_name,
        "note": f"These are LOCAL {split_name} results. NOT official held-out test results.",
        "macro_f1": round(float(macro_f1), 4),
        "accuracy": round(float(accuracy), 4),
        "per_class": {}
    }
    
    for i, cls_name in enumerate(class_names):
        metrics["per_class"][cls_name] = {
            "precision": round(float(precision[i]), 4),
            "recall": round(float(recall[i]), 4),
            "f1": round(float(f1[i]), 4),
            "support": int(support[i]),
        }
    
    # Save artifacts
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Metrics JSON
    metrics_path = ARTIFACTS_DIR / "metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"\n[INFO] Metrics saved to {metrics_path}")
    
    # Also save to report dir
    with open(REPORT_DIR / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    
    # Classification report text
    report_path = ARTIFACTS_DIR / "classification_report.txt"
    with open(report_path, "w") as f:
        f.write(f"AgriSmart AI — Classification Report\n")
        f.write(f"Split: {split_name}\n")
        f.write(f"NOTE: These are LOCAL {split_name} results.\n")
        f.write(f"{'='*70}\n\n")
        f.write(f"Macro-F1 (PRIMARY): {macro_f1:.4f}\n")
        f.write(f"Accuracy:           {accuracy:.4f}\n\n")
        f.write(class_report)
    print(f"[INFO] Classification report saved to {report_path}")
    
    # Confusion matrix
    cm_path = ARTIFACTS_DIR / "confusion_matrix.json"
    with open(cm_path, "w") as f:
        json.dump({
            "matrix": cm.tolist(),
            "classes": class_names,
        }, f, indent=2)
    
    # Plot confusion matrix
    try:
        _plot_confusion_matrix(cm, class_names, ARTIFACTS_DIR / "confusion_matrix.png")
        # Also save to report dir
        _plot_confusion_matrix(cm, class_names, REPORT_DIR / "confusion_matrix.png")
    except Exception as e:
        print(f"[WARN] Could not plot confusion matrix: {e}")
    
    return metrics


def _plot_confusion_matrix(cm, class_names, save_path):
    """Plot and save confusion matrix."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import seaborn as sns
    
    # Normalize
    cm_norm = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
    cm_norm = np.nan_to_num(cm_norm)
    
    # Plot
    fig_size = max(10, len(class_names) * 0.6)
    fig, ax = plt.subplots(figsize=(fig_size, fig_size))
    
    sns.heatmap(
        cm_norm, annot=True, fmt='.2f', cmap='Blues',
        xticklabels=class_names, yticklabels=class_names,
        ax=ax, vmin=0, vmax=1, cbar_kws={'label': 'Recall'}
    )
    
    ax.set_xlabel('Predicted', fontsize=12)
    ax.set_ylabel('True', fontsize=12)
    ax.set_title('Confusion Matrix (Normalized by Row)', fontsize=14)
    plt.xticks(rotation=45, ha='right', fontsize=8)
    plt.yticks(rotation=0, fontsize=8)
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"[INFO] Confusion matrix plot saved to {save_path}")


def main():
    parser = argparse.ArgumentParser(description="Evaluate trained model")
    parser.add_argument("--weights", type=str, default=str(WEIGHTS_DIR / "best_model.pth"),
                       help="Path to model weights")
    parser.add_argument("--split", type=str, default="val", choices=["val", "test"],
                       help="Which split to evaluate on")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--num-workers", type=int, default=2)
    args = parser.parse_args()
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[INFO] Using device: {device}")
    
    # Load model
    print(f"[INFO] Loading model from {args.weights}")
    model, checkpoint = load_model(args.weights, device)
    img_size = checkpoint.get("img_size", 224)
    print(f"[INFO] Model: {checkpoint.get('architecture', 'unknown')}")
    print(f"[INFO] Classes: {checkpoint['num_classes']}")
    print(f"[INFO] Best training F1: {checkpoint.get('val_f1', 'N/A')}")
    
    # Evaluate
    data_dir = SPLIT_DIR / args.split
    if not data_dir.exists():
        print(f"[ERROR] Split directory not found: {data_dir}")
        return
    
    print(f"\n[INFO] Evaluating on {args.split} split: {data_dir}")
    preds, labels, probs, class_names = evaluate_split(
        model, data_dir, img_size, args.batch_size, device, num_workers=args.num_workers
    )
    
    # Generate report
    metrics = generate_evaluation_report(preds, labels, probs, class_names, args.split)
    
    print(f"\n{'='*70}")
    print(f"EVALUATION COMPLETE")
    print(f"Macro-F1: {metrics['macro_f1']:.4f}")
    print(f"Accuracy: {metrics['accuracy']:.4f}")
    print(f"{'='*70}")


if __name__ == "__main__":
    main()
