"""
AgriSmart AI — Production Weights Verifier
Ensures agrismart_convnext.pt model weights are present and valid in container / cloud environments.
If the weights file is missing or a Git LFS pointer text file, it downloads the verified weights.
"""

import os
import sys
import json
import hashlib
from pathlib import Path
import urllib.request

PROJECT_ROOT = Path(__file__).resolve().parent.parent
WEIGHTS_PATH = PROJECT_ROOT / "weights" / "agrismart_convnext.pt"
OID = "0ba896c30300d148a8a0e480ebe01f4287be8df843a3ec4af2daaeb3fee2f229"
EXPECTED_SIZE = 111487940


def verify_file(filepath: Path) -> bool:
    if not filepath.exists():
        return False
    if filepath.stat().st_size != EXPECTED_SIZE:
        return False
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(1024 * 1024):
            h.update(chunk)
    return h.hexdigest() == OID


def download_weights(target_path: Path):
    print("[INFO] Fetching download URL from GitHub LFS Batch API...")
    url = "https://github.com/nandishpatel4647/AgriSmart_AI.git/info/lfs/objects/batch"
    payload = {
        "operation": "download",
        "transfers": ["basic"],
        "objects": [{"oid": OID, "size": EXPECTED_SIZE}],
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/vnd.git-lfs+json",
            "Accept": "application/vnd.git-lfs+json",
            "User-Agent": "git-lfs",
        },
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        download_url = data["objects"][0]["actions"]["download"]["href"]

    print(f"[INFO] Downloading model weights ({EXPECTED_SIZE / (1024*1024):.1f} MB)...")
    temp_path = target_path.with_suffix(".pt.tmp")
    target_path.parent.mkdir(parents=True, exist_ok=True)

    with urllib.request.urlopen(download_url) as r, open(temp_path, "wb") as f:
        downloaded = 0
        while True:
            chunk = r.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)
            downloaded += len(chunk)
            print(f"\r[INFO] Downloaded {downloaded / (1024*1024):.1f} MB / {EXPECTED_SIZE / (1024*1024):.1f} MB", end="", flush=True)

    print("\n[INFO] Validating SHA-256 integrity hash...")
    if verify_file(temp_path):
        if target_path.exists():
            target_path.unlink()
        temp_path.rename(target_path)
        print("[SUCCESS] Production weights verified successfully!")
    else:
        if temp_path.exists():
            temp_path.unlink()
        raise RuntimeError("SHA-256 validation failed for downloaded weights.")


def main():
    if verify_file(WEIGHTS_PATH):
        print("[OK] weights/agrismart_convnext.pt is already present and verified.")
        return
    print("[WARN] weights/agrismart_convnext.pt is missing or an unsmudged Git LFS pointer. Downloading...")
    download_weights(WEIGHTS_PATH)


if __name__ == "__main__":
    main()
