# 🌾 AgriSmart AI — Intelligent Agriculture & Disease Diagnosis Engine

> **SIH 2026** — Enterprise-grade AI platform featuring **ConvNeXt-Tiny disease classification (99.75% Macro-F1)**, **Open-Set OOD Rejection**, **Grad-CAM visual explainability**, **FAO-56 smart irrigation**, **ESG Sustainability Engine**, **Soil-Aware Crop Recommendation**, and **Vernacular Voice advisories**.

---

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/PyTorch-2.1%2B-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" alt="PyTorch" />
  <img src="https://img.shields.io/badge/FastAPI-0.115%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Next.js-16.0%2B-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Tests-68%2F68%20Passed-brightgreen?style=for-the-badge" alt="Tests" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License" />
</p>

---


## Live Deployment:
https://agrismart-ai-sih.vercel.app/
Note: Some features and functionalities may not work as expected in the live deployment. For the most accurate and complete evaluation of the application, it is recommended to run the project locally.

## Demo Video: 
https://drive.google.com/file/d/1YO7PsgQMPfOD9UIEY_GI5VEaqP0-k54D/view?usp=sharing


## 🚀 Quickstart (< 5 Minutes Setup)

Follow these simple steps to launch both the FastAPI backend and Next.js frontend concurrently:

### Step 1: Clone Repository
```bash
git clone https://github.com/nandishpatel4647/AgriSmart_AI.git
cd AgriSmart_AI
```

### Step 2: Install Dependencies
```bash
# 1. Install Python requirements
pip install -r requirements.txt

# 2. Install Next.js frontend dependencies
cd frontend
npm install
cd ..
```

