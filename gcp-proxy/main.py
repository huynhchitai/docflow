# Proxy Vertex AI cho DocFlow Worker.
# Chạy trên Cloud Run bằng service account (ADC) — không cần SA key file.
import os

import google.auth
import google.auth.transport.requests
import requests
from fastapi import FastAPI, HTTPException, Request

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
