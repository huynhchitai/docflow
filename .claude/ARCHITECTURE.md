# DocFlow — Kiến trúc, Pipeline & Bản đồ tiền thưởng

> Đọc file này đầu mỗi phiên. Mọi dòng code phải trả lời được câu hỏi: **"nó phục vụ giải nào?"**
> Deadline: CP1 ~~18/07 11:00~~ (nộp sớm) · CP2 18/07 23:00 (live URL + repo) · Final 19/07 11:00 · Demo Day 19/07 chiều.

## 1. Bản đồ tiền — feature nào ăn giải nào (tổng đích: 520 triệu VND)

```mermaid
flowchart LR
    subgraph F["FEATURES"]
        A[Extraction thật + bbox nguồn]
        B[Viewer click-to-highlight]
        C[Cross-check CCCD/số tiền<br/>giữa các chứng từ]
        D[Dashboard + Review queue<br/>+ API core-banking + audit log]
        E[PyTorch classifier<br/>router của pipeline]
        G[Skin SHB cam+navy<br/>+ pitch pilot 3 tháng]
        H[Số liệu: % field đúng,<br/>chi phí <500đ/bộ hồ sơ]
    end

    subgraph P["GIẢI (tiền mặt)"]
        P1["🥇 Giải Nhất — 260tr<br/>(6 tiêu chí /100đ)"]
        P2["🏦 SHB Award — 130tr<br/>(best Finance/Banking)"]
        P3["🔥 META PyTorch — 130tr<br/>(technical excellence w/ PyTorch)"]
    end

    A --> P1
    B --> P1
    C --> P1
    A --> P2
    D --> P2
    G --> P2
    H --> P2
    E --> P3
    E --> P1
    H --> P1
```

**6 tiêu chí chấm /100đ:** Technical · AI-Native Architecture · Business Viability & Pilot Pathway · AI-Native UX · AI Safety/Grounding & Trust · Presentation.
**3 vòng:** AI pre-screen (tất cả) → Human review (top 30–40) → Demo Day (top 10, pitch 4' + Q&A 2').

## 2. Kiến trúc hệ thống (đã deploy phần ✅)

```mermaid
flowchart TB
    U[👤 Cán bộ tín dụng] --> SPA

    subgraph CF["Cloudflare (✅ live: docflow.prismtechemails.workers.dev)"]
        SPA[React SPA — Workers Assets]
        W[Hono Worker — orchestrator<br/>/api/extract ✅ /api/health ✅<br/>/api/dossiers ⬜ /api/fields ⬜<br/>/api/core-banking/export ⬜ /api/ask ⬜]
        SPA --> W
    end

    subgraph GCP["Google Cloud — project-9dd19b1e-b2d4-4a04-bb7"]
        PROXY["Cloud Run: docflow-gemini-proxy ✅<br/>chạy bằng SA docflow-vertex qua ADC<br/>(org chặn SA key → không key file nào tồn tại)"]
        VERTEX["Vertex AI<br/>gemini-3-flash-preview (mặc định)<br/>gemini-3-pro-preview (escalation ⬜)"]
        PYSVC["Cloud Run: PyTorch classifier ⬜<br/>+ PaddleOCR verify ⬜<br/>(thêm endpoint vào cùng service proxy)"]
        PROXY --> VERTEX
    end

    subgraph SB["Supabase ⬜"]
        PG[(Postgres + pgvector<br/>dossiers/documents/fields/audit)]
        ST[(Storage — file scan gốc)]
    end

    W -->|"x-proxy-key"| PROXY
    W --> PYSVC
    W --> PG
    W --> ST
```

**Vì sao Cloud Run proxy thay vì gọi thẳng:** ① org policy chặn tạo SA key; ② ví prepay Gemini API = 0đ (chỉ Vertex đi qua billing postpaid); ③ Google chặn IP Cloudflare với free-tier key ("user location not supported"). ADC + proxy né cả 3 — và là điểm cộng khi pitch: "không có credential file nào tồn tại trong hệ thống".

## 3. Pipeline xử lý một bộ hồ sơ

```mermaid
sequenceDiagram
    participant U as UI
    participant W as Worker
    participant PY as Cloud Run PyTorch
    participant GM as Vertex Gemini
    participant DB as Supabase

    U->>W: upload bộ hồ sơ (n file PDF/scan)
    W->>DB: tạo dossier + documents (state: extracting)
    loop mỗi file
        W->>PY: classify(page image)
        PY-->>W: {doc_type, conf} — PyTorch = ROUTER (giải META)
        W->>GM: extract(file, schema[doc_type])
        Note over GM: JSON: fields + confidence<br/>+ box_2d (0–1000) + warnings
        alt conf thấp / viết tay / mộc đè chữ
            W->>GM: escalate gemini-3-pro-preview
        end
        W->>PY: verify(value, bbox) — PaddleOCR đối chiếu
        W->>DB: lưu fields + bbox + conf + audit_log
    end
    W->>W: CROSS-CHECK toàn dossier<br/>(CCCD/tên/số tiền/kỳ hạn lệch → cảnh báo)
    W->>DB: state = needs_review | done
    U->>W: review queue: sửa field (PATCH /api/fields)
    W->>DB: audit_log ghi ai-sửa-gì-khi-nào
    U->>W: POST /api/core-banking/export
    W-->>U: payload JSON chuẩn core-banking
```

