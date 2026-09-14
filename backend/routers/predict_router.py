"""
AgriSmart AI — Prediction Router
Handles image upload and disease classification with Open-Set / OOD rejection.
"""

import os
import sys
import uuid
import base64
import io
import json
from pathlib import Path
from datetime import datetime

from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image

PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "model"))

router = APIRouter()

UPLOADS_DIR = PROJECT_ROOT / "data" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# 9 Supported crop families
SUPPORTED_CROPS = [
    "Apple",
    "Cherry",
    "Corn (Maize)",
    "Grape",
    "Peach",
    "Bell Pepper",
    "Potato",
    "Strawberry",
    "Tomato",
]


def _assess_image_quality(image: Image.Image) -> dict:
    """
    Assess uploaded image quality for field-photo confidence.
    Returns quality assessment with sharpness, brightness, and contrast.
    """
    import numpy as np
    
    img_array = np.array(image)
    
    issues = []
    quality_score = 100
    
    # Resolution check
    w, h = image.size
    if w < 100 or h < 100:
        issues.append("Image resolution is very low — prediction may be unreliable")
        quality_score -= 30
    elif w < 224 or h < 224:
        issues.append("Image resolution is below recommended 224×224")
        quality_score -= 15
    
    # Brightness check
    mean_brightness = float(img_array.mean())
    if mean_brightness < 40:
        issues.append("Image is very dark — try retaking in better lighting")
        quality_score -= 25
    elif mean_brightness < 70:
        issues.append("Image is somewhat dark — results may be less accurate")
        quality_score -= 10
    elif mean_brightness > 240:
        issues.append("Image is overexposed — try retaking with less light")
        quality_score -= 20
    
    # Blur detection (Laplacian variance)
    sharpness = 100.0
    try:
        gray = img_array.mean(axis=2) if len(img_array.shape) == 3 else img_array
        laplacian_var = float(np.var(np.diff(gray, axis=0)) + np.var(np.diff(gray, axis=1)))
        sharpness = laplacian_var
        if laplacian_var < 50:
            issues.append("Image appears blurry — try holding camera steady and refocusing")
            quality_score -= 20
        elif laplacian_var < 100:
            issues.append("Image may be slightly out of focus")
            quality_score -= 10
    except Exception:
        pass
    
    quality_score = max(0, min(100, quality_score))
    
    return {
        "quality_score": quality_score,
        "sharpness": round(sharpness, 1),
        "brightness": round(mean_brightness, 1),
        "issues": issues,
        "is_acceptable": quality_score >= 50,
        "overall": "poor" if quality_score < 50 else ("moderate" if quality_score < 75 else "good"),
        "resolution": f"{w}×{h}",
    }


