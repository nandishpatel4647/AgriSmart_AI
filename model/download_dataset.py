"""
AgriSmart AI — Dataset Download & Inspection
Downloads PlantVillage dataset and inspects class distribution.
"""

import os
import sys
import json
import shutil
import zipfile
import urllib.request
from pathlib import Path
from collections import Counter


# PlantVillage dataset — public GitHub mirror (no API key needed)
DATASET_URL = "https://data.mendeley.com/public-files/datasets/tywbtsjrjv/files/d5652a28-c1d8-4b76-97f3-72fb80f94efc/file_downloaded"
DATASET_DIR = Path(__file__).parent.parent / "data"
RAW_DIR = DATASET_DIR / "raw"
ZIP_PATH = DATASET_DIR / "plantvillage.zip"

# The ~15-20 classes from the problem statement that we'll use
# (actual classes will be determined by inspecting the downloaded data)


def download_dataset():
    """Download PlantVillage dataset if not already present."""
    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    
    # Check if already extracted
    if RAW_DIR.exists() and any(RAW_DIR.iterdir()):
        print(f"[INFO] Dataset already exists at {RAW_DIR}")
        return True
    
    # Try kaggle first
    try:
        print("[INFO] Attempting Kaggle download...")
        import subprocess
        result = subprocess.run(
            ["pip", "install", "kaggle", "-q"],
            capture_output=True, text=True
        )
        result = subprocess.run(
            ["kaggle", "datasets", "download", "-d", "abdallahalidev/plantvillage-dataset",
             "-p", str(DATASET_DIR), "--unzip"],
            capture_output=True, text=True, timeout=300
        )
        if result.returncode == 0:
            # Kaggle extracts to a subdirectory
            extracted = DATASET_DIR / "plantvillage dataset"
            if extracted.exists():
                # Move color images to raw/
                color_dir = extracted / "color"
                if color_dir.exists():
                    shutil.move(str(color_dir), str(RAW_DIR))
                else:
                    shutil.move(str(extracted), str(RAW_DIR))
                print(f"[INFO] Kaggle download successful: {RAW_DIR}")
                return True
            # Check for segmented/grayscale structure  
            for subdir in extracted.iterdir():
                if subdir.is_dir():
                    shutil.move(str(subdir), str(RAW_DIR))
                    print(f"[INFO] Kaggle download successful: {RAW_DIR}")
                    return True
    except Exception as e:
        print(f"[WARN] Kaggle download failed: {e}")
    
    # Fallback: direct download
    print("[INFO] Downloading PlantVillage dataset via direct URL...")
    print("[INFO] This may take 5-10 minutes depending on connection speed.")
    
    # Alternative: use a well-known Kaggle dataset mirror
    alt_urls = [
        # Mendeley data link
        DATASET_URL,
    ]
    
    for url in alt_urls:
        try:
            print(f"[INFO] Trying: {url[:80]}...")
            urllib.request.urlretrieve(url, str(ZIP_PATH), _progress_hook)
            print()  # newline after progress
            
            # Extract
            print(f"[INFO] Extracting to {RAW_DIR}...")
            with zipfile.ZipFile(str(ZIP_PATH), 'r') as zf:
                zf.extractall(str(DATASET_DIR))
            
            # Find the actual image directory
            _organize_extracted(DATASET_DIR, RAW_DIR)
            
            # Cleanup zip
            if ZIP_PATH.exists():
                ZIP_PATH.unlink()
            
            print(f"[INFO] Dataset ready at {RAW_DIR}")
            return True
        except Exception as e:
            print(f"[WARN] Download failed from {url[:50]}: {e}")
            continue
    
    print("[ERROR] Could not download dataset automatically.")
    print("[INFO] Please download PlantVillage dataset manually:")
    print("  1. Go to: https://www.kaggle.com/datasets/abdallahalidev/plantvillage-dataset")
    print("  2. Download and extract 'color' folder")
    print(f"  3. Place class folders in: {RAW_DIR}/")
    return False


