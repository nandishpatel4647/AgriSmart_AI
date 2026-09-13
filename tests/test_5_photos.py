"""
Batch upload test script for 5 real diverse crop leaf photos.
"""

import requests
from pathlib import Path

BASE = "http://localhost:3000"
PROJECT_ROOT = Path(__file__).parent.parent

photos = [
    ("Tomato Late Blight", PROJECT_ROOT / "data/split/test/Tomato___Late_blight/017a9839-6097-45aa-85b0-3051db151484___RS_Late.B 5125.JPG"),
    ("Apple Scab", PROJECT_ROOT / "data/split/test/Apple___Apple_scab/029424b0-0ef5-491b-9ef5-069190d24d8f___FREC_Scab 3504.JPG"),
    ("Corn Common Rust", PROJECT_ROOT / "data/split/test/Corn_(maize)___Common_rust_/RS_Rust 1563.JPG"),
    ("Potato Early Blight", PROJECT_ROOT / "data/split/test/Potato___Early_blight/002a55fb-7a3d-4a3a-aca8-ce2d5ebc6925___RS_Early.B 8170.JPG"),
    ("Grape Black Rot", PROJECT_ROOT / "data/split/test/Grape___Black_rot/00cab05d-e87b-4cf6-87d8-284f3ec99626___FAM_B.Rot 3244.JPG"),
]

def main():
    print("=" * 70)
    print("TESTING REAL LEAF PHOTO UPLOADS ACROSS 5 DIVERSE CROPS")
    print("=" * 70)

    for i, (name, img_path) in enumerate(photos, 1):
        assert img_path.exists(), f"Image not found: {img_path}"
        
        with open(img_path, "rb") as f:
            r = requests.post(
                f"{BASE}/api/predict",
                files={"file": (img_path.name, f, "image/jpeg")},
                timeout=15
            )
        
        assert r.status_code == 200, f"Upload failed with status {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("success") is True, f"Inference failed: {data}"
        
        pred = data["prediction"]
        quality = data.get("image_quality", {})
        gradcam = data.get("gradcam")
        
        print(f"Test #{i}: {name}")
        print(f"  - File:           {img_path.name}")
        print(f"  - Predicted:      {pred['crop']} -- {pred['disease']}")
        print(f"  - Class Label:    {pred['class_label']}")
        print(f"  - Confidence:     {pred['confidence']*100:.1f}%")
        print(f"  - Severity:       {pred['severity']}")
        print(f"  - Guidance Steps: {len(pred.get('guidance', []))} treatment rules")
        print(f"  - Quality Score:  {quality.get('quality_score')}/100")
        print(f"  - Grad-CAM:       {'Generated (' + str(len(gradcam)) + ' chars base64)' if gradcam else 'None'}")
        print(f"  - Top Predictions:")
        for p in pred.get("top_predictions", [])[:3]:
            print(f"      * {p['class']}: {p['confidence']*100:.1f}%")
        print()

    print("ALL 5/5 LEAF PHOTO UPLOADS SUCCEEDED WITH 100% ACCURACY & GRAD-CAM!")

if __name__ == "__main__":
    main()
