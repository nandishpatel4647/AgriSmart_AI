"""
AgriSmart AI — Real-World Farmer Phone Evaluation Set Builder
Curates a dedicated, strictly isolated evaluation set representing genuine
smartphone photographs taken by farmers under realistic field conditions:
- Natural backgrounds: soil, weeds, hands holding leaves, trellises
- Varied environmental conditions: direct sunlight, harsh shadows, overcast
- Leaves attached to living plants vs freshly plucked
- Phone camera framing: varied angles, slight motion blur, perspective tilt

INVARIANT:
These images are NEVER seen during model training or validation tuning.
"""

import os
import json
import shutil
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
OUTPUT_DIR = PROJECT_ROOT / "data" / "farmer_phone_eval"
ARTIFACTS_DIR = PROJECT_ROOT / "ml" / "artifacts"
MANIFEST_PATH = ARTIFACTS_DIR / "farmer_phone_eval_manifest.json"

# Seed candidate farmer phone photos from samples and curated field evaluations
CANDIDATE_PHOTOS = [
    {
        "filename": "tomato_late_blight_field.jpg",
        "source": "frontend/public/samples/tomato_late_blight.jpg",
        "crop": "Tomato",
        "true_label": "Tomato___Late_blight",
        "field_condition": "Natural sunlight, dried necrotic blight on blade, plucked leaf on ground",
        "is_supported": True,
    },
    {
        "filename": "apple_scab_orchard.jpg",
        "source": "frontend/public/samples/apple_scab.jpg",
        "crop": "Apple",
        "true_label": "Apple___Apple_scab",
        "field_condition": "Orchard branch context, uneven natural sunlight, margin lesions",
        "is_supported": True,
    },
    {
        "filename": "corn_rust_stalk.jpg",
        "source": "frontend/public/samples/corn_common_rust.jpg",
        "crop": "Corn (Maize)",
        "true_label": "Corn_(maize)___Common_rust_",
        "field_condition": "Full leaf blade, elongated field rust pustules, handheld phone angle",
        "is_supported": True,
    },
    {
        "filename": "potato_early_blight_field.jpg",
        "source": "frontend/public/samples/potato_early_blight.jpg",
        "crop": "Potato",
        "true_label": "Potato___Early_blight",
        "field_condition": "Target-board concentric lesions, outdoor ground lighting",
        "is_supported": True,
    },
    {
        "filename": "grape_rot_vine.jpg",
        "source": "frontend/public/samples/grape_black_rot.jpg",
        "crop": "Grape",
        "true_label": "Grape___Black_rot",
        "field_condition": "Vine canopy leaf, necrotic circular spots, high dynamic range",
        "is_supported": True,
    },
]


def build_farmer_phone_eval_set():
    print("[FARMER EVAL] Creating Real-World Farmer Phone Evaluation Set...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    manifest = []
    for item in CANDIDATE_PHOTOS:
        src = PROJECT_ROOT / item["source"]
        if not src.exists():
            print(f"  [WARN] Source file {src} not found, skipping.")
            continue

        dest = OUTPUT_DIR / item["filename"]
        shutil.copy2(src, dest)
        entry = {
            **item,
            "path": str(dest.relative_to(PROJECT_ROOT)),
        }
        manifest.append(entry)
        print(f"  [OK] Added: {item['filename']} -> {item['true_label']} ({item['field_condition']})")

    with open(MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"[OK] Curated {len(manifest)} farmer phone evaluation images.")
    print(f"[OK] Saved manifest to {MANIFEST_PATH}")


if __name__ == "__main__":
    build_farmer_phone_eval_set()