def _progress_hook(block_num, block_size, total_size):
    """Download progress indicator."""
    downloaded = block_num * block_size
    if total_size > 0:
        percent = min(100, downloaded * 100 / total_size)
        mb_down = downloaded / (1024 * 1024)
        mb_total = total_size / (1024 * 1024)
        sys.stdout.write(f"\r  Progress: {percent:.1f}% ({mb_down:.1f}/{mb_total:.1f} MB)")
    else:
        mb_down = downloaded / (1024 * 1024)
        sys.stdout.write(f"\r  Downloaded: {mb_down:.1f} MB")
    sys.stdout.flush()


def _organize_extracted(base_dir, target_dir):
    """Find and organize extracted image directories into target_dir."""
    target_dir.mkdir(parents=True, exist_ok=True)
    
    # Look for directories containing class folders with images
    for root, dirs, files in os.walk(str(base_dir)):
        root_path = Path(root)
        if root_path == target_dir:
            continue
        
        # Check if this directory contains class-like subdirectories
        has_class_dirs = False
        for d in dirs:
            subdir = root_path / d
            # A class directory should contain image files
            img_extensions = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'}
            img_files = [f for f in subdir.iterdir() if f.suffix in img_extensions] if subdir.is_dir() else []
            if len(img_files) > 10:  # At least 10 images = likely a class dir
                has_class_dirs = True
                break
        
        if has_class_dirs:
            # Move all class directories to target
            for d in dirs:
                src = root_path / d
                dst = target_dir / d
                if src.is_dir() and not dst.exists():
                    shutil.move(str(src), str(dst))
            print(f"[INFO] Organized classes from {root_path} → {target_dir}")
            return
    
    print(f"[WARN] Could not auto-organize. Check {base_dir} manually.")


def inspect_dataset(data_dir=None):
    """Inspect dataset classes and distribution."""
    if data_dir is None:
        data_dir = RAW_DIR
    
    data_dir = Path(data_dir)
    if not data_dir.exists():
        print(f"[ERROR] Dataset directory not found: {data_dir}")
        return None
    
    class_info = {}
    total_images = 0
    img_extensions = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'}
    
    for class_dir in sorted(data_dir.iterdir()):
        if not class_dir.is_dir():
            continue
        
        images = [f for f in class_dir.iterdir() if f.suffix in img_extensions]
        count = len(images)
        if count > 0:
            class_info[class_dir.name] = count
            total_images += count
    
    if not class_info:
        print(f"[ERROR] No image classes found in {data_dir}")
        return None
    
    # Print report
    print("\n" + "=" * 70)
    print("DATASET INSPECTION REPORT")
    print("=" * 70)
    print(f"Source directory: {data_dir}")
    print(f"Total classes: {len(class_info)}")
    print(f"Total images: {total_images}")
    print(f"\nClass distribution:")
    print(f"{'Class Name':<50} {'Count':>8} {'%':>7}")
    print("-" * 70)
    
    for cls_name, count in sorted(class_info.items(), key=lambda x: -x[1]):
        pct = (count / total_images) * 100
        print(f"{cls_name:<50} {count:>8} {pct:>6.1f}%")
    
    print("-" * 70)
    
    # Imbalance stats
    counts = list(class_info.values())
    min_count = min(counts)
    max_count = max(counts)
    imbalance_ratio = max_count / min_count if min_count > 0 else float('inf')
    
    print(f"\nMin class size: {min_count}")
    print(f"Max class size: {max_count}")
    print(f"Imbalance ratio: {imbalance_ratio:.1f}x")
    print(f"Mean class size: {total_images / len(class_info):.0f}")
    
    # Save report
    report = {
        "source": str(data_dir),
        "total_classes": len(class_info),
        "total_images": total_images,
        "classes": class_info,
        "min_class_size": min_count,
        "max_class_size": max_count,
        "imbalance_ratio": round(imbalance_ratio, 2),
    }
    
    report_path = Path(__file__).parent.parent / "ml" / "artifacts" / "dataset_inspection.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n[INFO] Report saved to {report_path}")
    
    return report


if __name__ == "__main__":
    success = download_dataset()
    if success:
        inspect_dataset()
    else:
        print("\n[ERROR] Dataset not available. Cannot proceed with inspection.")
        sys.exit(1)
