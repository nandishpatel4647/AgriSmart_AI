import sys
from PIL import Image
import numpy as np
from matplotlib.colors import rgb_to_hsv

def _is_likely_plant(image_path):
    try:
        image = Image.open(image_path).convert("RGB")
        img_small = image.resize((50, 50))
        img_array = np.array(img_small) / 255.0
        
        hsv = rgb_to_hsv(img_array)
        h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
        
        # Plant hue: roughly between orange (0.05) and cyan (0.5)
        # S and V must be high enough to not be gray/white/black
        plant_mask = (h >= 0.05) & (h <= 0.50) & (s >= 0.15) & (v >= 0.15)
        
        plant_ratio = np.sum(plant_mask) / (50 * 50)
        return plant_ratio
    except Exception as e:
        print(f"Error: {e}")
        return 0

# Test on some samples
samples = [
    "frontend/public/samples/apple_scab.jpg",
    "frontend/public/samples/corn_common_rust.jpg",
    "frontend/public/hero_farmer_field.jpg"
]

for s in samples:
    ratio = _is_likely_plant(s)
    print(f"{s}: {ratio:.4f}")