### Step 3: Launch Unified Application Runner
```bash
python run.py
```
This automatically starts both services and displays active local endpoints:
- 🌐 **Frontend Dashboard**: [http://localhost:3005](http://localhost:3005) (or `http://localhost:3000`)
- ⚡ **FastAPI Backend**: [http://localhost:8000](http://localhost:8000)
- 📑 **Interactive API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Step 4: Run Automated Verification Tests
```bash
pytest tests/ -v
```

---

## 🌟 System Architecture & Capabilities

```
                                      🌾 AgriSmart AI Architecture
                                                   │
    ┌───────────────────────────┬──────────────────┴──────────────────┬───────────────────────────┐
    │                           │                                     │                           │
    ▼                           ▼                                     ▼                           ▼
🔬 Disease Engine           🛡️ Open-Set Safety                    💧 Precision Agronomy       🌱 ESG Sustainability
- ConvNeXt-Tiny (99.75%)     - Image Quality Gate (Blur/Dark)      - FAO-56 Penman-Monteith    - Published Formula Engine
- 33 Diagnostic Classes     - Dual Cosine Centroid Distance       - 24hr GPS Rain Forecast    - 40% Water + 30% Soil
- Grad-CAM Heatmaps         - Free-Energy Outlier Rejection       - Dosage (mm & L/m²)        - Interactive Farm Simulator
```

---

## 🧠 Core Features & Modules

### 1. 🔬 ConvNeXt-Tiny Crop Disease Diagnosis & Grad-CAM Heatmaps
- **High Accuracy Backbone**: Fine-tuned ConvNeXt-Tiny model trained across 33 diagnostic crop-disease classes.
- **Grad-CAM Visual Explainability**: Computes gradient-weighted class activation heatmaps to highlight exact visual lesion regions on leaf surfaces.
- **Actionable Remediation**: Generates tailored organic treatment, chemical intervention, and preventive cultural practices.

### 2. 🛡️ Dual-Layer Out-of-Distribution (OOD) Safety Gate
- **Quality Inspection**: Automatically evaluates sharpness, brightness, and leaf candidate structure before model execution.
- **Centroid & Energy Distance**: Evaluates 768-dimensional feature-space cosine similarity against trained centroids and Free-Energy scores.
- **Non-Plant & Unseen Species Guard**: Safely rejects non-plant objects (e.g. phones, pets) and unsupported plant species (e.g. Tulsi, Neem, Wheat) to prevent incorrect pesticide prescriptions.

### 3. 💧 FAO-56 Precision Smart Irrigation Engine
- **Evapotranspiration Calculation**: Implements FAO-56 Penman-Monteith reference crop evapotranspiration calibrated by growth stages ($K_c$: Seedling 0.6x, Vegetative 0.8x, Flowering 1.0x, Fruiting 1.2x, Harvest 0.5x).
- **GPS Meteorological Integration**: Reads real-time Open-Meteo & wttr.in weather data. If rain is forecasted within 24 hours, automatically alerts `"DELAY IRRIGATION (SAVE WATER)"`.

### 4. 🌱 ESG Sustainability Score & Farm Practice Simulator
- **Standardized Index Formula**:
  $$\text{Total Score} = 0.40 \times \text{Water Efficiency} + 0.30 \times \text{Resource Use} + 0.30 \times \text{Crop Health}$$
- **Interactive Simulator**: Dynamic ROI calculator allowing farmers to adjust Drip Irrigation (+10), Rainwater Harvesting (+10), Organic Pest Control (+20), and Crop Rotation (+15) to simulate instant water savings and sustainability scores.

### 5. 🌾 Soil-Aware Crop Recommendation & Bag Calculator
- **Multi-Factor Selection**: Evaluates soil N-P-K ratios, pH level, temperature, humidity, rainfall, water availability, and season (Kharif, Rabi, Zaid).
- **Practical Fertilizer Dosage**: Converts technical N-P-K requirements into practical fertilizer bag counts (e.g. "2.5 bags Urea, 1.3 bags DAP, 1.0 bag Potash per acre").

### 6. 🎙️ Vernacular Voice Reader & Multilingual Agronomist
- **1-Click Voice Advisory**: Text-to-speech audio advisories in **English**, **Hindi (`hi-IN`)**, and **Gujarati (`gu-IN`)**.
- **Gemini GenAI + Offline Fallback**: Powered by Google Gemini AI with a 100% offline rule-based fallback if no API key is set.

---

## 📊 Benchmarks & Verification Results

| Metric | Benchmark Score | Description |
| :--- | :--- | :--- |
| **Macro-F1 Score** | **0.9956 (99.56%)** | Evaluated on held-out test split (4,025 images) |
| **Overall Accuracy** | **0.9970 (99.70%)** | Evaluated on held-out validation split |
| **OOD Rejection Rate** | **100.00%** | Tested against non-plants and unseen species |
| **Inference Latency** | **< 45 ms** | PyTorch GPU/CPU inference speed |
| **Automated Test Coverage** | **68 / 68 (100% Passed)** | Full pytest suite execution |

---

## 📂 Project Directory Structure

```
AgriSmart_AI/
├── backend/                  # FastAPI Web Backend
│   ├── main.py               # Main application entry point & CORS
│   ├── advisor.py            # Unified Cross-Source Agronomist Advisor
│   └── routers/              # Modular API Endpoints
│       ├── predict_router.py
│       ├── weather_router.py
│       ├── irrigation_router.py
│       ├── sustainability_router.py
│       ├── assistant_router.py
│       ├── farm_router.py
│       ├── auth_router.py
│       └── crop_recommendation_router.py
├── frontend/                 # Next.js 16 Web Application
│   ├── app/                  # Next.js App Router Pages
│   │   ├── page.tsx          # Home / Landing Page
│   │   ├── detect/           # Disease Detection & Heatmap UI
│   │   ├── weather/          # Live Meteorological Dashboard
│   │   ├── irrigation/       # Smart Irrigation Calculator
│   │   ├── sustainability/   # ESG Score & Farm Simulator
│   │   ├── recommendation/   # Soil NPK & Crop Advisor
│   │   ├── assistant/        # AI Voice & Chat Assistant
│   │   └── telemetry/        # IoT Live Sensor Feed
│   └── app/lib/              # API Client & TypeScript Interfaces
├── model/                    # ML Model & Inference Core
│   ├── predict.py            # Inference engine with Grad-CAM & OOD
│   └── weights/              # ConvNeXt weights & OOD thresholds
├── ml/                       # Training, Calibration & OOD Scripts
├── tests/                    # Automated Pytest Suite (68 tests)
└── run.py                    # Unified Local Runner & Orchestrator
```

---

## 📡 API Reference Endpoint Table

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | System health check & service status |
| `/api/status` | `GET` | GPU status, model loading state & active features |
| `/api/predict` | `POST` | Leaf photo upload $\rightarrow$ Diagnosis, confidence %, Grad-CAM heatmap |
| `/api/weather` | `GET` | Open-Meteo live weather forecast & 7-day rain probabilities |
| `/api/weather/search` | `GET` | Location search & coordinate lookup |
| `/api/irrigation` | `POST` | FAO-56 Penman-Monteith daily water needs ($mm$ and $L/m^2$) |
| `/api/sustainability` | `POST` | ESG score calculation & practice simulator |
| `/api/crop-recommendation` | `POST` | Soil NPK & climate-based crop recommendations |
| `/api/assistant` | `POST` | Gemini GenAI agronomist assistant (multilingual + voice) |
| `/api/advisor` | `POST` | Multi-source unified farm advisory generator |

---

## 🔑 Environment Configuration (`.env`)

Create a `.env` file in the project root:

```env
# Optional: Gemini API Key for Live GenAI Assistant
# If left empty, AgriSmart uses its 100% offline rule engine fallback
GEMINI_API_KEY=

# Default Location Context (Ahmedabad, Gujarat)
DEFAULT_LATITUDE=23.0225
DEFAULT_LONGITUDE=72.5714

# Service Ports
BACKEND_PORT=8000
FRONTEND_PORT=3005
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 👥 Team & License

Developed for **SIH 2026 Internal Hackathon**.  
Distributed under the **[MIT License](LICENSE)**.