def _generate_gradcam(image_path: str) -> str:
    """
    Generate High-Resolution Grad-CAM / HiResCAM heatmap overlay.
    Hooks into features[6] (penultimate high-semantic conv stage) to preserve
    accurate spatial lesion coordinates, and computes element-wise gradient-activation
    attribution with smooth Gaussian contours for pinpoint disease localization.
    Returns base64-encoded image or None if unavailable.
    """
    try:
        import torch
        import numpy as np
        from PIL import Image as PILImage
        from predict import _load_model
        
        model, checkpoint, device, transform = _load_model()
        
        # Load image
        img = Image.open(image_path).convert("RGB")
        img_tensor = transform(img).unsqueeze(0).to(device)
        
        # Target layer: For ConvNeXt, features[-2] is the last spatial block; for EfficientNet features[6]
        if hasattr(model, "model") and hasattr(model.model, "features"):
            target_layer = model.model.features[-2]
        else:
            target_layer = model.features[6]
        
        activations = []
        gradients = []
        
        def forward_hook(module, input, output):
            activations.append(output.detach())
        
        def backward_hook(module, grad_input, grad_output):
            gradients.append(grad_output[0].detach())
        
        fh = target_layer.register_forward_hook(forward_hook)
        bh = target_layer.register_full_backward_hook(backward_hook)
        
        # Forward pass
        model.eval()
        output = model(img_tensor)
        pred_class = output.argmax(dim=1).item()
        
        # Backward pass for the predicted class
        model.zero_grad()
        output[0, pred_class].backward()
        
        # Remove hooks
        fh.remove()
        bh.remove()
        
        # HiResCAM: Element-wise gradient * activation attribution
        # Retains exact spatial gradients of lesions without global averaging cancellation
        act = activations[0].squeeze()  # [C, H, W]
        grad = gradients[0].squeeze()   # [C, H, W]
        
        cam = torch.relu((act * grad).sum(dim=0)).cpu().numpy()
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        
        # Contrast curve & Gaussian smoothing for organic, continuous lesion contours
        try:
            import scipy.ndimage as ndimage
            cam_contrast = cam ** 1.3
            cam_smooth = ndimage.gaussian_filter(cam_contrast, sigma=0.75)
            cam = (cam_smooth - cam_smooth.min()) / (cam_smooth.max() - cam_smooth.min() + 1e-8)
        except Exception:
            pass
        
        # Resize cam to original image dimensions with Bicubic interpolation
        cam_resized = np.array(PILImage.fromarray((cam * 255).astype(np.uint8)).resize(img.size, PILImage.BICUBIC)) / 255.0
        
        # Create heatmap overlay
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        import matplotlib.cm as cm
        
        heatmap = cm.jet(cam_resized)[:, :, :3]
        img_array = np.array(img) / 255.0
        overlay = 0.5 * img_array + 0.5 * heatmap
        overlay = np.clip(overlay, 0, 1)
        
        # Convert to base64
        fig, ax = plt.subplots(1, 1, figsize=(6, 6))
        ax.imshow(overlay)
        ax.axis('off')
        ax.set_title('Disease Region Heatmap (Grad-CAM)', fontsize=12)
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', dpi=100, pad_inches=0.1)
        plt.close()
        buf.seek(0)
        
        return base64.b64encode(buf.read()).decode('utf-8')
    
    except Exception as e:
        print(f"[WARN] Grad-CAM generation failed: {e}")
        return None


