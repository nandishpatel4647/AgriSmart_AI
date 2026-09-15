"""
AgriSmart AI — Prediction Interface
CLI + Python function for single-image crop disease prediction.

Usage:
    # CLI
    python predict.py --image path/to/leaf.jpg
    
    # Python
    from predict import predict
    result = predict("path/to/leaf.jpg")
    print(result["class"], result["confidence"])
"""

import json
import argparse
from pathlib import Path
from typing import Optional

import torch
import numpy as np
from PIL import Image
from torchvision import transforms, models
import torch.nn as nn

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
MODEL_BEST_WEIGHTS = PROJECT_ROOT / "model" / "weights" / "best_model.pth"
ROOT_CONVNEXT_WEIGHTS = PROJECT_ROOT / "weights" / "agrismart_convnext.pt"

def _resolve_weights_path():
    if ROOT_CONVNEXT_WEIGHTS.exists() and ROOT_CONVNEXT_WEIGHTS.stat().st_size > 1000000:
        return ROOT_CONVNEXT_WEIGHTS
    if MODEL_BEST_WEIGHTS.exists() and MODEL_BEST_WEIGHTS.stat().st_size > 1000000:
        return MODEL_BEST_WEIGHTS
    return ROOT_CONVNEXT_WEIGHTS if ROOT_CONVNEXT_WEIGHTS.exists() else MODEL_BEST_WEIGHTS

WEIGHTS_PATH = _resolve_weights_path()
CLASS_MAPPING_PATH = PROJECT_ROOT / "weights" / "class_mapping.json"

