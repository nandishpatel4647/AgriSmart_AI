from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
from pathlib import Path

router = APIRouter()

# Load models and encoders
ARTIFACTS_DIR = Path(__file__).parent.parent.parent / "ml" / "artifacts"
try:
    rf_model = joblib.load(ARTIFACTS_DIR / "crop_rf_model.joblib")
    encoders = joblib.load(ARTIFACTS_DIR / "crop_encoders.joblib")
    le_prev = encoders["prev_crop"]
    le_region = encoders["region"]
    le_target = encoders["target"]
except Exception as e:
    print(f"[WARN] Crop Recommendation ML Model not loaded: {e}")
    rf_model = None

class CropRequest(BaseModel):
    previous_crop: str
    n: float
    p: float
    k: float
    rainfall: float
    region: str

@router.post("/predict_rotation")
def recommend_crop(req: CropRequest):
    if not rf_model:
        raise HTTPException(500, "Crop Recommendation ML Model is not available.")
    
    try:
        # Encode inputs safely
        prev_encoded = le_prev.transform([req.previous_crop])[0] if req.previous_crop in le_prev.classes_ else 0
        region_encoded = le_region.transform([req.region])[0] if req.region in le_region.classes_ else 0
        
        # Prepare input df
        input_data = pd.DataFrame([{
            'prev_encoded': prev_encoded,
            'N': req.n,
            'P': req.p,
            'K': req.k,
            'rainfall': req.rainfall,
            'region_encoded': region_encoded
        }])
        
        # Get probabilities for top 3
        probs = rf_model.predict_proba(input_data)[0]
        top_3_idx = probs.argsort()[-3:][::-1]
        
        recommendations = []
        for idx in top_3_idx:
            crop_name = le_target.inverse_transform([idx])[0]
            confidence = probs[idx] * 100
            recommendations.append({"crop": crop_name, "confidence": round(confidence, 1)})
            
        return {
            "success": True,
            "recommendations": recommendations,
            "soil_health_context": "High nitrogen demand detected." if req.n > 50 else "Consider nitrogen-fixing legumes."
        }
    except Exception as e:
        raise HTTPException(500, str(e))
