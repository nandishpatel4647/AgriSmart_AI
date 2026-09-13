"""
AgriSmart AI — Data Preparation & Split
Creates leakage-free train/val/test split with stratification.
"""

import os
import json
import random
import shutil
from pathlib import Path
from collections import defaultdict

SEED = 42
TRAIN_RATIO = 0.80
VAL_RATIO = 0.10
TEST_RATIO = 0.10

RAW_DIR = Path(__file__).parent.parent / "data" / "raw"
SPLIT_DIR = Path(__file__).parent.parent / "data" / "split"
ARTIFACTS_DIR = Path(__file__).parent.parent / "ml" / "artifacts"

# Classes relevant to the SIH problem statement (~15-20 crop-disease classes)
# Based on actual dataset inspection — these are the crops mentioned in the problem statement
# plus a few additional well-represented crops from PlantVillage
TARGET_CROPS = [
    "Tomato", "Potato", "Corn", "Apple", "Grape", "Pepper",  # Core SIH crops
    "Cherry", "Peach", "Strawberry",  # Additional well-represented crops
]

IMG_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'}


def get_class_mapping(data_dir):
    """
    Discover actual classes in the dataset directory.
    Returns dict mapping class_name -> list of image paths.
    """
    data_dir = Path(data_dir)
    class_images = {}
    
    for class_dir in sorted(data_dir.iterdir()):
        if not class_dir.is_dir():
            continue
        
        images = sorted([
            f for f in class_dir.iterdir()
            if f.suffix in IMG_EXTENSIONS
        ])
        
        if images:
            class_images[class_dir.name] = images
    
    return class_images


def filter_target_classes(class_images, target_crops=None):
    """
    Filter to classes matching the problem statement's target crops.
    If target_crops is None, use all classes.
    """
    if target_crops is None:
        return class_images
    
    filtered = {}
    for class_name, images in class_images.items():
        # Check if any target crop name appears in the class name (case-insensitive)
        class_lower = class_name.lower().replace("_", " ")
        for crop in target_crops:
            if crop.lower() in class_lower:
                filtered[class_name] = images
                break
    
    return filtered


def create_split(class_images, train_ratio=TRAIN_RATIO, val_ratio=VAL_RATIO, 
                 test_ratio=TEST_RATIO, seed=SEED):
    """
    Create stratified train/val/test split.
    
    LEAKAGE PREVENTION:
    - Each image appears in exactly one split
    - Stratified by class to preserve distribution
    - Fixed random seed for reproducibility
    """
    assert abs(train_ratio + val_ratio + test_ratio - 1.0) < 1e-6, \
        f"Ratios must sum to 1.0, got {train_ratio + val_ratio + test_ratio}"
    
    random.seed(seed)
    
    splits = {"train": {}, "val": {}, "test": {}}
    split_stats = {}
    
    for class_name, images in class_images.items():
        # Shuffle with fixed seed per class for reproducibility
        shuffled = list(images)
        random.shuffle(shuffled)
        
        n = len(shuffled)
        n_train = int(n * train_ratio)
        n_val = int(n * val_ratio)
        # Remaining go to test (handles rounding)
        
        train_imgs = shuffled[:n_train]
        val_imgs = shuffled[n_train:n_train + n_val]
        test_imgs = shuffled[n_train + n_val:]
        
        splits["train"][class_name] = train_imgs
        splits["val"][class_name] = val_imgs
        splits["test"][class_name] = test_imgs
        
        split_stats[class_name] = {
            "total": n,
            "train": len(train_imgs),
            "val": len(val_imgs),
            "test": len(test_imgs),
        }
    
    return splits, split_stats


def verify_no_leakage(splits):
    """Verify no image appears in multiple splits."""
    all_images = {"train": set(), "val": set(), "test": set()}
    
    for split_name, class_images in splits.items():
        for class_name, images in class_images.items():
            for img_path in images:
                img_key = str(img_path)
                assert img_key not in all_images.get("train", set()) or split_name == "train"
                assert img_key not in all_images.get("val", set()) or split_name == "val"
                assert img_key not in all_images.get("test", set()) or split_name == "test"
                all_images[split_name].add(img_key)
    
    # Check intersections
    train_val = all_images["train"] & all_images["val"]
    train_test = all_images["train"] & all_images["test"]
    val_test = all_images["val"] & all_images["test"]
    
    assert len(train_val) == 0, f"LEAKAGE: {len(train_val)} images in both train and val"
    assert len(train_test) == 0, f"LEAKAGE: {len(train_test)} images in both train and test"
    assert len(val_test) == 0, f"LEAKAGE: {len(val_test)} images in both val and test"
    
    print("[OK] No leakage detected - all splits are disjoint.")
    return True