# Centroids & OOD configuration
CENTROIDS_PATH = PROJECT_ROOT / "ml" / "artifacts" / "class_centroids.pt"
CLASS_THRESHOLDS_PATH = PROJECT_ROOT / "weights" / "class_thresholds.json"
if not CLASS_THRESHOLDS_PATH.exists():
    CLASS_THRESHOLDS_PATH = PROJECT_ROOT / "ml" / "artifacts" / "class_thresholds.json"

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
OOD_COSINE_THRESHOLD = 0.945 # ConvNeXt 768-dim empirical data-calibrated threshold (gap: max OOD 0.9348 vs min ID 0.9611)
OOD_ENERGY_THRESHOLD = 100000.0 # Disabled as primary gate is cosine similarity
DISEASE_GUIDANCE = {
    # Tomato diseases
    "Tomato___Bacterial_spot": {
        "crop": "Tomato",
        "disease": "Bacterial Spot",
        "severity": "Moderate-High",
        "guidance": [
            "Remove and destroy infected plant parts immediately",
            "Apply copper-based bactericide as preventive measure",
            "Avoid overhead irrigation — use drip irrigation",
            "Ensure adequate spacing between plants for air circulation",
            "Use disease-free seeds and resistant varieties",
        ],
    },
    "Tomato___Early_blight": {
        "crop": "Tomato",
        "disease": "Early Blight",
        "severity": "Moderate",
        "guidance": [
            "Remove infected lower leaves to prevent spread",
            "Apply fungicide (chlorothalonil or mancozeb based)",
            "Mulch around plants to prevent soil splash",
            "Practice crop rotation — avoid planting tomatoes in same spot",
            "Water at base of plant, avoid wetting foliage",
        ],
    },
    "Tomato___Late_blight": {
        "crop": "Tomato",
        "disease": "Late Blight",
        "severity": "High — can destroy entire crop quickly",
        "guidance": [
            "ACT IMMEDIATELY — Late blight spreads rapidly in cool, wet conditions",
            "Remove and destroy ALL infected plants (do not compost)",
            "Apply systemic fungicide (metalaxyl/mefenoxam based)",
            "Improve air circulation and reduce humidity",
            "Monitor neighboring plants closely for next 7-14 days",
        ],
    },
    "Tomato___Leaf_Mold": {
        "crop": "Tomato",
        "disease": "Leaf Mold",
        "severity": "Moderate",
        "guidance": [
            "Improve greenhouse ventilation — reduce humidity below 85%",
            "Increase plant spacing for better air flow",
            "Apply fungicide (chlorothalonil or copper-based)",
            "Remove severely infected leaves",
            "Use resistant varieties in future plantings",
        ],
    },
    "Tomato___Septoria_leaf_spot": {
        "crop": "Tomato",
        "disease": "Septoria Leaf Spot",
        "severity": "Moderate",
        "guidance": [
            "Remove infected leaves promptly",
            "Apply fungicide — copper or chlorothalonil based",
            "Mulch to prevent rain splash from soil to leaves",
            "Avoid working with wet plants to prevent spread",
            "Practice 2-3 year crop rotation",
        ],
    },
    "Tomato___Spider_mites Two-spotted_spider_mite": {
        "crop": "Tomato",
        "disease": "Spider Mites",
        "severity": "Moderate",
        "guidance": [
            "Spray plants with strong water jet to dislodge mites",
            "Introduce predatory mites (biological control)",
            "Apply insecticidal soap or neem oil",
            "Increase humidity around plants — mites prefer dry conditions",
            "Remove heavily infested leaves",
        ],
    },
    "Tomato___Target_Spot": {
        "crop": "Tomato",
        "disease": "Target Spot",
        "severity": "Moderate",
        "guidance": [
            "Remove infected foliage and dispose away from garden",
            "Apply broad-spectrum fungicide",
            "Improve air circulation between plants",
            "Avoid overhead watering",
            "Mulch to reduce soil splash",
        ],
    },
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": {
        "crop": "Tomato",
        "disease": "Yellow Leaf Curl Virus",
        "severity": "High — no cure, vector-managed",
        "guidance": [
            "No cure exists — remove and destroy infected plants",
            "Control whitefly vectors with sticky traps and insecticides",
            "Use reflective mulch to repel whiteflies",
            "Plant resistant varieties when available",
            "Use fine mesh screens in greenhouse environments",
        ],
    },
    "Tomato___Tomato_mosaic_virus": {
        "crop": "Tomato",
        "disease": "Tomato Mosaic Virus",
        "severity": "High — highly contagious",
        "guidance": [
            "Remove and destroy infected plants immediately",
            "Disinfect all tools, hands, and equipment after handling",
            "Wash hands with milk/soap between handling plants",
            "Use virus-free seeds and resistant varieties",
            "Do not smoke near plants — tobacco mosaic can spread",
        ],
    },
    "Tomato___healthy": {
        "crop": "Tomato",
        "disease": "Healthy",
        "severity": "None",
        "guidance": [
            "Plant appears healthy — continue regular care",
            "Monitor regularly for early signs of disease",
            "Maintain proper watering and fertilization schedule",
            "Ensure good air circulation between plants",
        ],
    },
    # Potato diseases
    "Potato___Early_blight": {
        "crop": "Potato",
        "disease": "Early Blight",
        "severity": "Moderate",
        "guidance": [
            "Apply fungicide (chlorothalonil or mancozeb)",
            "Remove infected foliage",
            "Maintain adequate soil moisture",
            "Practice crop rotation (3+ years)",
            "Hill soil around plants to protect tubers",
        ],
    },
    "Potato___Late_blight": {
        "crop": "Potato",
        "disease": "Late Blight",
        "severity": "Critical — historic crop destroyer",
        "guidance": [
            "URGENT: Late blight can destroy entire fields within days",
            "Apply systemic fungicide immediately",
            "Destroy all infected plant material (burn, do not compost)",
            "Harvest tubers quickly if infection is severe",
            "Do not store infected tubers — they will rot and infect storage",
        ],
    },
    "Potato___healthy": {
        "crop": "Potato",
        "disease": "Healthy",
        "severity": "None",
        "guidance": [
            "Plant appears healthy — continue standard care",
            "Hill soil around plants as they grow",
            "Monitor for Colorado potato beetle and other pests",
            "Maintain consistent moisture for even tuber growth",
        ],
    },
    # Corn diseases
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": {
        "crop": "Corn",
        "disease": "Gray Leaf Spot",
        "severity": "Moderate-High",
        "guidance": [
            "Apply foliar fungicide at first sign of infection",
            "Practice crop rotation — avoid corn-after-corn",
            "Use resistant hybrids for future plantings",
            "Manage crop residue — till or remove infected stalks",
            "Ensure adequate nitrogen nutrition",
        ],
    },
    "Corn_(maize)___Common_rust_": {
        "crop": "Corn",
        "disease": "Common Rust",
        "severity": "Low-Moderate (usually manageable)",
        "guidance": [
            "Monitor severity — fungicide only if heavy infection pre-tassel",
            "Plant rust-resistant hybrids",
            "Rust often doesn't cause significant yield loss in field corn",
            "Ensure balanced fertility",
            "Report if rust appears unusually early in season",
        ],
    },
    "Corn_(maize)___Northern_Leaf_Blight": {
        "crop": "Corn",
        "disease": "Northern Leaf Blight",
        "severity": "Moderate-High",
        "guidance": [
            "Apply fungicide if infection occurs before or during tasseling",
            "Plant resistant hybrids",
            "Rotate crops and manage residue",
            "Disease favors cool, wet, overcast weather",
            "Scout fields regularly during grain fill",
        ],
    },
    "Corn_(maize)___healthy": {
        "crop": "Corn",
        "disease": "Healthy",
        "severity": "None",
        "guidance": [
            "Plant appears healthy — continue standard practices",
            "Monitor for common pests (corn borer, armyworm)",
            "Ensure adequate pollination coverage",
            "Maintain proper irrigation during grain fill",
        ],
    },
    # Apple diseases
    "Apple___Apple_scab": {
        "crop": "Apple",
        "disease": "Apple Scab",
        "severity": "Moderate-High",
        "guidance": [
            "Apply fungicide (captan or myclobutanil) during wet spring",
            "Remove and destroy fallen leaves in autumn",
            "Prune for good air circulation",
            "Plant scab-resistant varieties",
            "Time spray applications to weather — protect before rain events",
        ],
    },
    "Apple___Black_rot": {
        "crop": "Apple",
        "disease": "Black Rot",
        "severity": "Moderate",
        "guidance": [
            "Prune and remove all cankers, mummified fruit, and dead wood",
            "Apply fungicide during bloom and early fruit development",
            "Maintain good tree hygiene — remove dropped fruit",
            "Ensure adequate nutrition and water to reduce tree stress",
            "Fungus overwinters in dead tissue — sanitation is key",
        ],
    },
    "Apple___Cedar_apple_rust": {
        "crop": "Apple",
        "disease": "Cedar Apple Rust",
        "severity": "Moderate",
        "guidance": [
            "Remove nearby cedar/juniper trees if feasible (alternate host)",
            "Apply fungicide (myclobutanil) from green tip to 2 weeks after bloom",
            "Use resistant apple varieties",
            "Destroy galls on cedar trees before April",
            "Scout for orange spots on leaves in late spring",
        ],
    },
    "Apple___healthy": {
        "crop": "Apple",
        "disease": "Healthy",
        "severity": "None",
        "guidance": [
            "Tree/fruit appears healthy",
            "Continue regular pruning and orchard management",
            "Monitor for codling moth and fire blight",
            "Maintain balanced fertilization",
        ],
    },
    # Grape diseases
    "Grape___Black_rot": {
        "crop": "Grape",
        "disease": "Black Rot",
        "severity": "High",
        "guidance": [
            "Remove and destroy mummified berries and infected canes",
            "Apply fungicide (mancozeb, myclobutanil) before and after bloom",
            "Prune for good air circulation",
            "Control from previous season's mummies is critical",
            "Especially damaging in warm, humid conditions",
        ],
    },
    "Grape___Esca_(Black_Measles)": {
        "crop": "Grape",
        "disease": "Esca (Black Measles)",
        "severity": "High — chronic, no cure",
        "guidance": [
            "No curative treatment available — manage symptoms",
            "Prune and destroy severely affected parts",
            "Protect pruning wounds from infection",
            "Reduce vine stress through proper irrigation and nutrition",
            "Consider trunk renewal for chronically affected vines",
        ],
    },
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)": {
        "crop": "Grape",
        "disease": "Leaf Blight",
        "severity": "Moderate",
        "guidance": [
            "Apply fungicide early in growing season",
            "Improve canopy management for better air flow",
            "Remove infected leaves",
            "Reduce leaf wetness through proper training system",
            "Monitor humidity levels in vineyard",
        ],
    },
    "Grape___healthy": {
        "crop": "Grape",
        "disease": "Healthy",
        "severity": "None",
        "guidance": [
            "Vine appears healthy — continue normal vineyard management",
            "Monitor for powdery and downy mildew",
            "Ensure proper canopy management",
            "Test soil annually and adjust nutrition",
        ],
    },
    # Bell Pepper
    "Pepper,_bell___Bacterial_spot": {
        "crop": "Bell Pepper",
        "disease": "Bacterial Spot",
        "severity": "Moderate-High",
        "guidance": [
            "Apply copper-based bactericide",
            "Remove heavily infected plants",
            "Use drip irrigation — avoid wetting foliage",
            "Plant disease-free transplants and resistant varieties",
            "Practice crop rotation (2-3 years away from peppers/tomatoes)",
        ],
    },
    "Pepper,_bell___healthy": {
        "crop": "Bell Pepper",
        "disease": "Healthy",
        "severity": "None",
        "guidance": [
            "Plant appears healthy — continue regular care",
            "Monitor for aphids and other common pests",
            "Ensure consistent watering for even fruit development",
            "Side-dress with balanced fertilizer as needed",
        ],
    },
}