@router.post("/predict")
@router.post("/diagnose")
async def predict_disease(
    file: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
):
    """
    Upload a leaf/crop image and get disease prediction with Open-Set / OOD rejection.
    Uses real trained model — no mocks.
    """
    upload = file or image
    if upload is None:
        raise HTTPException(422, "Please upload an image file using either 'file' or 'image' field.")

    # Validate file type flexibly by mimetype or extension
    valid_exts = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    file_ext = Path(upload.filename or "image.jpg").suffix.lower() or ".jpg"
    is_image_type = (upload.content_type and upload.content_type.startswith("image/")) or (file_ext in valid_exts)
    if not is_image_type:
        raise HTTPException(400, "File must be an image (JPEG, PNG, WEBP)")
    
    # Save uploaded file
    scan_id = str(uuid.uuid4())
    filename = f"{scan_id}{file_ext}"
    filepath = UPLOADS_DIR / filename
    
    contents = await upload.read()
    with open(filepath, "wb") as f:
        f.write(contents)
    
    try:
        # Open and validate image format
        try:
            image = Image.open(filepath).convert("RGB")
        except Exception:
            raise HTTPException(400, "Uploaded file could not be decoded as an image.")
            
        # Quality assessment
        quality = _assess_image_quality(image)
        if quality.get("overall") == "poor" and quality.get("sharpness", 100) < 10.0:
            return {
                "success": True,
                "is_supported_crop": False,
                "out_of_distribution": True,
                "error_type": "LOW_IMAGE_QUALITY",
                "message": "The uploaded photo is too blurry or low quality for reliable crop diagnosis. Please upload a clear, focused photograph.",
                "detected_properties": {
                    "is_plant": True,
                    "confidence": 0.0,
                    "quality": quality,
                },
                "supported_crops": SUPPORTED_CROPS,
            }
        
        # Run prediction with feature-embedding OOD rejection
        from predict import predict
        result = predict(str(filepath))
        
        # Check if the model flagged the input as Out-Of-Distribution / Unsupported
        if not result.get("is_supported_crop", True):
            is_non_plant = result.get("error_type") == "NON_PLANT_IMAGE"
            return {
                "success": True,
                "is_supported_crop": False,
                "out_of_distribution": True,
                "id": scan_id,
                "status": "ready",
                "model_status": "ready",
                "filename": upload.filename or filename,
                "disease_label": "Non-Plant Object (Not a Leaf)" if is_non_plant else "Unsupported Crop",
                "confidence": 0.0,
                "crop": "Unsupported Crop" if not is_non_plant else "Non-Plant Object",
                "created_at": datetime.utcnow().isoformat(),
                "analysis_note": result.get("message", "AgriSmart AI refused to guess on out-of-distribution input to prevent false guidance."),
                "precautionary_guidance": result.get("guidance", ["Upload a clear photograph showing the foliage of a supported crop."]),
                "error_type": result.get("error_type", "UNSEEN_SPECIES_DETECTED"),
                "message": result.get("message", "The provided image does not match any of the 9 supported crops."),
                "detected_properties": result.get("detected_properties", {
                    "is_plant": not is_non_plant,
                    "confidence": 0.0,
                }),
                "supported_crops": result.get("supported_crops", SUPPORTED_CROPS),
                "image_path": f"/uploads/{filename}",
                "quality": quality,
            }
        
        # Supported crop: Generate Grad-CAM explainability overlay
        gradcam_base64 = _generate_gradcam(str(filepath))
        
        top_preds = [
            {"class": c, "confidence": p, "class_label": c}
            for c, p in result.get("top_k", [])
        ]
        
        return {
            "success": True,
            "is_supported_crop": True,
            "out_of_distribution": False,
            "id": scan_id,
            "status": "ready",
            "model_status": "ready",
            "filename": upload.filename or filename,
            "disease_label": result["disease"],
            "confidence": result["confidence"],
            "crop": result["crop"],
            "created_at": datetime.utcnow().isoformat(),
            "analysis_note": "Prediction returned by trained ConvNeXt with calibrated OOD rejection.",
            "precautionary_guidance": result.get("guidance", []),
            "prediction": {
                "class_label": result["class_label"],
                "confidence": result["confidence"],
                "crop": result["crop"],
                "leaf_name": result.get("leaf_name", f"{result['crop']} Leaf"),
                "leaf_display_name": result.get("leaf_display_name", f"🍃 {result['crop']} Leaf"),
                "disease": result["disease"],
                "severity": result["severity"],
                "is_healthy": result["is_healthy"],
                "guidance": result.get("guidance", []),
                "top_predictions": top_preds,
                "cosine_similarity": result.get("cosine_similarity"),
                "energy_score": result.get("energy_score"),
            },
            "detected_properties": {
                "is_plant": True,
                "confidence": result["confidence"],
                "cosine_similarity": result.get("cosine_similarity"),
                "energy_score": result.get("energy_score"),
            },
            "guidance": result.get("guidance", []),
            "top_predictions": top_preds,
            "gradcam": gradcam_base64,
            "gradcam_url": f"data:image/png;base64,{gradcam_base64}" if gradcam_base64 else None,
            "gradcam_data_uri": f"data:image/png;base64,{gradcam_base64}" if gradcam_base64 else None,
            "quality": quality,
            "image_quality": quality,
            "image_path": f"/uploads/{filename}",
            "supported_crops": SUPPORTED_CROPS,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Prediction failed: {str(e)}")


@router.get("/supported_crops")
def get_supported_crops():
    """Return the list of 9 supported crop families and all 33 conditions."""
    from predict import DISEASE_GUIDANCE
    mapping_path = PROJECT_ROOT / "ml" / "artifacts" / "class_mapping.json"
    classes = []
    if mapping_path.exists():
        with open(mapping_path) as f:
            classes = list(json.load(f).get("class_to_idx", {}).keys())
            
    return {
        "success": True,
        "crop_families": SUPPORTED_CROPS,
        "total_conditions": len(classes),
        "conditions": classes,
    }
