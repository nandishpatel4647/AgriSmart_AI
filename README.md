# 🌾 AgriSmart AI — Intelligent Agriculture for a Sustainable Future

> **SIH 2026 Internal Hackathon** — L. J. Institute of Engineering and Technology [C-433]  
> A complete, enterprise-grade AI decision-support platform featuring **ConvNeXt-Tiny Disease Detection (99.75% Macro-F1)**, **Dual Open-Set OOD Rejection**, **HiResCAM Spatial Attention Heatmaps**, **Vernacular Voice Interaction**, **FAO-56 Smart Irrigation**, **NDVI Satellite Mapping**, and **All 7 SIH Bonus Modules**.

---

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/PyTorch-2.1%2B-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" alt="PyTorch" />
  <img src="https://img.shields.io/badge/FastAPI-0.115%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Next.js-16.0%2B-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License" />
</p>

---

## 🎯 Executive Summary & Problem Framing

Agriculture faces urgent compounding challenges: rapid disease outbreaks, erratic climate shifts, soil degradation, and inefficient water utilization. Conventional AI tools often fail in real farm conditions because they operate under closed-set assumptions—bluffing with high false confidence on non-plant images or unsupported crops.

**AgriSmart AI** bridges this gap with an **honest, field-ready platform**:
1. **Mandatory Core Vision Task**: Fine-tuned `ConvNeXt-Tiny` backbone classifying 33 crop-disease conditions with **99.75% Macro-F1** on held-out field test benchmarks.
2. **Open-Set Trust Architecture**: Dual-metric feature space verification (**1280-dim Centroid Cosine Similarity + Free Energy Score**) that detects and strictly refuses to guess on out-of-distribution biological samples (e.g. Tulsi, Neem, Wheat, Ficus) or non-plant objects.
3. **HiResCAM Explainability**: Generates pixel-accurate Grad-CAM / HiResCAM spatial heatmaps pinpointing exact disease lesion boundaries.
4. **All 7 SIH Bonus Modules (A–G)**: Fully implemented crop recommendation, FAO-56 smart irrigation, Open-Meteo weather intelligence, ESG sustainability score, Gemini AI assistant with English/Hindi/Gujarati voice advisories, IoT telemetry, and an autonomous agentic decision loop.

---

## 🏗️ Platform Architecture & Data Flow

```
                                 🌾 AgriSmart AI Architecture
                                              │
    ┌───────────────────────────┬─────────────┴─────────────┬───────────────────────────┐
    │                           │                           │                           │
    ▼                           ▼                           ▼                           ▼
🔬 Vision Engine            🛡️ Quality & Safety         💧 Precision Agronomy       🤖 AI & Vernacular Voice
- ConvNeXt-Tiny (99.75%)     - Sharpness (Laplacian)     - FAO-56 Penman-Monteith    - Gemini AI Integration
- 33 Diagnostic Classes     - Dual Cosine Similarity    - Open-Meteo Weather Risk   - English, Hindi, Gujarati
- HiResCAM Heatmaps         - Free-Energy OOD Gate      - NDVI Satellite Mapping    - Web Speech STT & TTS
```

---

## 🏆 SIH 2026 Core & Bonus Modules Matrix (100% Coverage)

| Module ID | SIH Module Name | Status | Technical Implementation & Features | Primary Route / API |
| :---: | :--- | :---: | :--- | :--- |
| **CORE** | **Crop Disease Detection** | **✅ DONE** | `ConvNeXt-Tiny` backbone, 33 classes, 99.75% Macro-F1, HiResCAM heatmaps, single-command CLI & Python API. | `/detect`<br>`python model/predict.py` |
| **A** | **Crop Recommendation** | **✅ DONE** | Evaluates soil pH, temperature, humidity, rainfall, water budget, season, and crop rotation history against ICAR & FAO standards. | `/recommendation`<br>`/api/recommend_crop` |
| **B** | **Smart Irrigation** | **✅ DONE** | FAO-56 Penman-Monteith daily Evapotranspiration ($ET_0$) calculation with crop coefficient ($K_c$) and soil moisture triggers. | `/irrigation`<br>`/api/irrigation` |
| **C** | **Weather Intelligence** | **✅ DONE** | Open-Meteo live REST API integration with 7-day predictive micro-climate forecast and disease risk alerts. | `/weather`<br>`/api/weather` |
| **D** | **Sustainability Score** | **✅ DONE** | Published, reproducible ESG formula scoring water efficiency, resource optimization, and organic soil practices. | `/sustainability`<br>`/api/sustainability` |
| **E** | **Farmer Assistant (GenAI)** | **✅ DONE** | Conversational assistant powered by Google Gemini AI (with offline rule-based fallback) and English/Hindi/Gujarati voice support. | `/assistant`<br>`/api/assistant` |
| **F** | **IoT Integration** | **✅ DONE** | Streamed diurnal sensor feeds for air temp, humidity, soil moisture, pH, ambient lux, rainfall, and wind speed. | `/telemetry`<br>`/api/iot/sensors` |
| **G** | **Agentic Advisor** | **✅ DONE** | Autonomous decision loop continuously analyzing IoT feeds, weather forecasts, and disease risks to notify farmers. | `/dashboard`<br>`/api/advisor` |