# Singleton model cache
_model_cache = {
    "model": None,
    "checkpoint": None,
    "device": None,
    "transform": None,
}


def _load_model(weights_path: str = None, device: str = None):
    """Load model into cache (singleton pattern for efficiency)."""
    if _model_cache["model"] is not None:
        return _model_cache["model"], _model_cache["checkpoint"], _model_cache["device"], _model_cache["transform"]
    
    if weights_path is None:
        weights_path = str(WEIGHTS_PATH)
    
    if device is None:
        dev = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        dev = torch.device(device)
    
    # We must explicitly add the custom class context if the model was saved natively
    # Because of a namespace collision (the project has a folder named 'model', but it was trained with 'from model import ...' inside src),
    # PyTorch tries to look up AgriSmartConvNeXt inside the root 'model' module. We inject it manually.
    try:
        import sys
        if str(PROJECT_ROOT) not in sys.path:
            sys.path.append(str(PROJECT_ROOT))
        from src.model import AgriSmartConvNeXt
        import model as root_model_module
        root_model_module.AgriSmartConvNeXt = AgriSmartConvNeXt
    except ImportError:
        pass

    # Load model (supporting full model object or state_dict checkpoint)
    loaded = torch.load(weights_path, map_location=dev, weights_only=False)
    if isinstance(loaded, dict) and "model_state_dict" in loaded:
        num_classes = loaded.get("num_classes", 38)
        try:
            from model.train import create_model
        except ImportError:
            from train import create_model
        model = create_model(num_classes, pretrained=False)
        model.load_state_dict(loaded["model_state_dict"])
    elif isinstance(loaded, dict) and "state_dict" in loaded:
        num_classes = loaded.get("num_classes", 38)
        try:
            from model.train import create_model
        except ImportError:
            from train import create_model
        model = create_model(num_classes, pretrained=False)
        model.load_state_dict(loaded["state_dict"])
    else:
        model = loaded

    model = model.to(dev)
    model.eval()

    # Optimize CPU execution threads
    if dev.type == "cpu":
        try:
            torch.set_num_threads(max(1, (os.cpu_count() or 4)))
        except Exception:
            pass

    with open(CLASS_MAPPING_PATH) as f:
        class_mapping = json.load(f)
    checkpoint = {"class_mapping": class_mapping}

    # Inference transform
    mean = [0.485, 0.456, 0.406]
    std = [0.229, 0.224, 0.225]
    transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.ToTensor(),
        transforms.Normalize(mean, std),
    ])
    
    # Warm up model to allocate PyTorch execution graph buffers ahead of first request
    try:
        with torch.inference_mode():
            dummy_input = torch.zeros((1, 3, 256, 256), device=dev)
            model(dummy_input)
    except Exception:
        pass

    # Cache
    _model_cache["model"] = model
    _model_cache["checkpoint"] = checkpoint
    _model_cache["device"] = dev
    _model_cache["transform"] = transform
    
    # Load Class Centroids for OOD detection
    centroids = None
    if CENTROIDS_PATH.exists():
        try:
            c_data = torch.load(CENTROIDS_PATH, map_location=dev, weights_only=False)
            centroids = c_data.get("class_centroids")
        except Exception as e:
            print(f"[WARN] Could not load class centroids: {e}")
    _model_cache["centroids"] = centroids
    
    # Load Per-Class Thresholds
    class_thresholds = {}
    if CLASS_THRESHOLDS_PATH.exists():
        try:
            with open(CLASS_THRESHOLDS_PATH) as f:
                class_thresholds = json.load(f)
        except Exception as e:
            print(f"[WARN] Could not load class thresholds: {e}")
    _model_cache["class_thresholds"] = class_thresholds
    
    return model, checkpoint, dev, transform


