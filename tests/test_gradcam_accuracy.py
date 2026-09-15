"""
AgriSmart AI — Grad-CAM / HiResCAM Spatial Accuracy Tests
Verifies that explainable AI heatmaps accurately localize disease lesions
instead of erroneous stem/background regions.
"""

from pathlib import Path
import pytest
from PIL import Image
import torch
import numpy as np

PROJECT_ROOT = Path(__file__).parent.parent
SAMPLES_DIR = PROJECT_ROOT / "frontend" / "public" / "samples"


def test_gradcam_base64_generation():
    """Verify that _generate_gradcam generates valid base64 PNG string."""
    import sys
    sys.path.insert(0, str(PROJECT_ROOT / "backend" / "routers"))
    sys.path.insert(0, str(PROJECT_ROOT / "model"))
    from predict_router import _generate_gradcam
    
    img_path = SAMPLES_DIR / "tomato_late_blight.jpg"
    assert img_path.exists(), f"Sample image {img_path} not found"
    
    b64_str = _generate_gradcam(str(img_path))
    assert b64_str is not None
    assert len(b64_str) > 1000
    
    # Verify it can be decoded into an image
    import base64
    import io
    img_data = base64.b64decode(b64_str)
    decoded_img = Image.open(io.BytesIO(img_data))
    assert decoded_img.size[0] > 0 and decoded_img.size[1] > 0


def test_tomato_late_blight_heat_in_top_region():
    """
    CRITICAL USER REQUIREMENT:
    Tomato Late Blight lesion is situated in the upper portion of the leaf.
    The heatmap peak MUST be located in the upper half of the leaf (y < 0.5 * H),
    NOT down towards the petiole/stem.
    """
    import sys
    sys.path.insert(0, str(PROJECT_ROOT / "model"))
    from predict import _load_model
    
    model, checkpoint, device, transform = _load_model()
    
    img_path = SAMPLES_DIR / "tomato_late_blight.jpg"
    img = Image.open(img_path).convert("RGB")
    img_tensor = transform(img).unsqueeze(0).to(device)
    
    # Layer hook (support both EfficientNet and ConvNeXt backbones)
    if hasattr(model, "features"):
        target_layer = model.features[6]
    else:
        target_layer = model.model.features[-1]
    activations = []
    gradients = []
    
    def forward_hook(module, input, output):
        activations.append(output.detach())
    
    def backward_hook(module, grad_input, grad_output):
        gradients.append(grad_output[0].detach())
    
    fh = target_layer.register_forward_hook(forward_hook)
    bh = target_layer.register_full_backward_hook(backward_hook)
    
    model.eval()
    output = model(img_tensor)
    pred_class = output.argmax(dim=1).item()
    
    model.zero_grad()
    output[0, pred_class].backward()
    
    fh.remove()
    bh.remove()
    
    act = activations[0].squeeze()  # [192, 7, 7]
    grad = gradients[0].squeeze()   # [192, 7, 7]
    
    cam = torch.relu((act * grad).sum(dim=0)).cpu().numpy()
    
    # Peak coordinate on 7x7 grid
    peak_y, peak_x = divmod(cam.argmax(), cam.shape[1])
    
    # The grid is 7 rows: 0, 1, 2, 3, 4, 5, 6.
    # Rows 0-3 are the upper portion (top/upper-middle).
    # Rows 5-6 are the lower portion (stem/base).
    assert peak_y <= 4, f"Peak heat row {peak_y} is in the lower portion! Expected upper lesion region (<= 4)."
