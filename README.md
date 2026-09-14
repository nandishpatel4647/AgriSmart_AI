# 🌾 AgriSmart AI — Next-Gen Intelligent Agriculture & Disease Diagnosis

> **SIH 2026** — Enterprise-grade AI platform featuring **ConvNeXt-Tiny disease classification (99.75% Macro-F1)**, **Open-Set OOD Rejection**, **HiResCAM spatial heatmap explainability**, **FAO-56 smart irrigation**, **NDVI satellite field mapping**, and **Vernacular Voice advisories**.

---

<p center>
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/PyTorch-2.1%2B-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" alt="PyTorch" />
  <img src="https://img.shields.io/badge/FastAPI-0.115%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Next.js-16.0%2B-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License" />
</p>

---

## 🌟 Key Platform Capabilities

AgriSmart AI is a **unified, end-to-end decision-support platform** designed to bring state-of-the-art computer vision, open-set safety, and precision agronomy directly to farmers.

```
                                 🌾 AgriSmart AI Architecture
                                              │
    ┌───────────────────────────┬─────────────┴─────────────┬───────────────────────────┐
    │                           │                           │                           │
    ▼                           ▼                           ▼                           ▼
🔬 Disease Engine           🛡️ Quality & OOD           💧 Precision Agronomy       🤖 Farmer AI & Voice
- ConvNeXt-Tiny (99.75%)     - Sharpness/Blur Gate       - FAO-56 Penman-Monteith    - Gemini AI Integration
- 33 Diagnostic Classes     - Dual Cosine Similarity    - Open-Meteo Weather Risk   - English/Hindi/Gujarati
- HiResCAM Heatmaps         - Free-Energy Rejection     - NDVI Satellite Mapping    - Browser-Native Speech
```

### 1. 🔬 ConvNeXt-Tiny Disease Detection & Explainability
- **Modern Backbone**: Built on fine-tuned `ConvNeXt-Tiny` architecture trained across 33 crop-disease conditions.
- **HiResCAM Heatmap Overlays**: Generates pixel-accurate Grad-CAM / HiResCAM attention maps highlighting precise lesion boundaries on diseased leaves.
- **Precautionary Action Plans**: Delivers step-by-step treatment protocols and containment procedures.

### 2. 🛡️ Photo Quality Gate & Open-Set OOD Safety
- **Quality Inspection**: Automatically verifies sharpness (Laplacian variance), exposure, and brightness before model execution.
- **Open-Set Rejection Layer**: Utilizes dual-metric feature space verification (**1280-dim Centroid Cosine Similarity** + **Numerically Stable Free Energy Scores**) to detect and refuse diagnosis on non-plant objects or unsupported plant species (e.g., Tulsi, Neem, Wheat).

### 3. 🌤️ Weather Intelligence & FAO-56 Smart Irrigation
- **Live Agro-Weather**: Integrates Open-Meteo API for real-time temperature, humidity, wind, and 7-day predictive crop risk alerts.
- **Penman-Monteith Evapotranspiration (ET0)**: Calculates precise daily water requirements based on crop coefficient ($K_c$) and soil moisture triggers.

### 4. 🗺️ Satellite NDVI Mapping & Crop Analytics
- **NDVI Vegetation Monitoring**: Tracks crop vigor, chlorophyll absorption, and moisture stress across farm plots.
- **Crop Rotation Planner**: Recommends multi-season crop sequencing to replenish soil nitrogen, break disease cycles, and maximize yield.

### 5. 🗣️ Multilingual Vernacular Voice Assistant
- **Zero-Barrier Access**: Supports **English**, **Hindi (हिन्दी)**, and **Gujarati (ગુજરાતી)** voice interaction using browser-native speech synthesis (TTS) and speech recognition (STT).
- **Gemini AI + Offline Fallback**: Answers complex agronomy queries using Google Gemini AI, with automatic offline rule-based fallback.

---

## 📸 Platform Experience & Screenshots

| Feature | Description | Key Modules |
| :--- | :--- | :--- |
| **Leaf Scanner** | Upload/drag leaf photos with instant quality validation and sample tests | `frontend/app/detect/page.tsx` |
| **Diagnostic Result** | High-contrast disease labels, confidence %, and side-by-side Grad-CAM heatmaps | `backend/routers/predict_router.py` |
| **Open-Set Rejection** | Friendly safety warning when uploading unsupported plant species or non-leaf items | `model/predict.py` |
| **My Farm & Scan History** | Chronological record of saved diagnoses, crop filtering, and overall farm health | `frontend/app/history/page.tsx` |
| **Telemetry & IoT** | Diurnal sensors for temperature, moisture, pH, rainfall, and wind speed | `backend/routers/iot_router.py` |

---

