"""
AgriSmart AI — PlantDoc Dataset Audit, Deduplication & Strict 3-Way Split
Performs:
1. License and metadata inspection from raw PlantDoc files.
2. Exact mapping between PlantDoc folders and AgriSmart 33 diagnostic classes.
3. Separation of the 4 unsupported species into a dedicated Field OOD benchmark suite.
4. MD5 deduplication and cross-dataset leakage verification against PlantVillage.
5. Strict 3-way split:
   - Field Train (80% of PlantDoc train)
   - Field Validation (20% of PlantDoc train, carved out strictly for validation)
   - Field Test (PlantDoc test partition, LOCKED & UNTOUCHED for final evaluation)
6. Generation of audit report and manifest.
"""

import os
import sys
import json
import hashlib
import shutil
import random
from pathlib import Path
from collections import defaultdict, Counter
from PIL import Image

PROJECT_ROOT = Path(__file__).parent.parent
RAW_PLANTDOC_DIR = PROJECT_ROOT / "data" / "field_datasets" / "plantdoc"
FIELD_SPLIT_DIR = PROJECT_ROOT / "data" / "field_split"
PV_SPLIT_DIR = PROJECT_ROOT / "data" / "split"
ARTIFACTS_DIR = PROJECT_ROOT / "ml" / "artifacts"
CLASS_MAPPING_PATH = ARTIFACTS_DIR / "class_mapping.json"

# Fixed seed for strictly reproducible 3-way split
RANDOM_SEED = 42
random.seed(RANDOM_SEED)

# Exact 24 compatible mappings: PlantDoc folder name -> AgriSmart 33-class label
COMPATIBLE_MAPPING = {
    "Apple Scab Leaf": "Apple___Apple_scab",
    "Apple rust leaf": "Apple___Cedar_apple_rust",
    "Apple leaf": "Apple___healthy",
    "Cherry leaf": "Cherry_(including_sour)___healthy",
    "Corn Gray leaf spot": "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn rust leaf": "Corn_(maize)___Common_rust_",
    "Corn leaf blight": "Corn_(maize)___Northern_Leaf_Blight",
    "grape leaf black rot": "Grape___Black_rot",
    "grape leaf": "Grape___healthy",
    "Peach leaf": "Peach___healthy",
    "Bell_pepper leaf spot": "Pepper,_bell___Bacterial_spot",
    "Bell_pepper leaf": "Pepper,_bell___healthy",
    "Potato leaf early blight": "Potato___Early_blight",
    "Potato leaf late blight": "Potato___Late_blight",
    "Strawberry leaf": "Strawberry___healthy",
    "Tomato leaf bacterial spot": "Tomato___Bacterial_spot",
    "Tomato Early blight leaf": "Tomato___Early_blight",
    "Tomato leaf late blight": "Tomato___Late_blight",
    "Tomato mold leaf": "Tomato___Leaf_Mold",
    "Tomato Septoria leaf spot": "Tomato___Septoria_leaf_spot",
    "Tomato two spotted spider mites leaf": "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato leaf yellow virus": "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato leaf mosaic virus": "Tomato___Tomato_mosaic_virus",
    "Tomato leaf": "Tomato___healthy",
}

# The 4 unsupported crop species in PlantDoc: strictly preserved as Field OOD
UNSUPPORTED_FIELD_SPECIES = {
    "Blueberry leaf": "Blueberry (Unsupported Crop)",
    "Raspberry leaf": "Raspberry (Unsupported Crop)",
    "Soyabean leaf": "Soybean (Unsupported Crop)",
    "Squash Powdery mildew leaf": "Squash (Unsupported Crop)",
}


def compute_md5(filepath: Path) -> str:
    """Compute MD5 hash of file contents."""
    hasher = hashlib.md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def compute_dhash(image_path: Path, hash_size: int = 8) -> str:
    """Compute difference hash (dHash) for near-duplicate detection."""
    try:
        with Image.open(image_path) as img:
            img = img.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
            pixels = list(img.getdata())
            diff = []
            for row in range(hash_size):
                for col in range(hash_size):
                    left = pixels[row * (hash_size + 1) + col]
                    right = pixels[row * (hash_size + 1) + col + 1]
                    diff.append(1 if left > right else 0)
            decimal_val = 0
            hex_string = []
            for index, value in enumerate(diff):
                if value:
                    decimal_val += 2 ** (index % 8)
                if (index % 8) == 7:
                    hex_string.append(hex(decimal_val)[2:].rjust(2, "0"))
                    decimal_val = 0
            return "".join(hex_string)
    except Exception:
        return ""


