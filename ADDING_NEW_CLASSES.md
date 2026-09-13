# Adding New Plant & Disease Classes

AgriSmart AI's vision model is powered by **PyTorch** and **EfficientNet-B0** via transfer learning. It is designed to be easily extensible. If you want the system to recognize a new crop or a new disease, follow these steps.

## Step 1: Prepare Your Image Data

The training pipeline uses PyTorch's `ImageFolder` structure. You need to gather images (JPG/PNG) of the new class.

1. Navigate to `data/raw/` (create it if it doesn't exist).
2. Create a new folder named exactly as you want the class to be identified.
   - **Convention:** `CropName___Disease_Name`
   - **Example:** `data/raw/Wheat___Leaf_Rust/`
3. Place all your training images inside this folder.
   - **Tip:** Aim for at least 150-200 images per class for good accuracy. More is better!

## Step 2: Generate the Train/Val Split

Before training, the raw dataset must be split into training and validation sets. We have a script for this.

1. Open a terminal in the root directory.
2. Run the data preparation script:
   ```bash
   python model/data_prep.py
   ```
   This script will:
   - Read everything in `data/raw/`.
   - Create an 80/20 train/val split.
   - Save the split data into `data/split/`.
   - Automatically update the class mappings.

## Step 3: Re-Train the Model

Because we use transfer learning, you don't need to train from scratch (which would take days). The script automatically replaces the final classification layer to match your new number of classes and fine-tunes the network.

1. In the terminal, run the training script:
   ```bash
   python model/train.py
   ```
2. **What happens during training?**
   - **Phase 1:** The script freezes the main network and only trains the new classification head for 3 epochs.
   - **Phase 2:** It unfreezes the whole network and fine-tunes it for 12 epochs.
3. The new model weights will automatically be saved to `model/weights/best_model.pth`.

## Step 4: Add Actionable Guidance

Now that the model can predict the new class, you must provide treatment instructions for the user interface.

1. Open `model/predict.py`.
2. Locate the `DISEASE_GUIDANCE` dictionary at the top of the file.
3. Add a new entry matching your exact folder name. For example:

```python
    "Wheat___Leaf_Rust": {
        "crop": "Wheat",
        "disease": "Leaf Rust",
        "severity": "Moderate-High",
        "guidance": [
            "Apply foliar fungicide at early flag leaf stage",
            "Plant resistant wheat varieties next season",
            "Destroy volunteer wheat to eliminate green bridge",
            "Monitor fields regularly in humid conditions",
        ],
    },
```

## Step 5: Restart the Server

To load the new `best_model.pth` into memory, restart the application:

```bash
python run.py
```

Your system can now successfully identify the new crop/disease!
