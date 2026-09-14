import os
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score

ARTIFACTS_DIR = Path(__file__).parent / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

# Synthetic data rules for Crop Rotation
# Nitrogen fixing crops: Soybeans, Legumes, Peanuts, Peas
# High N demand crops: Corn, Wheat, Cotton, Sugarcane

def generate_synthetic_data(num_samples=2000):
    regions = ["North", "South", "East", "West", "Central"]
    previous_crops = ["Corn", "Wheat", "Cotton", "Soybeans", "Legumes", "Peanuts", "Sugarcane", "Rice", "None"]
    
    data = []
    for _ in range(num_samples):
        prev_crop = np.random.choice(previous_crops)
        region = np.random.choice(regions)
        rainfall = np.random.uniform(200, 1500) # mm
        
        # NPK
        if prev_crop in ["Corn", "Wheat", "Cotton", "Sugarcane"]:
            # These deplete N
            n = np.random.uniform(10, 40)
        elif prev_crop in ["Soybeans", "Legumes", "Peanuts"]:
            # These fix N
            n = np.random.uniform(60, 100)
        else:
            n = np.random.uniform(20, 80)
            
        p = np.random.uniform(20, 80)
        k = np.random.uniform(20, 80)
        
        # Determine best next crop based on logic
        # 1. If N is low (prev was Corn), plant Legume/Soybean
        # 2. If N is high, plant high N demanding crop like Corn or Wheat
        if n < 40:
            target_crop = np.random.choice(["Soybeans", "Legumes", "Peanuts", "Peas"])
        elif n > 60:
            target_crop = np.random.choice(["Corn", "Wheat", "Cotton", "Sugarcane"])
        else:
            # Medium N
            if rainfall > 800:
                target_crop = np.random.choice(["Rice", "Sugarcane"])
            else:
                target_crop = np.random.choice(["Millet", "Sorghum", "Wheat"])
                
        data.append([prev_crop, n, p, k, rainfall, region, target_crop])
        
    return pd.DataFrame(data, columns=["previous_crop", "N", "P", "K", "rainfall", "region", "target_crop"])


def train_model():
    print("[INFO] Generating synthetic historical yield and soil dataset...")
    df = generate_synthetic_data(3000)
    
    print("[INFO] Preprocessing data...")
    # Encode categoricals
    le_prev = LabelEncoder()
    le_region = LabelEncoder()
    le_target = LabelEncoder()
    
    df['prev_encoded'] = le_prev.fit_transform(df['previous_crop'])
    df['region_encoded'] = le_region.fit_transform(df['region'])
    y = le_target.fit_transform(df['target_crop'])
    
    X = df[['prev_encoded', 'N', 'P', 'K', 'rainfall', 'region_encoded']]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("[INFO] Training Random Forest model...")
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    
    preds = clf.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"[INFO] Model Accuracy: {acc * 100:.2f}%")
    
    print("[INFO] Saving artifacts...")
    joblib.dump(clf, ARTIFACTS_DIR / "crop_rf_model.joblib")
    
    # Save encoders for the API router to use
    encoders = {
        "prev_crop": le_prev,
        "region": le_region,
        "target": le_target
    }
    joblib.dump(encoders, ARTIFACTS_DIR / "crop_encoders.joblib")
    print(f"[INFO] Saved to {ARTIFACTS_DIR}")

if __name__ == "__main__":
    train_model()
