FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

WORKDIR /app

# Install system runtime dependencies for Pillow, Scipy, and networking
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install CPU PyTorch first (drastically reduces container size and build time)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    torch torchvision torchaudio \
    --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install remaining dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Ensure model weights are fully present and verified
RUN python scripts/ensure_weights.py

# Expose default port
EXPOSE 8000

# Start production uvicorn server
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
