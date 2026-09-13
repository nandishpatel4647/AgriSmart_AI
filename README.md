# 🌾 AgriSmart AI — Intelligent Agriculture for a Sustainable Future

> **SIH 2026** — AI-powered crop disease detection and smart agriculture advisory platform

[![Python](https://img.shields.io/badge/Python-3.13-blue.svg)](https://python.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.11-red.svg)](https://pytorch.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green.svg)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)

---

## 🎯 What It Does

AgriSmart AI is a **complete farmer decision-support system** that helps farmers:

1. **🔬 Detect Crop Diseases** — Upload a leaf photo → AI identifies the disease, severity, and provides treatment guidance
2. **🌤️ Weather Intelligence** — Live weather data with disease risk assessment alerts
3. **💧 Smart Irrigation** — Rule-based irrigation recommendations with documented FAO-derived thresholds
4. **🌿 Sustainability Score** — Published, reproducible formula scoring farming practices
5. **🤖 AI Assistant** — Context-grounded farming advisor (Gemini AI + offline fallback)
6. **📡 IoT Dashboard** — Simulated sensor feed with realistic diurnal patterns *(labeled as simulated)*

---

## 🏗️ Architecture

```
AgriSmart AI
├── model/            # ML Pipeline
│   ├── download_dataset.py    # PlantVillage dataset fetcher
│   ├── data_prep.py           # Stratified split + leakage verification
│   ├── train.py               # EfficientNet-B0 training (2-phase, mixed precision)
│   ├── evaluate.py            # Macro-F1, confusion matrix, per-class metrics
│   └── predict.py             # Inference + disease guidance database
│
├── backend/          # FastAPI REST API
│   ├── main.py                # App entry + model preloading
│   └── routers/
│       ├── predict_router.py      # Image upload + prediction + Grad-CAM
│       ├── weather_router.py      # Open-Meteo + disease risk rules
│       ├── irrigation_router.py   # FAO-based irrigation engine
│       ├── sustainability_router.py # Published score formula
│       ├── assistant_router.py    # Gemini + rule-based fallback
│       └── iot_router.py          # Simulated IoT sensors
│
├── frontend/         # Next.js 16 + Tailwind
│   └── app/
│       ├── page.tsx           # Dashboard
│       ├── detect/page.tsx    # Disease detection (upload + results)
│       ├── weather/page.tsx   # Weather intelligence
│       └── assistant/page.tsx # AI chat assistant
│
├── ml/artifacts/     # Reproducibility artifacts
│   ├── class_mapping.json     # Class index ↔ label mapping
│   └── split_manifest.json    # Exact train/val/test split record
│
└── data/             # Dataset directory (not in git)
    ├── raw/          # PlantVillage images (junction to kaggle cache)
    └── split/        # Stratified train/val/test split
```

---

## 🧠 Model Details

| Property | Value |
|---|---|
| Architecture | EfficientNet-B0 (pretrained ImageNet) + custom classification head |
| Classes | 33 crop-disease classes from PlantVillage |
| Training | 2-phase: frozen backbone (3 epochs) → full fine-tune (12 epochs) |
| Precision | Mixed precision (FP16) for 6GB VRAM efficiency |
| Optimizer | AdamW + CosineAnnealingLR |
| Loss | CrossEntropy with inverse-frequency class weights |
| Evaluation | Macro-F1, per-class precision/recall, confusion matrix |
| Reproducibility | Seed=42, split manifest, class mapping, full training config saved |

### Crops Covered
Apple, Cherry, Corn (Maize), Grape, Peach, Bell Pepper, Potato, Strawberry, Tomato

### Diseases Detected
Bacterial Spot, Early Blight, Late Blight, Leaf Mold, Septoria Leaf Spot, Spider Mites, Target Spot, Mosaic Virus, Yellow Leaf Curl Virus, Black Rot, Cedar Rust, Powdery Mildew, Cercospora Leaf Spot, Common Rust, Northern Leaf Blight, Esca, Leaf Blight, Leaf Scorch, and Healthy classifications.

---

## 📈 Evaluation & Real Benchmarks

> **Zero Fabrication Guarantee**: All metrics below were computed directly by running `model/evaluate.py` on the held-out `test` split (4,025 real images) and logged to `ml/artifacts/metrics.json`.

| Metric | Score | Split / Samples |
|---|---|---|
| **Macro-F1 (Primary Metric)** | **0.9956 (99.56%)** | Held-out test split (4,025 images) |
| **Accuracy (Supplementary)** | **0.9970 (99.70%)** | Held-out test split (4,025 images) |
| **Validation Macro-F1** | 0.9967 (99.67%) | Validation split (4,000+ images) |
| **Model Size** | 15.7 MB (`best_model.pth`) | EfficientNet-B0 fine-tuned |
| **Test Suite Pass Rate** | **15 / 15 (100%)** | `pytest tests/ -v` (Unit + Integration) |

### Reproduce Evaluation Locally

```bash
# Run official evaluation on test split
python model/evaluate.py --split test

# Run full test suite (unit + API integration)
python -m pytest tests/ -v
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.13+
- Node.js 18+
- NVIDIA GPU with CUDA (recommended) or CPU

### 1. Clone & Install

```bash
git clone https://github.com/nandishpatel4647/AgriSmart_AI.git
cd AgriSmart_AI

# Python dependencies
pip install -r requirements.txt

# For CUDA GPU support:
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128

# Frontend
cd frontend && npm install && cd ..
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env to add your GEMINI_API_KEY (optional — app works without it)
```

### 3. Train the Model (or use pre-trained weights)

```bash
# Download dataset
python model/download_dataset.py

# Prepare data split
python model/data_prep.py

# Train
python model/train.py --batch-size 24 --epochs-frozen 3 --epochs-unfrozen 12 --mixed-precision
```

### 4. Run the Application

```bash
# Terminal 1 — Backend
cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Visit **http://localhost:3000** to use the application.

---

## 🔒 Integrity Guarantees

- **No fabricated metrics** — All accuracy numbers come from actual `evaluate.py` runs on held-out test sets
- **No mocked predictions** — Disease detection uses the real trained model, never random or hardcoded results
- **No pretend AI** — Assistant clearly labels Gemini responses vs. rule-based fallback
- **Simulated IoT labeled** — IoT sensor data is explicitly marked as simulated at every level
- **Published formulas** — Sustainability score formula is documented in code and API responses
- **Reproducible splits** — Exact train/val/test split recorded with seed, ratios, and file-level manifest

---

## 📊 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/status` | GET | System status + feature flags |
| `/api/predict` | POST | Upload image → disease prediction + Grad-CAM |
| `/api/weather` | GET | Current weather + 7-day forecast + disease risk |
| `/api/irrigation` | POST | Smart irrigation recommendation |
| `/api/sustainability` | POST | Sustainability score calculation |
| `/api/sustainability/formula` | GET | Published formula documentation |
| `/api/assistant` | POST | AI farming assistant (Gemini + fallback) |
| `/api/iot/sensors` | GET | Simulated sensor readings |
| `/api/iot/history` | GET | Simulated sensor history |

---

## 👥 Team

Built for **SIH 2026 Internal Hackathon**

---

## 📄 License

MIT License