def audit_and_split():
    print("=" * 70)
    print("  AGRISMART AI — PLANTDOC DATASET AUDIT & THREE-WAY SPLIT")
    print("=" * 70)

    if not RAW_PLANTDOC_DIR.exists():
        print(f"[ERROR] PlantDoc directory not found at {RAW_PLANTDOC_DIR}")
        sys.exit(1)

    # 1. License & Repository Metadata Inspection
    license_files = list(RAW_PLANTDOC_DIR.glob("LICENSE*")) + list(RAW_PLANTDOC_DIR.glob("license*"))
    readme_files = list(RAW_PLANTDOC_DIR.glob("README*")) + list(RAW_PLANTDOC_DIR.glob("readme*"))

    license_info = {
        "dataset_name": "PlantDoc (Visual Plant Disease Detection in the Wild)",
        "citation": "Singh, D., Jain, N., Jain, P., Kayal, P., Kumawat, S., & Batra, N. (2019). PlantDoc: A Dataset for Visual Plant Disease Detection. CoDS-COMAD 2020.",
        "authors": "Davinder Singh, Naman Jain, Pranjali Jain, Pratik Kayal, Sudhakar Kumawat, Nipun Batra (IIT Delhi / IIT Ropar)",
        "stated_license": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
        "license_file_found": bool(license_files),
        "license_file_name": license_files[0].name if license_files else "None",
        "readme_found": bool(readme_files),
    }
    print(f"[AUDIT] Dataset: {license_info['dataset_name']}")
    print(f"[AUDIT] Authors: {license_info['authors']}")
    print(f"[AUDIT] Stated License: {license_info['stated_license']}")

    # 2. Gather PlantVillage Hashes to Detect Cross-Dataset Leakage
    print("\n[LEAKAGE CHECK] Scanning PlantVillage dataset hashes for cross-contamination...")
    pv_hashes = set()
    pv_count = 0
    if PV_SPLIT_DIR.exists():
        for f in PV_SPLIT_DIR.rglob("*.*"):
            if f.suffix.lower() in [".jpg", ".jpeg", ".png"]:
                pv_hashes.add(compute_md5(f))
                pv_count += 1
    print(f"  Indexed {pv_count} PlantVillage images ({len(pv_hashes)} unique hashes).")

    # 3. Scan Raw PlantDoc Images
    print("\n[SCAN] Indexing PlantDoc raw images...")
    train_source = RAW_PLANTDOC_DIR / "train"
    test_source = RAW_PLANTDOC_DIR / "test"

    raw_images = []
    seen_hashes = {}
    duplicates = []
    pv_overlap = []

    for split_source, split_type in [(train_source, "train"), (test_source, "test")]:
        if not split_source.exists():
            continue
        for class_folder in sorted(split_source.iterdir()):
            if not class_folder.is_dir():
                continue
            folder_name = class_folder.name
            for img_file in sorted(class_folder.glob("*.*")):
                if img_file.suffix.lower() not in [".jpg", ".jpeg", ".png", ".bmp"]:
                    continue

                md5 = compute_md5(img_file)
                if md5 in pv_hashes:
                    pv_overlap.append(str(img_file))
                    continue  # drop leaked image

                if md5 in seen_hashes:
                    duplicates.append((str(img_file), seen_hashes[md5]))
                    continue  # drop exact duplicate

                seen_hashes[md5] = str(img_file)
                raw_images.append({
                    "original_path": str(img_file),
                    "filename": img_file.name,
                    "folder_name": folder_name,
                    "source_split": split_type,
                    "md5": md5,
                })

    print(f"  Total valid, clean PlantDoc images found: {len(raw_images)}")
    print(f"  Duplicates filtered out: {len(duplicates)}")
    print(f"  PlantVillage overlap detected: {len(pv_overlap)}")

    # 4. Partition into Train, Validation, Locked Test, and Field OOD
    print("\n[PARTITIONING] Applying strict data split discipline...")
    # Clean output directories
    if FIELD_SPLIT_DIR.exists():
        shutil.rmtree(FIELD_SPLIT_DIR)

    train_dir = FIELD_SPLIT_DIR / "train"
    val_dir = FIELD_SPLIT_DIR / "val"
    test_dir = FIELD_SPLIT_DIR / "test"
    ood_dir = FIELD_SPLIT_DIR / "field_ood"

    for d in [train_dir, val_dir, test_dir, ood_dir]:
        d.mkdir(parents=True, exist_ok=True)

    # Split images
    manifest = []
    compatible_train_by_class = defaultdict(list)
    compatible_test_by_class = defaultdict(list)
    ood_images = []

    for item in raw_images:
        folder = item["folder_name"]
        if folder in UNSUPPORTED_FIELD_SPECIES:
            ood_images.append(item)
        elif folder in COMPATIBLE_MAPPING:
            target_class = COMPATIBLE_MAPPING[folder]
            item["target_class"] = target_class
            if item["source_split"] == "train":
                compatible_train_by_class[target_class].append(item)
            else:
                compatible_test_by_class[target_class].append(item)

    # Create 80/20 train/val split strictly from PlantDoc TRAIN
    final_train = []
    final_val = []

    for cls, items in compatible_train_by_class.items():
        random.shuffle(items)
        n_total = len(items)
        n_val = max(1, int(n_total * 0.20)) if n_total >= 5 else (1 if n_total >= 2 else 0)
        val_items = items[:n_val]
        train_items = items[n_val:]

        for it in train_items:
            it["final_split"] = "train"
            final_train.append(it)
        for it in val_items:
            it["final_split"] = "val"
            final_val.append(it)

    # Locked held-out test split (PlantDoc TEST)
    final_test = []
    for cls, items in compatible_test_by_class.items():
        for it in items:
            it["final_split"] = "test"
            final_test.append(it)

    # Copy files to designated destinations
    print("  Copying files to structured directories...")
    split_counts = {"train": Counter(), "val": Counter(), "test": Counter(), "field_ood": Counter()}

    for split_name, items, dest_base in [
        ("train", final_train, train_dir),
        ("val", final_val, val_dir),
        ("test", final_test, test_dir),
    ]:
        for it in items:
            target_class = it["target_class"]
            target_folder = dest_base / target_class
            target_folder.mkdir(parents=True, exist_ok=True)
            dest_path = target_folder / f"{it['md5'][:8]}_{it['filename']}"
            shutil.copy2(it["original_path"], dest_path)
            it["dest_path"] = str(dest_path)
            split_counts[split_name][target_class] += 1
            manifest.append(it)

    # Copy Field OOD images
    for it in ood_images:
        folder = it["folder_name"]
        target_folder = ood_dir / folder
        target_folder.mkdir(parents=True, exist_ok=True)
        dest_path = target_folder / f"{it['md5'][:8]}_{it['filename']}"
        shutil.copy2(it["original_path"], dest_path)
        it["final_split"] = "field_ood"
        it["target_class"] = UNSUPPORTED_FIELD_SPECIES[folder]
        it["dest_path"] = str(dest_path)
        split_counts["field_ood"][folder] += 1
        manifest.append(it)

    print(f"\n[SUMMARY OF THREE-WAY PARTITION]")
    print(f"  Field Training Set:   {len(final_train)} images across {len(split_counts['train'])} classes")
    print(f"  Field Validation Set: {len(final_val)} images across {len(split_counts['val'])} classes (for tuning)")
    print(f"  Field Held-Out Test:  {len(final_test)} images across {len(split_counts['test'])} classes (LOCKED)")
    print(f"  Field OOD Test Set:   {len(ood_images)} images across 4 unsupported species (Blueberry, Raspberry, Soybean, Squash)")

    # 5. Save Artifacts
    audit_report = {
        "license_info": license_info,
        "total_raw_found": len(raw_images),
        "duplicates_removed": len(duplicates),
        "plantvillage_overlap_removed": len(pv_overlap),
        "final_counts": {
            "train": len(final_train),
            "val": len(final_val),
            "test": len(final_test),
            "field_ood": len(ood_images),
        },
        "classes_compatible_count": len(COMPATIBLE_MAPPING),
        "classes_unsupported_field_count": len(UNSUPPORTED_FIELD_SPECIES),
        "split_counts_per_class": {
            s: dict(counts) for s, counts in split_counts.items()
        }
    }

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(ARTIFACTS_DIR / "field_dataset_audit.json", "w") as f:
        json.dump(audit_report, f, indent=2)

    with open(ARTIFACTS_DIR / "field_split_manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"\n[OK] Saved audit to {ARTIFACTS_DIR / 'field_dataset_audit.json'}")
    print(f"[OK] Saved manifest to {ARTIFACTS_DIR / 'field_split_manifest.json'}")


if __name__ == "__main__":
    audit_and_split()
