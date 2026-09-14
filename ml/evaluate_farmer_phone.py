"""
AgriSmart AI — Farmer Phone Evaluation Script
Tests both Model A (Production) and Model B (Field-Adapted) on the
Real-World Farmer Phone Evaluation Set (5 curated field photos).
Saves comparative predictions, confidences, and correctness to
ml/artifacts/eval_farmer_phone.json.
"""

import json
import sys
from pathlib import Path
import torch
import numpy as np
from PIL import Image
from torchvision import transforms, models
import torch.nn as nn

PROJECT_ROOT = Path(__file__).parent.parent
MANIFEST_PATH = PROJECT_ROOT / "ml" / "artifacts" / "farmer_phone_eval_manifest.json"
CLASS_MAPPING_PATH = PROJECT_ROOT / "ml" / "artifacts" / "class_mapping.json"
OUTPUT_JSON = PROJECT_ROOT / "ml" / "artifacts" / "eval_farmer_phone.json"


def load_model(weights_path: Path, device: torch.device):
    with open(CLASS_MAPPING_PATH) as f:
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

    transform = transforms.Compose([
        transforms.Resize(257),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    return model, transform, idx_to_class


def evaluate_farmer_photos():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("=" * 70)
    print("  AGRISMART AI — REAL-WORLD FARMER PHONE PHOTO EVALUATION")
    print("=" * 70)

    if not MANIFEST_PATH.exists():
        print(f"[ERROR] Manifest not found at {MANIFEST_PATH}")
        return

    with open(MANIFEST_PATH) as f:
        manifest = json.load(f)

    # Weights paths
    model_a_weights = PROJECT_ROOT / "model" / "weights" / "best_model.pth"
    model_b_weights = PROJECT_ROOT / "model" / "weights" / "field_adapted_model.pth"

    model_a, tf_a, idx2cls_a = load_model(model_a_weights, device)
    model_b, tf_b, idx2cls_b = None, None, None
    if model_b_weights.exists():
        model_b, tf_b, idx2cls_b = load_model(model_b_weights, device)

    results = []
    correct_a = 0
    correct_b = 0

    for item in manifest:
        img_path = PROJECT_ROOT / item["path"]
        if not img_path.exists():
            continue

        img = Image.open(img_path).convert("RGB")
        true_label = item["true_label"]

        # Eval Model A
        tensor_a = tf_a(img).unsqueeze(0).to(device)
        with torch.no_grad():
            out_a = model_a(tensor_a)
            probs_a = torch.softmax(out_a, dim=1)[0]
            pred_idx_a = torch.argmax(probs_a).item()
            pred_cls_a = idx2cls_a[pred_idx_a]
            conf_a = float(probs_a[pred_idx_a].item())

        is_correct_a = (pred_cls_a == true_label)
        if is_correct_a:
            correct_a += 1

        # Eval Model B
        pred_cls_b = "N/A"
        conf_b = 0.0
        is_correct_b = False
        if model_b:
            tensor_b = tf_b(img).unsqueeze(0).to(device)
            with torch.no_grad():
                out_b = model_b(tensor_b)
                probs_b = torch.softmax(out_b, dim=1)[0]
                pred_idx_b = torch.argmax(probs_b).item()
                pred_cls_b = idx2cls_b[pred_idx_b]
                conf_b = float(probs_b[pred_idx_b].item())
            is_correct_b = (pred_cls_b == true_label)
            if is_correct_b:
                correct_b += 1

        entry = {
            "filename": item["filename"],
            "crop": item["crop"],
            "true_label": true_label,
            "condition": item["field_condition"],
            "model_a": {
                "prediction": pred_cls_a,
                "confidence": round(conf_a, 4),
                "is_correct": is_correct_a,
            },
            "model_b": {
                "prediction": pred_cls_b,
                "confidence": round(conf_b, 4),
                "is_correct": is_correct_b,
            },
        }
        results.append(entry)

        print(f"\nPhoto: {item['filename']}")
        print(f"  True Label:  {true_label}")
        print(f"  Condition:   {item['field_condition']}")
        print(f"  Model A:     {pred_cls_a} ({conf_a*100:.1f}%) -> {'CORRECT' if is_correct_a else 'WRONG'}")
        if model_b:
            print(f"  Model B:     {pred_cls_b} ({conf_b*100:.1f}%) -> {'CORRECT' if is_correct_b else 'WRONG'}")

    summary = {
        "total": len(results),
        "model_a_correct": correct_a,
        "model_a_acc": f"{correct_a}/{len(results)} ({correct_a/max(1, len(results))*100:.1f}%)",
        "model_b_correct": correct_b,
        "model_b_acc": f"{correct_b}/{len(results)} ({correct_b/max(1, len(results))*100:.1f}%)" if model_b else "N/A",
        "details": results,
    }

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\n[SUMMARY] Model A Accuracy: {summary['model_a_acc']}")
    if model_b:
        print(f"[SUMMARY] Model B Accuracy: {summary['model_b_acc']}")
    print(f"[OK] Saved farmer phone evaluation results to {OUTPUT_JSON}")

    return summary


if __name__ == "__main__":
    evaluate_farmer_photos()