---

## 🛡️ Open-Set AI Safety & Quality Gate

> Traditional deep learning classifiers force Softmax probabilities to sum to 1.0, causing them to "bluff" on unseen leaves or non-plant objects. AgriSmart AI solves this with a **Dual-Metric Open-Set Rejection Layer**.

```
                   Leaf / Field Image Input
                              │
                              ▼
            Photo Quality Gate (Laplacian Variance)
                (Sharpness > 10, Brightness > 40)
                              │
                              ▼
             PyTorch ConvNeXt-Tiny Feature Extractor
                              │
                              ▼
                 1280-dim Feature Embedding
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
    Centroid Cosine Similarity      Free Energy Score
       (Max Cosine vs 33)        E(x) = -T * logsumexp(z)
               │                             │
               └──────────────┬──────────────┘
                              ▼
                 Calibrated Rejection Filter
               (Cosine < 0.58 OR Energy > -45.0)
                              │
               ┌──────────────┴──────────────┐
          OOD (Unseen)                  ID (Supported)
               │                             │
               ▼                             ▼
      ⚠️ Refuse to Guess             ✅ Disease Diagnosis
  "Unsupported Crop Detected"      Condition, Confidence,
     False Chemical Averted         Grad-CAM & Guidance
```

### Empirical Calibration Metrics
- **Centroid Cosine Threshold**: `0.58`
- **Free Energy Threshold**: `-45.00` ($T=1.0$)
- **OOD Rejection Rate**: **100.00%** (7/7 evaluated unseen biological samples: Tulsi, Neem, Wheat, Ficus, Tractor)
- **ID Acceptance Rate**: **96.67%** (319/330 held-out validation samples)

---

## 📊 Model Benchmarks & Reproducibility

> **Zero Fabrication Guarantee**: Evaluated directly on the held-out test split (4,025 images) using `model/evaluate.py`.

| Metric | Benchmark Score | Description |
| :--- | :--- | :--- |
| **Macro-F1 (Primary Metric)** | **0.9975 (99.75%)** | Evaluated across all 33 diagnostic classes |
| **Accuracy (Overall)** | **0.9985 (99.85%)** | Held-out test split evaluation |
| **Validation Macro-F1** | 0.9967 (99.67%) | Validation split (4,025 images) |
| **Test Suite Pass Rate** | **71 / 71 (100%)** | `python -m pytest tests/ -v` |
| **Inference Speed** | **< 45 ms** | PyTorch GPU/CPU inference latency |

### 🔒 Model Artifact SHA-256 Hashes
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

## 🗣️ Vernacular Voice Advisory (English, Hindi, Gujarati)

AgriSmart AI supports regional voice-based interaction using browser-native Speech Recognition (STT) and Speech Synthesis (TTS):
- **Languages**: English (`en-IN`), Hindi / हिन्दी (`hi-IN`), Gujarati / ગુજરાતી (`gu-IN`).
- **Sanitized Speech Output**: Automatically strips markdown formatting, URLs, and technical codes before speaking.
- **Safety Guarantee**: When an OOD leaf is flagged, voice synthesis strictly refuses to speak disease treatment steps to prevent false pesticide application.

---

## 💻 Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide Icons, Framer Motion
- **Backend**: FastAPI 0.115+, Uvicorn, Python 3.10+, SQLite database with PBKDF2 password hashing & JWT authentication
- **Machine Learning**: PyTorch 2.1+, Torchvision, ConvNeXt-Tiny, NumPy, Pillow, Scipy, Matplotlib (Grad-CAM)
- **APIs & Data**: Open-Meteo REST API, Google Gemini 1.5 Flash API

---

## 🚀 Quick Start & Running Locally

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & `npm`

### 1. Clone & Install

```bash
git clone https://github.com/nandishpatel4647/AgriSmart_AI.git
cd AgriSmart_AI

# Install Python backend dependencies
pip install -r requirements.txt

# Install Next.js frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Mandatory Core Prediction CLI (Section 4.1 Requirement)

Run single-image prediction directly from the terminal:

```bash
# Execute prediction CLI
python model/predict.py --image frontend/public/samples/tomato_late_blight.jpg
```

### 3. Launch the Full Application

Start both FastAPI backend and Next.js frontend with a single command:

```bash
python run.py
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend REST API**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 4. Run Automated Test Suite (71 Tests)

