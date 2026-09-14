import torch
import torch.nn as nn
from torchvision.models import convnext_tiny, ConvNeXt_Tiny_Weights

class AgriSmartConvNeXt(nn.Module):
    def __init__(self, num_classes: int, pretrained: bool = True):
        super().__init__()
        weights = ConvNeXt_Tiny_Weights.DEFAULT if pretrained else None
        self.model = convnext_tiny(weights=weights)
        
        # Replace the classification head
        in_features = self.model.classifier[2].in_features
        self.model.classifier[2] = nn.Linear(in_features, num_classes)
        
    def forward(self, x):
        return self.model(x)

    def freeze_backbone(self):
        """Freeze all layers except the classification head."""
        for param in self.model.features.parameters():
            param.requires_grad = False
        print("[INFO] Backbone frozen. Training head only.")

    def unfreeze_backbone(self):
        """Unfreeze all layers for full fine-tuning."""
        for param in self.parameters():
            param.requires_grad = True
        print("[INFO] Backbone unfrozen. Fine-tuning all layers.")