**Nguyên tắc chống ảo giác (tiêu chí Grounding):** field nào không đọc được → bỏ/warning, KHÔNG đoán. Mọi value phải có `box_2d` trỏ về bản gốc. Verify OCR lệch → đẩy vào review queue, không tự tin mồm.

## 4. Data model (Supabase)

```mermaid
erDiagram
    dossiers ||--o{ documents : contains
    documents ||--o{ fields : has
    dossiers ||--o{ crosscheck_alerts : raises
    fields ||--o{ audit_log : tracked_by

    dossiers {
        uuid id PK
        text name
        text state "uploading|extracting|needs_review|done|exported"
        timestamptz created_at
    }
    documents {
        uuid id PK
        uuid dossier_id FK
        text storage_path "Supabase Storage"
        text doc_type "loan_application|financial_statement|credit_contract|swift_mt103|other"
        real doc_type_confidence
        text state
    }
    fields {
        uuid id PK
        uuid document_id FK
        text key "snake_case"
        text label "nhãn tiếng Việt"
        text value
        real confidence
        int page
        int4range box_2d "ymin,xmin,ymax,xmax /1000"
        bool verified "OCR khớp?"
        bool human_reviewed
    }
    crosscheck_alerts {
        uuid id PK
        uuid dossier_id FK
        text rule "national_id_mismatch|amount_mismatch|missing_doc"
        text detail
        text severity
    }
    audit_log {
        uuid id PK
        uuid field_id FK
        text actor
        text old_value
        text new_value
        timestamptz at
    }
```

## 5. UI — cấu trúc & vũ đạo demo 4 phút

```mermaid
flowchart LR
    subgraph UI["React SPA (skin SHB: cam #F58220 + Midnight Navy #0A152B, motif tròn-vuông)"]
        DASH["📊 Dashboard<br/>Kanban dossiers theo state<br/>+ SLA + % tự động"]
        UP["📄 Upload<br/>drag-drop nhiều file ✅"]
        VIEW["🔍 Doc Viewer ⬜ KILLER FEATURE<br/>trang scan + overlay bbox<br/>click field ↔ highlight vùng gốc"]
        RQ["✅ Review Queue ⬜<br/>field conf thấp / OCR lệch<br/>sửa inline, có audit"]
        AL["🚨 Alerts ⬜<br/>cross-check + thiếu chữ ký/mộc"]
        EX["🏦 Export core-banking ⬜<br/>nút bấm → JSON payload"]
    end
    UP --> VIEW --> RQ --> EX
    DASH --> VIEW
    AL --> RQ
```

**Kịch bản demo (đã test chạy thật):** ① kéo 4 file hồ sơ scan xấu vào → ② 30s ra bảng field + badge GEMINI → ③ click "Số CCCD" → viewer nhảy đúng vùng trên hợp đồng → ④ alert đỏ "CCCD lệch giữa đơn vay (...345) và hợp đồng (...346)" + "thiếu chữ ký/con dấu" (Gemini tự bắt được — đã verify) → ⑤ sửa 1 field trong review queue → ⑥ bấm Export core-banking → ⑦ slide chi phí: <500đ/bộ hồ sơ.

## 6. Env / secrets / lệnh

| Nơi | Key | Trạng thái |
|---|---|---|
| CF var (wrangler.jsonc) | `GEMINI_PROXY_URL` | ✅ |
| CF secret | `GEMINI_PROXY_KEY` | ✅ |
| CF secret (chưa dùng) | `GEMINI_API_KEY` (free-tier luatviet — bị chặn IP CF, giữ làm fallback local dev) | ✅ |
| Cloud Run env | `PROXY_KEY`, `GCP_LOCATION=global` | ✅ |
| CF secret | `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | ⬜ |

```bash
# build + deploy web (Node 22: source ~/.nvm/nvm.sh && nvm use 22)
pnpm build && npx wrangler deploy
# deploy proxy (từ gcp-proxy/, build local vì Cloud Build bị siết IAM)
docker build --platform linux/amd64 -t asia-southeast1-docker.pkg.dev/project-9dd19b1e-b2d4-4a04-bb7/docflow/gemini-proxy:vN . \
  && docker push ... && gcloud run deploy docflow-gemini-proxy --image ...
```

## 7. Luật bất di bất dịch

1. **AI-LOG.md cập nhật mỗi phiên** — bắt buộc cho Final, session Claude Code là bằng chứng.
2. Code mới 100% trong cửa sổ 48h (17/07 14:00 → 19/07 11:00).
3. Không nhét logo SHB thật — chỉ lấy cảm hứng palette.
4. Cháy giờ thì cắt theo thứ tự ngược mục 5 ROADMAP.md (giữ extraction + viewer đến chết).
5. Dữ liệu demo = hư cấu có watermark, không PII thật.
