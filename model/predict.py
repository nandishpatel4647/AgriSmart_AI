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
WEIGHTS_PATH = PROJECT_ROOT / "model" / "weights" / "best_model.pth"
CLASS_MAPPING_PATH = PROJECT_ROOT / "ml" / "artifacts" / "class_mapping.json"

# Centroids & OOD configuration
CENTROIDS_PATH = PROJECT_ROOT / "ml" / "artifacts" / "class_centroids.pt"
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
OOD_COSINE_THRESHOLD = 0.58
OOD_ENERGY_THRESHOLD = -45.0
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
    
    # Load checkpoint
    checkpoint = torch.load(weights_path, map_location=dev, weights_only=False)
    num_classes = checkpoint["num_classes"]
    img_size = checkpoint.get("img_size", 224)
    
    # Recreate model
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, num_classes),
    )
    model.load_state_dict(checkpoint["model_state_dict"])
    model = model.to(dev)
    model.eval()
    
    # Inference transform
    mean = [0.485, 0.456, 0.406]
    std = [0.229, 0.224, 0.225]
    transform = transforms.Compose([
        transforms.Resize(int(img_size * 1.15)),
        transforms.CenterCrop(img_size),
        transforms.ToTensor(),
        transforms.Normalize(mean, std),
    ])
    
    # Cache
    _model_cache["model"] = model
    _model_cache["checkpoint"] = checkpoint
    _model_cache["device"] = dev
    _model_cache["transform"] = transform
    
    # Load Class Centroids for OOD detection
    centroids = None
    if CENTROIDS_PATH.exists():
        try:
            c_data = torch.load(CENTROIDS_PATH, map_location=dev)
            centroids = c_data.get("class_centroids")
        except Exception as e:
            print(f"[WARN] Could not load class centroids: {e}")
    _model_cache["centroids"] = centroids
    
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
    
    # Predict & Extract 1280-dim feature embedding representation
    with torch.no_grad():
        feat = model.features(input_tensor)
        feat = model.avgpool(feat)
        feat = torch.flatten(feat, 1)
        feat_norm = feat / (torch.norm(feat, p=2, dim=1, keepdim=True) + 1e-8)
        
        output = model.classifier(feat)
        probs = torch.softmax(output, dim=1)[0]
    
    # Free Energy Score: E(x) = -T * logsumexp(z / T)
    energy = float((-1.0 * torch.logsumexp(output, dim=1)).item())
    
    # Nearest Class Centroid Cosine Similarity
    centroids = _model_cache.get("centroids")
    if centroids is not None:
        sims = torch.mv(centroids.to(device), feat_norm.squeeze(0))
        max_sim = float(sims.max().item())
    else:
        max_sim = 1.0
        
    # Calibrated OOD Detection:
    # Empirical Threshold: max_sim < 0.58 indicates sample is outside the 33 PlantVillage classes
    is_ood = False
    error_type = None
    
    if max_sim < OOD_COSINE_THRESHOLD or energy > OOD_ENERGY_THRESHOLD:
        is_ood = True
        # Do not use energy alone to classify an image as non-plant (unseen plants like wheat can have diffuse energy).
        # Only categorize as NON_PLANT_IMAGE if feature representation is deeply decoupled from plant domain (< 0.20).
        if max_sim < 0.20:
            error_type = "NON_PLANT_IMAGE"
            message = "This image does not appear to be a crop leaf. AgriSmart AI only accepts plant foliage to prevent invalid diagnostic guidance."
            leaf_display_name = "⚠️ Non-Plant Image"
            guidance = [
                "AgriSmart AI detected that the uploaded image does not contain plant or leaf foliage.",
                "To get an accurate disease diagnosis, please photograph a leaf from one of our 9 supported crops.",
                "Ensure good daylight, hold the camera steady, and frame a single leaf in focus.",
            ]
        else:
            error_type = "UNSEEN_SPECIES_DETECTED"
            message = "The provided image does not match any of the 9 supported crops. Our system is trained exclusively on Apple, Cherry, Corn (Maize), Grape, Peach, Bell Pepper, Potato, Strawberry, and Tomato."
            leaf_display_name = "⚠️ Unsupported Plant"
            guidance = [
                "AgriSmart AI refused to guess on an unsupported species to prevent false treatment guidance.",
                "Ensure your crop is one of our 9 supported families: Apple, Cherry, Corn, Grape, Peach, Bell Pepper, Potato, Strawberry, Tomato.",
                "Upload a clear photograph showing the foliage of a supported crop.",
            ]
        
    if is_ood:
        return {
            "success": True,
            "is_supported_crop": False,
            "out_of_distribution": True,
            "error_type": error_type,
            "message": message,
            "detected_properties": {
                "is_plant": error_type == "UNSEEN_SPECIES_DETECTED",
                "confidence": 0.0,
                "cosine_similarity": round(max_sim, 4),
                "energy_score": round(energy, 2),
            },
            "supported_crops": SUPPORTED_CROPS,
            "class_label": "Unsupported_Crop" if error_type != "NON_PLANT_IMAGE" else "Non_Plant_Object",
            "crop": "Unsupported Crop" if error_type != "NON_PLANT_IMAGE" else "Non-Plant Object",
            "leaf_name": "Unknown Leaf" if error_type != "NON_PLANT_IMAGE" else "Not a Leaf",
            "leaf_display_name": leaf_display_name,
            "disease": "No supported disease",
            "severity": "Unknown",
            "guidance": guidance,
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
        "crop": crop,
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
