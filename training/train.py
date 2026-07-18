# -*- coding: utf-8 -*-
"""Fine-tune ResNet18 phân loại 4 loại chứng từ ngân hàng.
Vai trò trong DocFlow: ROUTER — chạy trước Gemini, định tuyến schema trích xuất.
Xuất TorchScript về gcp-proxy/model.pt để serve trên Cloud Run (CPU).
"""
import os, json, random
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, models, transforms

torch.manual_seed(42)
random.seed(42)
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "dataset")
OUT = os.path.join(HERE, "..", "gcp-proxy")

device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

train_tf = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ColorJitter(brightness=0.15, contrast=0.15),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

full = datasets.ImageFolder(DATA, transform=train_tf)
labels = full.classes
print("classes:", labels, "| tổng ảnh:", len(full))

n_val = int(len(full) * 0.15)
train_ds, val_ds = random_split(full, [len(full) - n_val, n_val])
train_dl = DataLoader(train_ds, batch_size=32, shuffle=True, num_workers=0)
val_dl = DataLoader(val_ds, batch_size=64, num_workers=0)

model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
model.fc = nn.Linear(model.fc.in_features, len(labels))
model = model.to(device)

opt = torch.optim.AdamW(model.parameters(), lr=1e-3)
lossf = nn.CrossEntropyLoss()

EPOCHS = 3
for ep in range(EPOCHS):
    model.train()
    tot = correct = 0
    for x, y in train_dl:
        x, y = x.to(device), y.to(device)
        opt.zero_grad()
        out = model(x)
        loss = lossf(out, y)
        loss.backward()
        opt.step()
        tot += y.size(0)
        correct += (out.argmax(1) == y).sum().item()
    model.eval()
    vtot = vcorrect = 0
    with torch.no_grad():
        for x, y in val_dl:
            x, y = x.to(device), y.to(device)
            vcorrect += (model(x).argmax(1) == y).sum().item()
            vtot += y.size(0)
    print(f"epoch {ep+1}: train acc {correct/tot:.3f} · val acc {vcorrect/vtot:.3f}")

# Xuất TorchScript (CPU) cho Cloud Run
model_cpu = model.to("cpu").eval()
scripted = torch.jit.script(model_cpu)
scripted.save(os.path.join(OUT, "model.pt"))
json.dump(labels, open(os.path.join(OUT, "labels.json"), "w"))
print("saved gcp-proxy/model.pt + labels.json")
