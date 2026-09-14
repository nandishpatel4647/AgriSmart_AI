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
7. **🌱 My Farm & Scan History** — Personal farmer workspace with Recent Crop Health records derived from saved scans

---

## 🌾 Detect First → Personalize Later

AgriSmart AI follows a transparent, farmer-first product philosophy:

- **Guest Farmers (Instant Access):**
  `Scan → Diagnose → Act`
  - Completely unrestricted disease detection, Grad-CAM visualization, severity, actionable treatment protocols, and vernacular voice advisories (English, Hindi, Gujarati).
  - **Zero signup wall** — farmers in the field can diagnose crop diseases in seconds without creating an account or logging in.
  
- **Authenticated Farmers (Optional Personalization):**
  `Scan → Diagnose → Save → Track`
  - Unlocks **My Farm** dashboard and personal **Scan History**.
  - Track **Recent Crop Health** (*Status derived from the farmer's latest saved scans*).
  - Maintain chronological diagnostic records, filter scans by crop, and view detailed actionable protocols over time.
  - Signup is **100% optional** for disease diagnosis. No advanced predictive farm analytics or automated live sensing claims are made.

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
│   ├── auth_utils.py          # PBKDF2-HMAC-SHA256 & JWT user isolation
│   └── routers/
│       ├── predict_router.py      # Image upload + prediction + Grad-CAM
│       ├── auth_router.py         # Farmer signup, login, profile management
│       ├── scans_router.py        # My Farm & Scan History persistence (OOD gated)
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
│       ├── my-farm/page.tsx   # Personalized farmer workspace
│       ├── history/page.tsx   # Saved scan history + crop filtering
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
| **Test Suite Pass Rate** | **71 / 71 (100%)** | `pytest tests/ -v` (Unit + Integration + OOD + Voice + Farm Auth) |

### Reproduce Evaluation Locally

```bash
# Run official evaluation on test split
python model/evaluate.py --split test

# Run full test suite (71 automated pytest tests)
python -m pytest tests/ -v
```

> **Automated Test Suite Breakdown (71 Passed / 71 Total)**:
> - `tests/test_api.py` (11 tests): FastAPI REST endpoints (health, disease predict, weather, irrigation, sustainability, IoT, advisor)
> - `tests/test_model.py` (4 tests): PyTorch weights existence, checkpoint structure, single-image inference, top-k ordering
> - `tests/test_ood.py` (14 tests): Tulsi OOD rejection, unseen foliage rejection, mechanical tractor handling, 9 supported crop regressions, OOD API response schemas
> - `tests/test_voice.py` (28 tests): Speech sanitizer markdown removal, 18 language normalization aliases (en/hi/gu), multilingual assistant endpoints, genuine Hindi & Gujarati offline fallbacks, OOD refuse-to-guess safety speech guarantees
> - `tests/test_auth_and_farm.py` (14 tests): Guest detection regression, PBKDF2 hashing, JWT user isolation, empty state verification, Recent Crop Health derivation, server-side OOD save rejection, chronological scan history & crop filtering, scan deletion

---

## 🛡️ Open-Set AI Safety

> **AgriSmart AI does not blindly force every image into a known disease class. It uses feature-space similarity and calibrated rejection to identify inputs outside its supported crop distribution and refuse to guess.**

### The "Refuse to Guess" Trust Architecture

Traditional deep learning classifiers operate under a **closed-set assumption**: the output Softmax function forces class probabilities to sum to 1.0. When presented with an unseen plant species (such as Tulsi/Holy Basil, Mango, Neem, Rose, Wheat, or houseplants) or a non-plant photograph, conventional models "bluff"—assigning 99%+ false confidence to an arbitrary known condition (for instance, mistaking a sacred Tulsi leaf for Grape Black Rot). In agriculture, this causes disastrous real-world harm: farmers spray expensive, toxic fungicides on healthy foliage or unsupported crops.

AgriSmart AI solves this fundamental failure mode by adding an **offline Open-Set Rejection Layer** directly in front of the diagnosis engine.

---

## 🗣️ Vernacular Voice-First Advisory

> **AgriSmart AI supports English, Hindi and Gujarati voice-based interaction using browser-native speech technologies, allowing farmers to receive agricultural guidance in a more accessible and familiar format.**

### Accessibility for Bharat's Farmers
Many smallholder farmers prefer listening and speaking in their regional language rather than typing technical queries or reading complex English medical reports. AgriSmart AI bridges this digital divide with a zero-cost, privacy-first, browser-native vernacular interface:

1. **Languages Supported**:
   - **English** (`en-IN`)
   - **Hindi / हिन्दी** (`hi-IN`)
   - **Gujarati / ગુજરાતી** (`gu-IN`)
2. **🔊 Disease Advisory Text-to-Speech (TTS)**:
   - On the disease diagnosis card, farmers can tap **"Listen to Advisory"** in their chosen language.
   - Built on `window.speechSynthesis` with an intelligent conversational speech sanitizer that strips markdown formatting, bullets, URLs, and code blocks for fluid, natural speech.
3. **🎙️ Voice Input Farmer Assistant (STT)**:
   - Microphone button (**"Ask by Voice"**) integrated directly into the Farmer Assistant.
   - Powered by browser-native `SpeechRecognition` / `webkitSpeechRecognition` with clear listening, processing, and speaking indicators.
4. **🛡️ OOD + Voice Safety Guarantee**:
   - When an uploaded leaf is flagged as out-of-distribution (`is_supported_crop = false`), the system **strictly refuses to speak disease treatment guidance**.
   - Instead, it speaks a localized safety advisory in English, Hindi, or Gujarati warning the farmer that the crop is outside the supported domain to prevent inappropriate pesticide application.
5. **Technical Scope & Honest Disclaimers**:
   - **Zero Paid Cloud Voice APIs**: No external cloud fees (no ElevenLabs, Google Cloud TTS, or Azure bills required).
   - **Browser & Hardware Dependency**: Browser speech recognition (`webkitSpeechRecognition`) requires an internet connection on Chromium browsers and depends on device OS microphone permissions. If speech recognition is unsupported or unavailable on a particular browser/device, the interface **gracefully falls back to normal text typing** while retaining full TTS read-aloud functionality.
   - **Voice Variety**: Available pronunciation quality and regional accents depend on the voices installed on the client operating system.

---

### OOD Architecture Diagram

```
                    Leaf Image Input
                           │
                           ▼
          PyTorch EfficientNet-B0 Backbone
                           │
                           ▼
             1280-dim Feature Embedding
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
  Centroid Cosine Similarity      Free Energy Score
     (Max Cosine vs 33)        E(x) = -T * logsumexp(z)
             │                           │
             └─────────────┬─────────────┘
                           ▼
               Empirically Calibrated Filter
             (Cosine < 0.58 or Energy > -45.0)
                           │
            ┌──────────────┴──────────────┐
       OOD (Unseen)                  ID (Supported)
            │                             │
            ▼                             ▼
   ⚠️ Refuse to Guess              ✅ Disease Diagnosis
"Unsupported Crop Detected"      Condition, Confidence,
   False Diagnosis Averted         Grad-CAM & Guidance
```

### Technical Defense Mechanisms

1. **Centroid-Based Feature Space Cosine Similarity**:
   Pre-classification 1280-dimensional embeddings are extracted from the global average pooling layer. The cosine similarity is measured against unit-normalized centroids calculated across all 33 PlantVillage classes (`ml/artifacts/class_centroids.pt`).
2. **Numerically Stable Free Energy Score**:
   $$E(x; T) = -T \cdot \log \sum_{i=1}^{C} \exp(z_i / T)$$
   Logits $z_i$ are evaluated at temperature $T=1.0$ via numerically stable `torch.logsumexp`. Energy scores reflect input likelihood without the normalization distortions of Softmax.
3. **Local Disease & OOD Inference**:
   Disease classification and OOD detection run locally using PyTorch and do not depend on Gemini or external cloud inference APIs. (Note: Weather intelligence uses Open-Meteo network access, and the optional AI Farmer Assistant connects to Gemini when an API key is configured).
4. **Distinction Between Image Categories**:
   - `UNSEEN_SPECIES_DETECTED`: The representation-space OOD detector successfully rejected the evaluated unseen plant samples (Tulsi, Mango, Neem, Rose, Ficus, Wheat) without species-specific hard-coded rules.
   - `NON_PLANT_IMAGE`: Extreme feature-space separation (e.g., cosine similarity < 0.20) is used to flag highly out-of-domain inputs such as the evaluated tractor image.

### Empirical Calibration & Benchmarks

The rejection thresholds were empirically calibrated on held-out validation samples (330 images across 33 diagnostic classes) and genuine unseen specimens (`ml/calibrate_ood.py`):

| Metric | Result | Methodology & Notes |
|---|---|---|
| **Calibrated Cosine Threshold** | **0.58** | Observed validation separation: the minimum observed ID cosine similarity was 0.63, while the maximum observed OOD cosine similarity was 0.5263, producing an observed gap of approximately 0.10. |
| **Calibrated Energy Threshold** | **-45.00** | $T = 1.0$ numerically stable logsumexp |
| **Combined Decision Rule** | **OR** | The OR rule prioritizes safety: an input is rejected when either calibrated representation-space signal indicates that it is outside the supported domain. This improves OOD rejection coverage at the cost of some false rejection of supported inputs, reflected in the 96.67% ID acceptance rate. |
| **ID Acceptance Rate (Combined Production)** | **96.67%** (319/330) | Held-out validation split across all 33 diagnostic classes |
| **ID Acceptance Rate (Cosine-only Ablation)** | 97.27% (321/330) | Ablation study result |
| **ID Acceptance Rate (Energy-only Ablation)** | 99.39% (328/330) | Ablation study result |
| **OOD Rejection Rate** | **100.00%** (7/7) | Evaluated on 7 curated samples: Tulsi, Mango, Neem, Rose, Ficus, Wheat, Tractor |
| **OOD Detection AUROC** | **1.0000** | OOD AUROC = 1.0000 on the current 7-sample OOD evaluation set. This evaluation result is based on the current curated OOD sample set and is not a universal real-world performance guarantee. |
| **Mandatory Tulsi Validation** | **PASSED** | `data/test_samples/tulsi_leaf.jpg` rejected as `UNSEEN_SPECIES_DETECTED` |

### Supported Domain vs. Diagnostic Classes

> **AgriSmart AI currently supports 9 crop families represented by 33 disease/healthy diagnostic classes.**

The supported crop families are:
- **Apple** (*Malus domestica*) — Scab, Black Rot, Cedar Rust, Healthy
- **Cherry** (*Prunus avium*) — Powdery Mildew, Healthy
- **Corn (Maize)** (*Zea mays*) — Cercospora Leaf Spot, Common Rust, Northern Leaf Blight, Healthy
- **Grape** (*Vitis vinifera*) — Black Rot, Esca (Black Measles), Leaf Blight, Healthy
- **Peach** (*Prunus persica*) — Bacterial Spot, Healthy
- **Bell Pepper** (*Capsicum annuum*) — Bacterial Spot, Healthy
- **Potato** (*Solanum tuberosum*) — Early Blight, Late Blight, Healthy
- **Strawberry** (*Fragaria ananassa*) — Leaf Scorch, Healthy
- **Tomato** (*Solanum lycopersicum*) — Bacterial Spot, Early Blight, Late Blight, Leaf Mold, Septoria, Spider Mites, Target Spot, Mosaic Virus, Yellow Leaf Curl Virus, Healthy

---

## ⚠️ Known Limitations

1. **Training Data Domain**: The disease classification model was trained and evaluated using PlantVillage-style imagery against controlled backgrounds and may not fully represent challenging real-world field conditions (e.g., complex multi-disease infections, direct sunlight glare, or severe soil occlusions).
2. **Benchmark Scope**: Reported disease metrics (Macro-F1 0.9956 and Accuracy 0.9970) are held-out test split benchmark results and are not claimed as universal field accuracy.
3. **OOD Evaluation Scope**: OOD AUROC (1.0000) and rejection rate (100.00%) are based on the current curated 7-sample OOD evaluation set (Tulsi, Mango, Neem, Rose, Ficus, Wheat, Tractor) and do not represent a mathematical guarantee across all unseen biological organisms.
4. **Voice Input & Browser Variability**: Voice input uses browser-native Speech Recognition where supported. Availability varies by browser engine, operating system, and regional language pack support. When speech recognition is unavailable, AgriSmart AI gracefully falls back to standard text input. Speech output uses the browser's native Speech Synthesis engine.
5. **Network Dependencies for Auxiliary Services**: Core disease classification and OOD inference run 100% locally in PyTorch. However, live weather intelligence queries the Open-Meteo REST API, and the AI Farmer Assistant uses the Gemini API when an API key is provided (with verified offline rule-based fallback).
6. **Supported Botanical Scope**: Current supported domain is strictly 9 crop families represented by 33 diagnostic/healthy classes. Any foliage outside these 9 crop families is flagged as out-of-distribution.

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