```bash
python -m pytest tests/ -v
```

---

## 📂 Repository Structure

```
AgriSmart_AI/
├── model/                     # Core Vision & Predict Interface
│   ├── predict.py             # Mandatory CLI + Python prediction API
│   ├── train.py               # ConvNeXt-Tiny 2-phase fine-tuning script
│   ├── evaluate.py            # Held-out test evaluation & confusion matrix
│   ├── data_prep.py           # Stratified splitting & hash de-duplication
│   ├── calibrate_model.py     # Centroid Cosine & Energy calibration
│   └── download_dataset.py    # Dataset fetcher
├── backend/                   # FastAPI REST Microservices
│   ├── main.py                # FastAPI entry point & router registration
│   ├── auth_utils.py          # PBKDF2 hashing & JWT isolation
│   ├── advisor.py             # Agentic Autonomous Decision Engine
│   └── routers/               # Microservice Endpoints
│       ├── predict_router.py  # Disease classification & HiResCAM router
│       ├── crop_recommendation_router.py # Bonus A: Crop Recommendation
│       ├── irrigation_router.py # Bonus B: FAO-56 Smart Irrigation
│       ├── weather_router.py  # Bonus C: Open-Meteo Weather Risk
│       ├── sustainability_router.py # Bonus D: Sustainability Score
│       ├── assistant_router.py# Bonus E: Gemini AI & Vernacular Assistant
│       ├── iot_router.py      # Bonus F: Simulated Diurnal IoT Sensors
│       ├── scans_router.py    # Saved Diagnosis History & My Farm
│       ├── farm_router.py     # NDVI Satellite Mapping
│       ├── crop_router.py     # Crop Rotation Planner
│       └── auth_router.py     # User Authentication & Profiles
├── frontend/                  # Next.js 16 Web Application
│   └── app/
│       ├── page.tsx           # Minimal Landing Page
│       ├── dashboard/page.tsx # Main Dashboard & Agentic Advisor Visualizer
│       ├── detect/page.tsx    # Leaf Scanner & HiResCAM Heatmap
│       ├── recommendation/    # Bonus A: Crop Recommendation UI
│       ├── weather/page.tsx   # Bonus C: Live Weather Intelligence
│       ├── assistant/page.tsx # Bonus E: AI & Voice Assistant
│       ├── irrigation/        # Bonus B & D: Water & Sustainability
│       ├── telemetry/page.tsx # Bonus F: IoT Telemetry Dashboard
│       ├── map/page.tsx       # Satellite NDVI Field Mapping
│       ├── rotation/page.tsx  # Crop Rotation Planner
│       ├── history/page.tsx   # Saved Scan History
│       ├── my-farm/page.tsx   # Personalized Farmer Workspace
│       ├── analytics/         # Farm Analytics
│       ├── settings/          # Location & Preferences
│       └── (auth)/            # Login & Signup
├── report/                    # Mandatory Hackathon Submission Reports
│   ├── model_report.md        # One-Page Model Report (Section 7.3)
│   ├── confusion_matrix.png   # 33-Class Confusion Matrix Plot
│   └── metrics.json           # Empirical test evaluation metrics
├── ml/artifacts/              # Reproducibility Manifests & Weights
│   ├── class_centroids.pt     # 1280-dim Class Centroids for OOD Rejection
│   ├── split_manifest.json    # Exact train/val/test split record
│   └── metrics.json           # Verification metrics log
├── weights/                   # Trained PyTorch Model Weights
│   ├── agrismart_convnext.pt  # Fine-tuned ConvNeXt-Tiny weights (111 MB)
│   └── class_mapping.json     # Class index mapping dictionary
├── tests/                     # Automated Pytest Suite (71 Tests)
├── requirements.txt           # Python dependencies
├── run.py                     # Production-grade dual server launcher
└── README.md                  # Comprehensive Documentation
```

---

## 📄 One-Page Model Report & Reproducibility

Per Section 7.3 of the SIH Challenge Specification, the complete 1-page model report detailing task framing, dataset splits, ConvNeXt-Tiny hyperparameters, baseline comparisons, and failure mode analysis is published at:

👉 **[report/model_report.md](file:///c:/Users/dhair/Downloads/AgriSmart_AI-main/AgriSmart_AI-main/report/model_report.md)**

---

## 👥 Team & License

Developed for **SIH 2026 Internal Hackathon** — L. J. Institute of Engineering and Technology [C-433].

Released under the **[MIT License](LICENSE)**.