## 🧠 Model Benchmarks & Integrity

> **Zero Fabrication Guarantee**: All metrics below were computed directly on the held-out test split (4,025 images) and verified via automated test scripts.

| Metric | Benchmark Score | Description |
| :--- | :--- | :--- |
| **Macro-F1 (Primary Metric)** | **0.9975 (99.75%)** | Evaluated across all 33 diagnostic classes |
| **Accuracy (Overall)** | **0.9985 (99.85%)** | Held-out test split evaluation |
| **OOD Rejection Rate** | **100.00%** | Tested against 7 unseen biological & non-plant samples |
| **Inference Time** | **< 45 ms** | PyTorch GPU/CPU inference speed per frame |
| **Test Suite Pass Rate** | **71 / 71 (100%)** | Automated pytest suite execution |

### 🔒 Model File SHA-256 Hashes
To guarantee 100% model code & weights identity:

```bash
weights/agrismart_convnext.pt     0ba896c30300d148a8a0e480ebe01f4287be8df843a3ec4af2daaeb3fee2f229
ml/artifacts/class_centroids.pt   c35ceb616f80c6c6cd66b75a4ca5de601c54ec8156105a1232eab36baff6151a
weights/class_mapping.json        3ca05a607fea3038bcfec759f63df5c0e83e76eb4b4c7afde4019b1b9017c37f
model/predict.py                  6d024a9504dfb81cb4681e5bd1bbe141c004b73196f7e4044458f988eeac7cf7
src/model.py                      7a88f168444752cfc3ea8b9f16a2c327ad13d9d926f15f60d6caeba73530f1d9
src/train.py                      06d25b77ced2a5e8722613026e93505acc619a9aa5f27e223315460773504780
```

---

## 🌿 9 Supported Crop Families & 33 Conditions

AgriSmart AI provides specialized diagnostic coverage for 9 core agricultural crops:

- **Apple**: Scab, Black Rot, Cedar Rust, Healthy
- **Cherry**: Powdery Mildew, Healthy
- **Corn (Maize)**: Cercospora Leaf Spot, Common Rust, Northern Leaf Blight, Healthy
- **Grape**: Black Rot, Esca (Black Measles), Leaf Blight, Healthy
- **Peach**: Bacterial Spot, Healthy
- **Bell Pepper**: Bacterial Spot, Healthy
- **Potato**: Early Blight, Late Blight, Healthy
- **Strawberry**: Leaf Scorch, Healthy
- **Tomato**: Bacterial Spot, Early Blight, Late Blight, Leaf Mold, Septoria, Spider Mites, Target Spot, Mosaic Virus, Yellow Leaf Curl Virus, Healthy

---

## ⚡ Quick Start & Installation

### Prerequisites
- **Python 3.10+** (Python 3.13 supported)
- **Node.js 18+** & `npm`
- **PyTorch 2.1+**

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/nandishpatel4647/AgriSmart_AI.git
cd AgriSmart_AI

# Install Python backend requirements
pip install -r requirements.txt

# Install Next.js frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
# Optional: Add GEMINI_API_KEY in .env for Gemini AI integration
```

### 3. Launch the Complete Application

Run the unified runner script to start both the FastAPI backend and Next.js frontend:

```bash
python run.py
```

- **Next.js Frontend**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend API**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/diagnose` | `POST` | Upload image $\rightarrow$ quality assessment, disease prediction, Grad-CAM heatmap |
| `/api/predict` | `POST` | Primary inference endpoint (multipart image upload) |
| `/api/weather` | `GET` | Live Open-Meteo weather intelligence & crop risk evaluation |
| `/api/irrigation` | `POST` | Smart irrigation scheduler based on FAO-56 Penman-Monteith |
| `/api/sustainability` | `POST` | ESG sustainability score calculation engine |
| `/api/assistant` | `POST` | AI Agronomist Chat endpoint (Gemini AI + rule fallback) |
| `/api/iot/sensors` | `GET` | Real-time simulated IoT sensor telemetry |
| `/api/iot/history` | `GET` | Historical IoT sensor trend data |
| `/api/auth/signup` | `POST` | Farmer account registration (PBKDF2 salted hash) |
| `/api/auth/login` | `POST` | Farmer authentication & JWT issuance |
| `/api/scans` | `GET` / `POST` | Saved diagnosis history & farm tracking |
| `/api/health` | `GET` | Service status check |

---

## 🧪 Automated Testing

Run the full automated pytest suite (71 test cases covering vision inference, OOD rejection, voice sanitization, REST APIs, and auth isolation):

```bash
python -m pytest tests/ -v
```

---

## 👥 Team & License

Developed for **SIH 2026 Internal Hackathon**.

Released under the **[MIT License](LICENSE)**.