def predict(image_path: str, weights_path: str = None, top_k: int = 3) -> dict:
    """
    Predict crop disease from a leaf image with Open-Set / OOD rejection.
    
    Args:
        image_path: Path to the leaf/crop image
        weights_path: Path to model weights (default: model/weights/best_model.pth)
        top_k: Number of top predictions to return
    
    Returns:
        dict with prediction results or OOD rejection schema.
    """
    # Load model
    model, checkpoint, device, transform = _load_model(weights_path)
    idx_to_class = checkpoint["class_mapping"]["idx_to_class"]
    
    # Load and preprocess image
    image = Image.open(image_path).convert("RGB")
    input_tensor = transform(image).unsqueeze(0).to(device)
    
    # Predict & Extract 768-dim feature embedding representation
    with torch.inference_mode():
        # 1. Full forward pass for classification
        output = model(input_tensor)
        probs = torch.softmax(output, dim=1)[0]
        
        # 2. Extract features for OOD detection (Cosine Similarity)
        try:
            if hasattr(model, "features"):
                feat_4d = model.features(input_tensor)
            elif hasattr(model, "model") and hasattr(model.model, "features"):
                feat_4d = model.model.features(input_tensor)
            else:
                feat_4d = None

            if feat_4d is not None:
                if hasattr(model, "avgpool"):
                    feat_pooled = model.avgpool(feat_4d)
                elif hasattr(model, "model") and hasattr(model.model, "avgpool"):
                    feat_pooled = model.model.avgpool(feat_4d)
                else:
                    feat_pooled = torch.nn.functional.adaptive_avg_pool2d(feat_4d, (1, 1))
                feat_flat = torch.flatten(feat_pooled, 1)
                feat_norm = feat_flat / (torch.norm(feat_flat, p=2, dim=1, keepdim=True) + 1e-8)
            else:
                feat_norm = None
        except Exception:
            feat_norm = None

    # Free Energy Score: E(x) = -T * logsumexp(z / T)
    energy = float((-1.0 * torch.logsumexp(output, dim=1)).item())
    
    # Predicted class
    pred_idx = int(output.argmax(dim=1).item())
    pred_class_name = idx_to_class[str(pred_idx)]

    # Per-Class Threshold lookup
    class_thresholds = _model_cache.get("class_thresholds", {})
    required_threshold = float(class_thresholds.get(pred_class_name, OOD_COSINE_THRESHOLD))

    # Nearest Class Centroid Cosine Similarity
    centroids = _model_cache.get("centroids")
    max_sim = 1.0
    if centroids is not None and feat_norm is not None and centroids.shape[0] == len(idx_to_class) and centroids.shape[1] == feat_norm.shape[1]:
        sims = torch.mv(centroids.to(device), feat_norm.squeeze(0))
        max_sim = float(sims.max().item())
        
    # Calibrated OOD Detection with per-class threshold
    is_ood = False
    error_type = None
    
    if max_sim < required_threshold or energy > OOD_ENERGY_THRESHOLD:
        is_ood = True
        # Do not use energy alone to classify an image as non-plant
        if max_sim < 0.905:
            error_type = "NON_PLANT_IMAGE"
        else:
            error_type = "UNSEEN_SPECIES_DETECTED"
        
    if is_ood:
        return {
            "success": True,
            "is_supported_crop": False,
            "out_of_distribution": True,
            "error_type": error_type,
            "message": "The provided image does not match any of the 9 supported crops. Our system is trained exclusively on Apple, Cherry, Corn (Maize), Grape, Peach, Bell Pepper, Potato, Strawberry, and Tomato.",
            "detected_properties": {
                "is_plant": error_type == "UNSEEN_SPECIES_DETECTED",
                "confidence": 0.0,
                "cosine_similarity": round(max_sim, 4),
                "energy_score": round(energy, 2),
            },
            "supported_crops": SUPPORTED_CROPS,
            "class_label": "Unsupported_Crop",
            "crop": "Unsupported Crop",
            "leaf_name": "Unknown Leaf",
            "leaf_display_name": "⚠️ Unsupported Plant",
            "disease": "No supported disease",
            "severity": "Unknown",
            "guidance": [
                "AgriSmart AI refused to guess on an unsupported species to prevent false treatment guidance.",
                "Ensure your crop is one of our 9 supported families: Apple, Cherry, Corn, Grape, Peach, Bell Pepper, Potato, Strawberry, Tomato.",
                "Upload a clear photograph showing the foliage of a supported crop.",
            ],
            "top_k": [],
            "is_healthy": False,
        }
    
    # Get top-k predictions
    top_probs, top_indices = probs.topk(min(top_k, len(probs)))
    top_predictions = [
        (idx_to_class[str(idx.item())], round(prob.item(), 4))
        for prob, idx in zip(top_probs, top_indices)
    ]
    
    # Primary prediction
    predicted_class = top_predictions[0][0]
    confidence = top_predictions[0][1]
    
    # Look up guidance
    guidance_info = DISEASE_GUIDANCE.get(predicted_class, {})
    crop = guidance_info.get("crop", predicted_class.split("___")[0] if "___" in predicted_class else "Unknown")
    disease = guidance_info.get("disease", predicted_class.split("___")[1] if "___" in predicted_class else predicted_class)
    severity = guidance_info.get("severity", "Unknown")
    guidance = guidance_info.get("guidance", [
        "Consult a local agricultural extension officer for specific advice",
        "Monitor the plant closely for changes",
        "Take additional photos for tracking",
    ])
    
    is_healthy = "healthy" in predicted_class.lower()
    
    # Clean Crop & Leaf Name
    clean_crop = crop.replace("_", " ").replace(",", "").strip()
    if "Pepper" in clean_crop:
        clean_crop = "Bell Pepper"
    elif "Corn" in clean_crop:
        clean_crop = "Corn (Maize)"
    elif "Cherry" in clean_crop:
        clean_crop = "Cherry"

    if not clean_crop.lower().endswith("leaf"):
        leaf_name = f"{clean_crop} Leaf"
    else:
        leaf_name = clean_crop

    leaf_display_name = f"🍃 {leaf_name}"
    
    result = {
        "success": True,
        "is_supported_crop": True,
        "out_of_distribution": False,
        "cosine_similarity": round(max_sim, 4),
        "energy_score": round(energy, 2),
        "class_label": predicted_class,
        "confidence": confidence,
        "crop": clean_crop,
        "leaf_name": leaf_name,
        "leaf_display_name": leaf_display_name,
        "disease": disease,
        "severity": severity,
        "guidance": guidance,
        "top_k": top_predictions,
        "is_healthy": is_healthy,
        "supported_crops": SUPPORTED_CROPS,
    }
    
    return result