def copy_split_to_disk(splits, output_dir):
    """Copy images into split directories on disk."""
    output_dir = Path(output_dir)
    
    for split_name, class_images in splits.items():
        for class_name, images in class_images.items():
            dest_dir = output_dir / split_name / class_name
            dest_dir.mkdir(parents=True, exist_ok=True)
            
            for img_path in images:
                dest = dest_dir / img_path.name
                if not dest.exists():
                    # Use symlink if possible (saves disk space), else copy
                    try:
                        os.symlink(str(img_path), str(dest))
                    except (OSError, NotImplementedError):
                        shutil.copy2(str(img_path), str(dest))
    
    print(f"[INFO] Split data written to {output_dir}")


def save_split_manifest(splits, split_stats, output_path):
    """Save split manifest as JSON for reproducibility documentation."""
    manifest = {
        "seed": SEED,
        "ratios": {
            "train": TRAIN_RATIO,
            "val": VAL_RATIO,
            "test": TEST_RATIO,
        },
        "class_stats": split_stats,
        "total_stats": {
            "train": sum(s["train"] for s in split_stats.values()),
            "val": sum(s["val"] for s in split_stats.values()),
            "test": sum(s["test"] for s in split_stats.values()),
            "total": sum(s["total"] for s in split_stats.values()),
        },
        "classes": sorted(split_stats.keys()),
        "num_classes": len(split_stats),
        # Store file paths for reproducibility
        "split_files": {
            split_name: {
                class_name: [str(p.name) for p in images]
                for class_name, images in class_images.items()
            }
            for split_name, class_images in splits.items()
        }
    }
    
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(manifest, f, indent=2)
    
    print(f"[INFO] Split manifest saved to {output_path}")
    return manifest


def create_class_index(classes):
    """Create and save class-to-index mapping."""
    class_to_idx = {cls: idx for idx, cls in enumerate(sorted(classes))}
    idx_to_class = {idx: cls for cls, idx in class_to_idx.items()}
    
    mapping = {
        "class_to_idx": class_to_idx,
        "idx_to_class": {str(k): v for k, v in idx_to_class.items()},
        "num_classes": len(class_to_idx),
    }
    
    mapping_path = ARTIFACTS_DIR / "class_mapping.json"
    mapping_path.parent.mkdir(parents=True, exist_ok=True)
    with open(mapping_path, "w") as f:
        json.dump(mapping, f, indent=2)
    
    print(f"[INFO] Class mapping saved to {mapping_path}")
    print(f"[INFO] {len(class_to_idx)} classes: {sorted(classes)}")
    
    return class_to_idx, idx_to_class


def main():
    """Main data preparation pipeline."""
    print("=" * 70)
    print("AGRISMART AI — DATA PREPARATION")
    print("=" * 70)
    
    # Step 1: Discover classes
    print("\n[Step 1] Discovering classes...")
    if not RAW_DIR.exists():
        print(f"[ERROR] Raw data directory not found: {RAW_DIR}")
        print("[INFO] Run download_dataset.py first.")
        return
    
    class_images = get_class_mapping(RAW_DIR)
    print(f"[INFO] Found {len(class_images)} total classes")
    
    # Step 2: Filter to target crops (or use all if filtering removes too many)
    print("\n[Step 2] Filtering to target crops...")
    filtered = filter_target_classes(class_images, TARGET_CROPS)
    
    if len(filtered) < 10:
        print(f"[WARN] Only {len(filtered)} classes match target crops. Using all {len(class_images)} classes.")
        filtered = class_images
    else:
        print(f"[INFO] Filtered to {len(filtered)} classes matching target crops")
    
    # Step 3: Create stratified split
    print("\n[Step 3] Creating stratified split...")
    splits, split_stats = create_split(filtered)
    
    # Step 4: Verify no leakage
    print("\n[Step 4] Verifying split integrity...")
    verify_no_leakage(splits)
    
    # Step 5: Copy to disk
    print("\n[Step 5] Writing split to disk...")
    copy_split_to_disk(splits, SPLIT_DIR)
    
    # Step 6: Save manifest
    print("\n[Step 6] Saving split manifest...")
    manifest = save_split_manifest(
        splits, split_stats,
        ARTIFACTS_DIR / "split_manifest.json"
    )
    
    # Step 7: Create class index
    print("\n[Step 7] Creating class index...")
    class_to_idx, idx_to_class = create_class_index(sorted(filtered.keys()))
    
    # Summary
    print("\n" + "=" * 70)
    print("SPLIT SUMMARY")
    print("=" * 70)
    total = manifest["total_stats"]
    print(f"Classes: {manifest['num_classes']}")
    print(f"Train:   {total['train']} images")
    print(f"Val:     {total['val']} images")
    print(f"Test:    {total['test']} images")
    print(f"Total:   {total['total']} images")
    print(f"Seed:    {SEED}")
    print(f"Ratios:  {TRAIN_RATIO}/{VAL_RATIO}/{TEST_RATIO}")
    print("=" * 70)


if __name__ == "__main__":
    main()
