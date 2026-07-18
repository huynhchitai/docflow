# DocFlow — Kiến trúc & Roadmap 48h

## Kiến trúc đích (final, Sun 19/07)

```
┌─ React SPA (Cloudflare Workers Assets) ─────────────────────────────┐
│  Dossier Dashboard │ Doc Viewer + bbox highlight │ Review Queue │ Q&A │
└──────────────┬──────────────────────────────────────────────────────┘
               │ /api/* (Hono Worker)
┌──────────────▼──────────────────────────────────────────────────────┐
│ Cloudflare Worker — orchestrator                                     │
│  POST /api/dossiers            tạo bộ hồ sơ                          │
│  POST /api/dossiers/:id/files  upload → Supabase Storage             │
│  Pipeline mỗi file:                                                  │
│   1. classify  → Cloud Run svc (PyTorch)  {doc_type, conf}          │
│   2. extract   → Gemini Flash (schema theo doc_type, box_2d 0–1000)  │
│      conf thấp / viết tay / mộc đè → escalate Gemini Pro             │
│   3. verify    → Cloud Run PaddleOCR: value khớp text tại bbox?      │
│   4. crosscheck→ rule TS: CCCD/tên/số tiền/kỳ hạn giữa các chứng từ  │
│   5. persist   → Supabase Postgres (fields + bbox + conf + audit)    │
│  PATCH /api/fields/:id         human review sửa tay (audit log)      │
│  POST /api/core-banking/export payload JSON chuẩn core (mock, auth)  │
│  POST /api/ask                 RAG pgvector, trả lời kèm trích dẫn   │
└───────┬───────────────────┬───────────────────┬─────────────────────┘
        ▼                   ▼                   ▼
  Supabase            Google Cloud Run     Vertex AI (SA + IAM)
  Postgres+pgvector   FastAPI:             Gemini Flash (mặc định)
  Storage (scan)      - PyTorch classifier Gemini Pro (escalation)
                      - YOLO mộc/chữ ký(*)
                      - PaddleOCR verify
(*) stretch goal
```

## Trạng thái hiện tại (Fri ~17:00)

- ✅ Worker + SPA live: https://docflow.huynhchitai.com (mock mode)
- ✅ /api/extract viết sẵn đường Gemini thật (thiếu key)
- ✅ demo-data/: đơn vay, BCTC, hợp đồng (CCCD lệch cài sẵn), MT103
- ✅ CP1 draft đã lưu trên hub (chưa bấm Nộp)
- ⬜ GitHub repo public (lead chạy `gh repo create`)
- ⬜ Vertex AI: tạo service account (role Vertex AI User, bật API aiplatform) → `npx wrangler secret put GCP_SERVICE_ACCOUNT_KEY` (dán nguyên JSON). Fallback: `GEMINI_API_KEY` (AI Studio)

## Roadmap theo giờ

### Fri tối (m + Triết — 2 người)
| Giờ | Việc | Ai |
|---|---|---|
| 17–18h | Vertex SA + secret + extraction thật chạy trên 4 file demo, chỉnh prompt tới khi field đúng ổn định | Tài |
| 17–18h | In 4 PDF demo → chụp/scan nghiêng, mờ, bóng tay → demo-data/scans/ | Triết |
| 18–21h | Supabase schema (dossiers, documents, fields, audit_log) + Storage; luồng upload → extract → persist | Tài |
| 18–21h | Doc Viewer v1: render trang (pdf.js) + overlay bbox từ box_2d, click field → highlight | Triết |
| 21–23h | Dashboard trạng thái hồ sơ (Kanban: uploading → extracting → review → done) | chia đôi |
| 23h | **Nộp Checkpoint 1** (khóa slot IDP — đừng chờ sáng) | lead |

### Sat (đủ 4 người từ trưa)
| Giờ | Việc | Ai |
|---|---|---|
| sáng | Cross-check engine + review queue UI (demo bắt CCCD lệch) | Tài |
| sáng | Polish viewer + empty states + loading | Triết |
| trưa | Onboard 2 bạn mới: 1 nhận PyTorch, 1 nhận data/pitch | — |
| chiều | PyTorch classifier: sinh data augmented từ demo docs (xoay/mờ/nhiễu, vài trăm ảnh) → fine-tune ResNet18/LayoutLM-lite → serve FastAPI trên **Google Cloud Run** (train local/Colab, ResNet18 CPU inference đủ nhanh) | bạn C |
| chiều | Bộ test 20–30 case + đo % field đúng, chi phí/bộ hồ sơ; draft deck | bạn D |
| chiều | API core-banking mock + audit log + auth key | Tài |
| 19–21h | Tích hợp classifier vào pipeline; verify OCR nếu kịp | Tài + C |
| **21h** | **Nộp Checkpoint 2** (live URL + GitHub — hạn 23h, nộp sớm 2 tiếng) | lead |
| tối | RAG Q&A pgvector + trích dẫn (stretch); YOLO mộc đỏ (stretch) | C |
| tối | Quay video demo backup + AI collaboration log tổng hợp | D |

### Sun sáng
| Giờ | Việc |
|---|---|
| 8–10h | Deck final, số liệu vào slide, final submission đủ trường (URL, repo, deck, video, AI log) |
| **10h** | **Nộp Final** (hạn 11h — chừa 1h buffer) |
| 10–13h | Luyện pitch 4' + Q&A 2': mở bằng scan xấu → 30s ra bảng field → click highlight → cảnh báo CCCD lệch → export core-banking → slide chi phí |

## Nguyên tắc cắt scope khi cháy giờ (giữ theo thứ tự)
1. Extraction thật + viewer highlight (linh hồn demo)
2. Cross-check CCCD (khác biệt duy nhất không đội nào có)
3. Dashboard + export core-banking (deliverables SHB)
4. PyTorch classifier trên Cloud Run (META Award 130tr tiền mặt)
5. RAG Q&A, YOLO mộc đỏ (chỉ làm khi mọi thứ trên xong)
