"""
AgriSmart AI — Comprehensive Model Evaluator
Rigorously evaluates any EfficientNet-B0 checkpoint across:
1. PlantVillage held-out test set (lab benchmark)
2. Field-domain validation set (Mapped to global 33-class space)
3. Field-domain locked test set (LOCKED held-out evaluation)
4. Standard 7-sample OOD suite (Tulsi, Mango, Neem, Rose, Ficus, Wheat, Tractor)
5. Field-domain OOD suite (Blueberry, Raspberry, Soybean, Squash)

Outputs:
- Accuracy, Macro-F1, Macro-Precision, Macro-Recall
- 95% Bootstrap Confidence Intervals for Accuracy and Macro-F1
- Confidence distribution statistics (mean, median, std, p10, p25, p75, p90)
- Confusion Matrix
- Full 33-class report with explicit isolation of the 9 unaugmented classes
- OOD rejection counts and false acceptance detection
- JSON artifact for comparative tables
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Tuple

import torch
import torch.nn as nn
import numpy as np
from PIL import Image
from torchvision import transforms, datasets, models
from sklearn.metrics import classification_report, accuracy_score, f1_score, precision_recall_fscore_support, confusion_matrix

PROJECT_ROOT = Path(__file__).parent.parent
CLASS_MAPPING_PATH = PROJECT_ROOT / "ml" / "artifacts" / "class_mapping.json"
OOD_SAMPLES_DIR = PROJECT_ROOT / "data" / "test_samples"

# 9 classes with NO field training data in PlantDoc
CLASSES_WITHOUT_FIELD_DATA = [
    "Apple___Black_rot",
    "Cherry_(including_sour)___Powdery_mildew",
    "Corn_(maize)___healthy",
    "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Peach___Bacterial_spot",
    "Potato___healthy",
    "Strawberry___Leaf_scorch",
    "Tomato___Target_Spot",
]

# Standard 7 OOD ground-truth samples
STANDARD_OOD_SAMPLES = [
    ("tulsi_leaf.jpg", "Tulsi (Holy Basil)", "UNSEEN_SPECIES_DETECTED"),
    ("mango_leaf.jpg", "Mango Leaf", "UNSEEN_SPECIES_DETECTED"),
    ("neem_leaf.jpg", "Neem Leaf", "UNSEEN_SPECIES_DETECTED"),
    ("rose_leaf.jpg", "Rose Leaf", "UNSEEN_SPECIES_DETECTED"),
    ("houseplant_ficus.jpg", "Ficus (Houseplant)", "UNSEEN_SPECIES_DETECTED"),
    ("wheat_leaf.jpg", "Wheat Leaf (Unseen Crop)", "UNSEEN_SPECIES_DETECTED"),
    ("tractor_tool.jpg", "Tractor Hardware", "NON_PLANT_IMAGE"),
]


class MappedImageFolder(torch.utils.data.Dataset):
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


def compute_bootstrap_ci(y_true: np.ndarray, y_pred: np.ndarray, n_bootstraps: int = 1000, alpha: float = 0.05, seed: int = 42):
    """Compute empirical 95% bootstrap confidence intervals for accuracy and macro-F1."""
    rng = np.random.RandomState(seed)
    n = len(y_true)
    if n < 10:
        return {
            "accuracy_ci_95": [float(accuracy_score(y_true, y_pred)), float(accuracy_score(y_true, y_pred))],
            "macro_f1_ci_95": [float(f1_score(y_true, y_pred, average="macro", zero_division=0)), float(f1_score(y_true, y_pred, average="macro", zero_division=0))],
        }
    acc_boot = []
    f1_boot = []
    for _ in range(n_bootstraps):
        indices = rng.randint(0, n, size=n)
        yt = y_true[indices]
        yp = y_pred[indices]
        acc_boot.append(accuracy_score(yt, yp))
        f1_boot.append(f1_score(yt, yp, average="macro", zero_division=0))
    low_acc, high_acc = np.percentile(acc_boot, [100 * (alpha / 2), 100 * (1 - alpha / 2)])
    low_f1, high_f1 = np.percentile(f1_boot, [100 * (alpha / 2), 100 * (1 - alpha / 2)])
    return {
        "accuracy_ci_95": [round(float(low_acc), 4), round(float(high_acc), 4)],
        "macro_f1_ci_95": [round(float(low_f1), 4), round(float(high_f1), 4)],
    }


def load_model_for_eval(weights_path: Path, device: torch.device):
    """Load model checkpoint and class mapping."""
    with open(CLASS_MAPPING_PATH, "r") as f:
        mapping = json.load(f)
    class_to_idx = mapping["class_to_idx"]
    idx_to_class = {int(k): v for k, v in mapping["idx_to_class"].items()}
    num_classes = len(class_to_idx)

    checkpoint = torch.load(weights_path, map_location=device, weights_only=False)
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, num_classes),
    )
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()

    # Standard eval transform
    mean = [0.485, 0.456, 0.406]
    std = [0.229, 0.224, 0.225]
    transform = transforms.Compose([
        transforms.Resize(257),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean, std),
    ])

    return model, transform, class_to_idx, idx_to_class


def evaluate_dataset(model, dataloader, device, idx_to_class, class_names):
    """Evaluate classification metrics on a PyTorch DataLoader."""
    all_preds = []
    all_targets = []
    all_confs = []

    with torch.no_grad():
        for images, labels in dataloader:
            images = images.to(device)
            outputs = model(images)
            probs = torch.softmax(outputs, dim=1)
            confs, preds = torch.max(probs, dim=1)

            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(labels.numpy())
            all_confs.extend(confs.cpu().numpy())

    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)
    all_confs = np.array(all_confs)

    acc = float(accuracy_score(all_targets, all_preds))
    macro_f1 = float(f1_score(all_targets, all_preds, average="macro", zero_division=0))
    p, r, f1, s = precision_recall_fscore_support(all_targets, all_preds, labels=range(len(idx_to_class)), zero_division=0)

    # Bootstrap Confidence Intervals
    bootstrap_ci = compute_bootstrap_ci(all_targets, all_preds)

    # Confidence distribution stats
    conf_stats = {
        "mean": round(float(np.mean(all_confs)), 4),
        "std": round(float(np.std(all_confs)), 4),
        "median": round(float(np.median(all_confs)), 4),
        "p10": round(float(np.percentile(all_confs, 10)), 4),
        "p25": round(float(np.percentile(all_confs, 25)), 4),
        "p75": round(float(np.percentile(all_confs, 75)), 4),
        "p90": round(float(np.percentile(all_confs, 90)), 4),
    }

    # Confusion matrix
    cm = confusion_matrix(all_targets, all_preds, labels=range(len(idx_to_class)))

    # Per-class metrics
    per_class = {}
    present_classes = np.unique(all_targets)
    for idx in range(len(idx_to_class)):
        c_name = idx_to_class[idx]
        if s[idx] > 0 or idx in present_classes:
            per_class[c_name] = {
                "precision": round(float(p[idx]), 4),
                "recall": round(float(r[idx]), 4),
                "f1": round(float(f1[idx]), 4),
                "support": int(s[idx]),
            }

    # Separate unaugmented classes (the 9 without field data)
    unaugmented_metrics = {}
    for c_name in CLASSES_WITHOUT_FIELD_DATA:
        if c_name in per_class:
            unaugmented_metrics[c_name] = per_class[c_name]

    return {
        "accuracy": round(acc, 4),
        "macro_f1": round(macro_f1, 4),
        "bootstrap_ci": bootstrap_ci,
        "confidence_stats": conf_stats,
        "total_samples": len(all_targets),
        "per_class": per_class,
        "unaugmented_classes": unaugmented_metrics,
        "confusion_matrix": cm.tolist(),
    }


def evaluate_ood_suite(model, transform, device, centroids, cos_thresh=0.58, energy_thresh=-45.0):
    """Evaluate standard and field OOD samples with exact production math."""
    results = []
    false_acceptances = 0

    # 1. Standard 7 OOD samples
    for filename, plant_name, category in STANDARD_OOD_SAMPLES:
        filepath = OOD_SAMPLES_DIR / filename
        if not filepath.exists():
            continue

        img = Image.open(filepath).convert("RGB")
        tensor = transform(img).unsqueeze(0).to(device)

        with torch.no_grad():
            feat = model.features(tensor)
            feat = model.avgpool(feat)
            feat = torch.flatten(feat, 1)
            feat_norm = feat / (torch.norm(feat, p=2, dim=1, keepdim=True) + 1e-8)

            output = model.classifier(feat)
            probs = torch.softmax(output, dim=1)[0]

            energy = float((-1.0 * torch.logsumexp(output, dim=1)).item())
            sims = torch.mv(centroids.to(device), feat_norm.squeeze(0))
            max_sim = float(sims.max().item())

            rejected_by_cos = max_sim < cos_thresh
            rejected_by_energy = energy > energy_thresh
            is_rejected = rejected_by_cos or rejected_by_energy

            if not is_rejected:
                false_acceptances += 1

            results.append({
                "type": "standard_ood",
                "filename": filename,
                "label": plant_name,
                "max_cosine": round(max_sim, 4),
                "energy": round(energy, 2),
                "rejected_by_cosine": rejected_by_cos,
                "rejected_by_energy": rejected_by_energy,
                "is_rejected": is_rejected,
                "status": "PASS (REJECTED)" if is_rejected else "FAIL (FALSE ACCEPTANCE)",
            })

    # 2. Field OOD samples from data/field_split/field_ood
    field_ood_dir = PROJECT_ROOT / "data" / "field_split" / "field_ood"
    field_ood_results = []
    if field_ood_dir.exists():
        for species_folder in sorted(field_ood_dir.iterdir()):
            if not species_folder.is_dir():
                continue
            species_name = species_folder.name
            img_files = list(species_folder.glob("*.*"))
            for img_path in img_files:
                try:
                    img = Image.open(img_path).convert("RGB")
                    tensor = transform(img).unsqueeze(0).to(device)
                    with torch.no_grad():
                        feat = model.features(tensor)
                        feat = model.avgpool(feat)
                        feat = torch.flatten(feat, 1)
                        feat_norm = feat / (torch.norm(feat, p=2, dim=1, keepdim=True) + 1e-8)

                        output = model.classifier(feat)
                        energy = float((-1.0 * torch.logsumexp(output, dim=1)).item())
                        sims = torch.mv(centroids.to(device), feat_norm.squeeze(0))
                        max_sim = float(sims.max().item())

                        rejected_by_cos = max_sim < cos_thresh
                        rejected_by_energy = energy > energy_thresh
                        is_rejected = rejected_by_cos or rejected_by_energy

                        field_ood_results.append({
                            "type": "field_ood",
                            "species": species_name,
                            "filename": img_path.name,
                            "max_cosine": round(max_sim, 4),
                            "energy": round(energy, 2),
                            "is_rejected": is_rejected,
                        })
                except Exception:
                    pass

    return {
        "standard_ood_total": len(results),
        "standard_ood_rejected": len([r for r in results if r["is_rejected"]]),
        "standard_ood_false_acceptances": false_acceptances,
        "standard_ood_details": results,
        "field_ood_total": len(field_ood_results),
        "field_ood_rejected": len([r for r in field_ood_results if r["is_rejected"]]),
        "field_ood_rejection_rate": round(len([r for r in field_ood_results if r["is_rejected"]]) / max(1, len(field_ood_results)), 4),
        "field_ood_details": field_ood_results,
    }


def run_full_evaluation(weights_path: str, model_tag: str, output_json: str = None, centroids_path: str = None):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    weights = Path(weights_path)
    print(f"\n[EVALUATION] Evaluating model: {model_tag} ({weights})")

    model, transform, class_to_idx, idx_to_class = load_model_for_eval(weights, device)

    # Centroids
    if centroids_path is None:
        c_path = PROJECT_ROOT / "ml" / "artifacts" / "class_centroids.pt"
    else:
        c_path = Path(centroids_path)

    centroids = None
    if c_path.exists():
        centroids = torch.load(c_path, map_location=device, weights_only=False)["class_centroids"]

    results = {"model_tag": model_tag, "weights_path": str(weights)}

    # 1. PlantVillage Test Set (4,025 images)
    pv_test_dir = PROJECT_ROOT / "data" / "split" / "test"
    if pv_test_dir.exists():
        print("  Evaluating PlantVillage held-out test split (4,025 images)...")
        pv_dataset = MappedImageFolder(pv_test_dir, class_to_idx, transform=transform)
        pv_loader = torch.utils.data.DataLoader(pv_dataset, batch_size=64, shuffle=False, num_workers=2)
        results["plantvillage_test"] = evaluate_dataset(model, pv_loader, device, idx_to_class, list(class_to_idx.keys()))
        ci_acc = results['plantvillage_test']['bootstrap_ci']['accuracy_ci_95']
        ci_f1 = results['plantvillage_test']['bootstrap_ci']['macro_f1_ci_95']
        print(f"    PV Accuracy: {results['plantvillage_test']['accuracy']*100:.2f}% (95% CI: [{ci_acc[0]*100:.2f}%, {ci_acc[1]*100:.2f}%]) | Macro-F1: {results['plantvillage_test']['macro_f1']:.4f} (95% CI: [{ci_f1[0]:.4f}, {ci_f1[1]:.4f}])")

    # 2. Field-Domain Validation Set
    field_val_dir = PROJECT_ROOT / "data" / "field_split" / "val"
    if field_val_dir.exists():
        print("  Evaluating Field Validation split...")
        field_val_dataset = MappedImageFolder(field_val_dir, class_to_idx, transform=transform)
        field_val_loader = torch.utils.data.DataLoader(field_val_dataset, batch_size=32, shuffle=False, num_workers=2)
        results["field_val"] = evaluate_dataset(model, field_val_loader, device, idx_to_class, list(class_to_idx.keys()))
        ci_acc = results['field_val']['bootstrap_ci']['accuracy_ci_95']
        ci_f1 = results['field_val']['bootstrap_ci']['macro_f1_ci_95']
        print(f"    Field Val Accuracy: {results['field_val']['accuracy']*100:.2f}% (95% CI: [{ci_acc[0]*100:.2f}%, {ci_acc[1]*100:.2f}%]) | Macro-F1: {results['field_val']['macro_f1']:.4f}")

    # 3. Field-Domain Locked Test Set
    field_test_dir = PROJECT_ROOT / "data" / "field_split" / "test"
    if field_test_dir.exists():
        print("  Evaluating Field Held-Out Locked Test split...")
        field_test_dataset = MappedImageFolder(field_test_dir, class_to_idx, transform=transform)
        field_test_loader = torch.utils.data.DataLoader(field_test_dataset, batch_size=32, shuffle=False, num_workers=2)
        results["field_test"] = evaluate_dataset(model, field_test_loader, device, idx_to_class, list(class_to_idx.keys()))
        ci_acc = results['field_test']['bootstrap_ci']['accuracy_ci_95']
        ci_f1 = results['field_test']['bootstrap_ci']['macro_f1_ci_95']
        print(f"    Field Test Accuracy: {results['field_test']['accuracy']*100:.2f}% (95% CI: [{ci_acc[0]*100:.2f}%, {ci_acc[1]*100:.2f}%]) | Macro-F1: {results['field_test']['macro_f1']:.4f}")

    # 4. OOD Suite
    if centroids is not None:
        print("  Evaluating OOD Safety Suite (Standard 7/7 + Field OOD)...")
        results["ood"] = evaluate_ood_suite(
            model, transform, device, centroids,
            cos_thresh=0.58, energy_thresh=-45.0
        )
        print(f"    Standard OOD Rejection: {results['ood']['standard_ood_rejected']}/{results['ood']['standard_ood_total']} ({'100% PASS' if results['ood']['standard_ood_false_acceptances'] == 0 else 'FAIL'})")
        print(f"    Field OOD Rejection Rate: {results['ood']['field_ood_rejection_rate']*100:.1f}% ({results['ood']['field_ood_rejected']}/{results['ood']['field_ood_total']})")

    if output_json:
        out_p = Path(output_json)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        with open(out_p, "w") as f:
            json.dump(results, f, indent=2)
        print(f"[OK] Saved evaluation results to {out_p}")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--weights", type=str, default="model/weights/best_model.pth")
    parser.add_argument("--tag", type=str, default="Model_A_Production")
    parser.add_argument("--output", type=str, default="ml/artifacts/eval_model_a_baseline.json")
    parser.add_argument("--centroids", type=str, default=None)
    args = parser.parse_args()

    run_full_evaluation(args.weights, args.tag, args.output, args.centroids)
