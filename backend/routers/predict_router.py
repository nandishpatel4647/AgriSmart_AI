"""
AgriSmart AI — Prediction Router
Handles image upload and disease classification via real trained model.
"""

import os
import sys
import uuid
import base64
import io
from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image

PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "model"))

router = APIRouter()

UPLOADS_DIR = PROJECT_ROOT / "data" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _assess_image_quality(image: Image.Image) -> dict:
    """
    Assess uploaded image quality for field-photo confidence (P2).
    Returns quality assessment with warnings.
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
    mean_brightness = img_array.mean()
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
    try:
        gray = img_array.mean(axis=2) if len(img_array.shape) == 3 else img_array
        # Simple Laplacian approximation
        laplacian_var = np.var(np.diff(gray, axis=0)) + np.var(np.diff(gray, axis=1))
        if laplacian_var < 50:
            issues.append("Image appears blurry — try holding camera steady and refocusing")
            quality_score -= 20
        elif laplacian_var < 100:
            issues.append("Image may be slightly out of focus")
            quality_score -= 10
    except:
        pass
    
    quality_score = max(0, min(100, quality_score))
    
    return {
        "quality_score": quality_score,
        "issues": issues,
        "is_acceptable": quality_score >= 50,
        "resolution": f"{w}×{h}",
    }


def _generate_gradcam(image_path: str) -> str:
    """
    Generate Grad-CAM heatmap overlay (P2 feature).
    Returns base64-encoded image or None if unavailable.
    """
    try:
        import torch
        import numpy as np
        from torchvision import transforms, models
        import torch.nn as nn
        from predict import _load_model
        
        model, checkpoint, device, transform = _load_model()
        
        # Load image
        img = Image.open(image_path).convert("RGB")
        img_tensor = transform(img).unsqueeze(0).to(device)
        
        # Get the last conv layer of EfficientNet
        target_layer = model.features[-1]
        
        # Hook to capture activations and gradients
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
        
        # Compute Grad-CAM
        act = activations[0].squeeze()  # [C, H, W]
        grad = gradients[0].squeeze()   # [C, H, W]
        
        weights = grad.mean(dim=(1, 2))  # Global average pooling of gradients
        cam = torch.zeros(act.shape[1:], device=device)
        for i, w in enumerate(weights):
            cam += w * act[i]
        
        cam = torch.relu(cam)
        cam = cam - cam.min()
        if cam.max() > 0:
            cam = cam / cam.max()
        
        cam = cam.cpu().numpy()
        
        # Resize cam to image size
        from PIL import Image as PILImage
        cam_resized = np.array(PILImage.fromarray((cam * 255).astype(np.uint8)).resize(img.size, PILImage.BILINEAR)) / 255.0
        
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
async def predict_disease(file: UploadFile = File(...)):
    """
    Upload a leaf/crop image and get disease prediction.
    Uses real trained model — no mocks.
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image (JPEG, PNG)")
    
    # Save uploaded file
    file_ext = Path(file.filename or "image.jpg").suffix or ".jpg"
    filename = f"{uuid.uuid4()}{file_ext}"
    filepath = UPLOADS_DIR / filename
    
    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)
    
    try:
        # Open and validate image
        image = Image.open(filepath).convert("RGB")
        
        # Quality assessment (P2)
        quality = _assess_image_quality(image)
        
        # Run prediction using real trained model
        from predict import predict
        result = predict(str(filepath))
        
        # Generate Grad-CAM (P2) — best-effort
        gradcam_base64 = _generate_gradcam(str(filepath))
        
        return {
            "success": True,
            "prediction": {
                "class_label": result["class_label"],
                "confidence": result["confidence"],
                "crop": result["crop"],
                "leaf_name": result.get("leaf_name", f"{result['crop']} Leaf"),
                "leaf_display_name": result.get("leaf_display_name", f"🍃 {result['crop']} Leaf"),
                "disease": result["disease"],
                "severity": result["severity"],
                "is_healthy": result["is_healthy"],
                "guidance": result["guidance"],
                "top_predictions": [
                    {"class": cls, "confidence": conf}
                    for cls, conf in result["top_k"]
                ],
            },
            "image_quality": quality,
            "gradcam": gradcam_base64,
            "image_url": f"/uploads/{filename}",
            "timestamp": datetime.now().isoformat(),
        }
    
    except Exception as e:
        raise HTTPException(500, f"Prediction failed: {str(e)}")
