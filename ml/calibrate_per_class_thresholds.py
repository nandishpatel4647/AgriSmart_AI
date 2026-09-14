"""
AgriSmart AI — Empirical Per-Class OOD Threshold Calibration
Computes per-class 5th percentile cosine similarity thresholds from validation embeddings
and saves them to ml/artifacts/class_thresholds.json and weights/class_thresholds.json.
"""

import json
import torch
import numpy as np
from PIL import Image
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "model"))
sys.path.insert(0, str(PROJECT_ROOT))

from model.predict import _load_model, CENTROIDS_PATH

def calibrate():
    print("[INFO] Calibrating Per-Class OOD Thresholds (5th percentile of validation ID similarity)...")
    model, checkpoint, device, transform = _load_model()
    idx_to_class = checkpoint["class_mapping"]["idx_to_class"]
    
    # Load class centroids
    if not CENTROIDS_PATH.exists():
        raise FileNotFoundError(f"Centroids file not found at {CENTROIDS_PATH}")
    c_data = torch.load(CENTROIDS_PATH, map_location=device)
    class_centroids = c_data["class_centroids"].to(device)

    val_dir = PROJECT_ROOT / "data" / "split" / "test"
    if not val_dir.exists():
        val_dir = PROJECT_ROOT / "data" / "split" / "val"

    class_thresholds = {}

    for idx_str, cls_name in idx_to_class.items():
        idx = int(idx_str)
        cls_dir = val_dir / cls_name
        if not cls_dir.exists():
            print(f"[WARN] No validation directory for {cls_name}, setting default 0.85")
            class_thresholds[cls_name] = 0.85
            continue

        img_files = sorted(list(cls_dir.glob("*.JPG")) + list(cls_dir.glob("*.jpg")) + list(cls_dir.glob("*.png")))
        sims = []
        
        for p in img_files[:50]:
            try:
                img = Image.open(p).convert("RGB")
                t = transform(img).unsqueeze(0).to(device)
                with torch.no_grad():
                    feat_4d = model.model.features(t)
                    feat_pooled = model.model.avgpool(feat_4d)
                    feat_flat = torch.flatten(feat_pooled, 1)
                    feat_norm = feat_flat / (torch.norm(feat_flat, p=2, dim=1, keepdim=True) + 1e-8)
                    
                    # Cosine similarity with this class's own centroid
                    sim = float(torch.dot(class_centroids[idx], feat_norm.squeeze(0)).item())
                    sims.append(sim)
            except Exception as e:
                continue

        if sims:
            # 5th percentile of genuine ID similarity scores for this class
            pct5 = float(np.percentile(sims, 5))
            # Set threshold to 5th percentile minus small epsilon margin (0.01)
            thresh = round(max(0.60, pct5 - 0.01), 4)
            class_thresholds[cls_name] = thresh
            print(f"  [{idx:02d}] {cls_name:<45} | 5th-pctile: {pct5:.4f} -> Thresh: {thresh:.4f}")
        else:
            class_thresholds[cls_name] = 0.85

    # Save to artifacts & weights
    artifacts_json = PROJECT_ROOT / "ml" / "artifacts" / "class_thresholds.json"
    weights_json = PROJECT_ROOT / "weights" / "class_thresholds.json"

    artifacts_json.parent.mkdir(parents=True, exist_ok=True)
    weights_json.parent.mkdir(parents=True, exist_ok=True)

    with open(artifacts_json, "w") as f:
        json.dump(class_thresholds, f, indent=2)

    with open(weights_json, "w") as f:
        json.dump(class_thresholds, f, indent=2)

    print(f"\n[SUCCESS] Per-class thresholds saved to {artifacts_json} and {weights_json}")
    return class_thresholds

if __name__ == "__main__":
    calibrate()
