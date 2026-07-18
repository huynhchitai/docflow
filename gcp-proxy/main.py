# Proxy Vertex AI cho DocFlow Worker.
# Chạy trên Cloud Run bằng service account (ADC) — không cần SA key file.
import os

import base64
import io
import json

import google.auth
import google.auth.transport.requests
import requests
import torch
import pypdfium2 as pdfium
from PIL import Image
from fastapi import FastAPI, HTTPException, Request
from torchvision import transforms

app = FastAPI()

PROXY_KEY = os.environ["PROXY_KEY"]
LOCATION = os.environ.get("GCP_LOCATION", "global")

_creds, _project = google.auth.default(
    scopes=["https://www.googleapis.com/auth/cloud-platform"]
)


def _token() -> str:
    if not _creds.valid:
        _creds.refresh(google.auth.transport.requests.Request())
    return _creds.token


# ---- PyTorch router: phân loại chứng từ (ResNet18 fine-tune, TorchScript) ----
_here = __import__("os").path.dirname(__import__("os").path.abspath(__file__))
_model = torch.jit.load(__import__("os").path.join(_here, "model.pt")).eval()
_labels = json.load(open(__import__("os").path.join(_here, "labels.json")))
_tf = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


@app.post("/classify")
async def classify(req: Request):
    if req.headers.get("x-proxy-key") != PROXY_KEY:
        raise HTTPException(401, "bad proxy key")
    body = await req.json()
    raw = base64.b64decode(body["dataB64"])
    mime = body.get("mimeType", "application/pdf")
    if "pdf" in mime:
        page = pdfium.PdfDocument(io.BytesIO(raw))[0]
        img = page.render(scale=1.6).to_pil().convert("RGB")
    else:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    with torch.no_grad():
        probs = torch.softmax(_model(_tf(img).unsqueeze(0)), dim=1)[0]
    idx = int(probs.argmax())
    return {"doc_type": _labels[idx], "confidence": float(probs[idx]), "model": "resnet18-ft-torchscript"}


@app.get("/health")
def health():
    return {"ok": True, "project": _project, "location": LOCATION}


@app.post("/generate")
async def generate(req: Request):
    if req.headers.get("x-proxy-key") != PROXY_KEY:
        raise HTTPException(401, "bad proxy key")
    body = await req.json()
    model = body.get("model", "gemini-3-flash-preview")
    host = (
        "aiplatform.googleapis.com"
        if LOCATION == "global"
        else f"{LOCATION}-aiplatform.googleapis.com"
    )
    url = (
        f"https://{host}/v1/projects/{_project}/locations/{LOCATION}"
        f"/publishers/google/models/{model}:generateContent"
    )
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": body["mimeType"],
                            "data": body["dataB64"],
                        }
                    },
                    {"text": body["prompt"]},
                ],
            }
        ],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.1,
        },
    }
    r = requests.post(
        url,
        json=payload,
        headers={"Authorization": f"Bearer {_token()}"},
        timeout=120,
    )
    if r.status_code != 200:
        raise HTTPException(502, f"Vertex {r.status_code}: {r.text[:500]}")
    data = r.json()
    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        text = "{}"
    return {"text": text}