def main():
    """CLI interface for prediction."""
    parser = argparse.ArgumentParser(
        description="AgriSmart AI — Crop Disease Prediction",
        epilog="Example: python predict.py --image path/to/leaf.jpg"
    )
    parser.add_argument("--image", type=str, required=True, help="Path to leaf/crop image")
    parser.add_argument("--weights", type=str, default=None, help="Path to model weights")
    parser.add_argument("--top-k", type=int, default=3, help="Number of top predictions")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()
    
    # Validate image exists
    if not Path(args.image).exists():
        print(f"[ERROR] Image not found: {args.image}")
        return
    
    # Run prediction
    result = predict(args.image, weights_path=args.weights, top_k=args.top_k)
    
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"\n{'='*50}")
        print(f"  AgriSmart AI — Disease Detection Result")
        print(f"{'='*50}")
        print(f"  Image:      {args.image}")
        print(f"  Crop:       {result['crop']}")
        print(f"  Disease:    {result['disease']}")
        print(f"  Confidence: {result['confidence']*100:.1f}%")
        print(f"  Severity:   {result['severity']}")
        print(f"  Class:      {result['class_label']}")
        
        print(f"\n  Top {args.top_k} predictions:")
        for i, (cls, conf) in enumerate(result['top_k']):
            bar = "=" * int(conf * 30)
            print(f"    {i+1}. {cls}: {conf*100:.1f}% [{bar}]")
        
        print(f"\n  Actionable Guidance:")
        for g in result['guidance']:
            print(f"    - {g}")
        
        print(f"{'='*50}\n")


if __name__ == "__main__":
    main()
