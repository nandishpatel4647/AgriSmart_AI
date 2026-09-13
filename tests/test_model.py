"""
Unit tests for AgriSmart AI model loading and prediction inference.
"""

import pytest
import torch
from pathlib import Path
from PIL import Image

PROJECT_ROOT = Path(__file__).parent.parent
WEIGHTS_PATH = PROJECT_ROOT / "model" / "weights" / "best_model.pth"
TEST_DATA_DIR = PROJECT_ROOT / "data" / "split" / "test"


def test_weights_exist():
    """Verify that the trained model weights file exists and is non-empty."""
    assert WEIGHTS_PATH.exists(), f"Model weights not found at {WEIGHTS_PATH}"
    assert WEIGHTS_PATH.stat().st_size > 10 * 1024 * 1024, "Weights file is smaller than 10MB"


def test_model_checkpoint_structure():
    """Verify the checkpoint structure contains all required metadata."""
    checkpoint = torch.load(WEIGHTS_PATH, map_location="cpu", weights_only=False)
    
    assert "model_state_dict" in checkpoint, "Missing model_state_dict in checkpoint"
    assert "num_classes" in checkpoint, "Missing num_classes in checkpoint"
    assert checkpoint["num_classes"] == 33, f"Expected 33 classes, got {checkpoint['num_classes']}"
    assert "class_mapping" in checkpoint, "Missing class_mapping in checkpoint"
    assert "architecture" in checkpoint, "Missing architecture in checkpoint"
    assert checkpoint["architecture"] == "efficientnet_b0"
    assert "val_f1" in checkpoint, "Missing val_f1 score in checkpoint"
    assert checkpoint["val_f1"] > 0.95, f"Validation F1 score is too low: {checkpoint['val_f1']}"


def test_predict_single_image():
    """Verify single-image prediction works and outputs structured results."""
    from model.predict import predict
    
    # Find a test image
    sample_images = list(TEST_DATA_DIR.rglob("*.jpg")) + list(TEST_DATA_DIR.rglob("*.JPG"))
    assert len(sample_images) > 0, "No test images found in data/split/test"
    
    test_img = str(sample_images[0])
    result = predict(test_img, top_k=3)
    
    # Verify required keys
    assert "class_label" in result
    assert "confidence" in result
    assert "crop" in result
    assert "disease" in result
    assert "severity" in result
    assert "guidance" in result
    assert "top_k" in result
    assert "is_healthy" in result
    
    # Validate types and ranges
    assert isinstance(result["confidence"], float)
    assert 0.0 <= result["confidence"] <= 1.0
    assert len(result["top_k"]) == 3
    assert isinstance(result["guidance"], list)
    assert len(result["guidance"]) > 0


def test_predict_top_k_ordering():
    """Verify top_k predictions are sorted in descending order of confidence."""
    from model.predict import predict
    
    sample_images = list(TEST_DATA_DIR.rglob("*.jpg")) + list(TEST_DATA_DIR.rglob("*.JPG"))
    test_img = str(sample_images[0])
    result = predict(test_img, top_k=5)
    
    confidences = [conf for _, conf in result["top_k"]]
    assert confidences == sorted(confidences, reverse=True), "Top-k confidences are not sorted descending"
