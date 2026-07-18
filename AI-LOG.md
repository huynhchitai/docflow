# AI Collaboration Log — DocFlow (team OCanbubu)

> Yêu cầu BTC: "For online AI tools share chat session links. For desktop tools include
> session files such as `~/.claude/projects/<project>`". File này là mục lục con người đọc được;
> bằng chứng gốc là session files đính kèm khi nộp Final (ZIP ≤10MB).
>
> ✅ Cam kết: toàn bộ code được AI sinh trong cửa sổ 48h của hackathon
> (khai màn 17/07/2026 14:00 ICT — đề bài công bố 17/07 10:20 ICT).

## Công cụ AI sử dụng

| Công cụ | Vai trò | Bằng chứng |
|---|---|---|
| Claude Code (Claude Fable 5) | Sinh toàn bộ code: scaffold, Worker API, UI, demo data, kiến trúc | Session files `~/.claude/projects/-Users-huynhtai-Developer-*` (ZIP nộp kèm) |
| Google Gemini 2.5 Flash/Pro (Vertex AI) | Lõi trích xuất chứng từ trong sản phẩm (runtime) | Prompt trong `worker/index.ts` |
| PyTorch (fine-tune tại sự kiện) | ResNet18 phân loại 4 loại chứng từ — ROUTER của pipeline, TorchScript trên Cloud Run | `training/` + `gcp-proxy/model.pt` |

## Nhật ký phiên làm việc

### Phiên 1 — Fri 17/07, ~15:30–17:30 ICT (Claude Code, sau khai màn 14:00)
- Scaffold dự án: Vite + React + TS, Hono Worker, `@cloudflare/vite-plugin`, wrangler.jsonc.
- Viết `worker/index.ts`: endpoint `/api/extract` gọi Gemini 2.5 Flash (PDF/ảnh inline base64,
  structured JSON + `box_2d` + warnings, fallback mock khi chưa có key), `/api/health`.
- Viết UI upload drag-drop + bảng field với confidence badge (`src/App.tsx`, `src/App.css`).
- Deploy Cloudflare Workers: https://docflow.huynhchitai.com — smoke test OK.
- Sinh bộ demo data hư cấu bằng script Python (fpdf2): đơn vay, BCTC, hợp đồng thế chấp
  (cài lỗi CCCD lệch cho demo cross-check), điện SWIFT MT103.
- Viết ROADMAP.md (kiến trúc đích + phân công 48h).
- Restyle UI theo bộ nhận diện SHB 2026 (cam + Midnight Navy, motif tròn-vuông).

### Phiên 2 — Fri 17/07, ~17:30–19:15 ICT (Claude Code)
- Chuyển LLM sang Gemini qua Vertex AI. Org policy chặn SA key → kiến trúc thay thế:
  **Cloud Run proxy** (`gcp-proxy/`) chạy bằng service account `docflow-vertex` qua ADC
  (không tồn tại key file — tuân thủ org policy), Worker gọi proxy với secret header.
- Setup GCP bằng gcloud: bật APIs (aiplatform, run, artifactregistry), tạo SA + role
  `aiplatform.user`, build image linux/amd64 local, push Artifact Registry, deploy Cloud Run.
- Model: `gemini-3-flash-preview` (2.5-flash đã ngừng cho user mới).
- Test end-to-end trên hợp đồng thế chấp demo: doc_type 100%, đủ field + bbox,
  tự phát hiện CCCD lệch và cảnh báo thiếu chữ ký/con dấu.

### Phiên 3 — Fri 17/07, ~19:30–22:45 ICT (Claude Code)
- Supabase: secrets lên prod Worker, bucket `scans`, migration 0001 (5 bảng + RLS, lead chạy SQL Editor).
- Viết vòng đời hồ sơ trong Worker (`worker/db.ts`, `worker/crosscheck.ts`, mở rộng `index.ts`):
  POST/GET dossiers, upload nhiều file → Storage → extract → persist fields+bbox,
  cross-check engine (CCCD/tên/số tiền/kỳ hạn giữa các chứng từ), PATCH field + audit log,
  serve file gốc cho viewer, POST export payload core-banking. Retry khi Gemini trả rỗng.
- Test production: upload đơn vay + hợp đồng → 16+10 trường,
  alert CRITICAL "Số CCCD không khớp ...346 ≠ ...345" — kịch bản demo chạy thật end-to-end.

### Phiên 4 — Fri 17/07, ~22:45–23:59 ICT (Claude Code)
- UI dossier flow hoàn chỉnh (`src/App.tsx`, `src/api.ts`, `src/DocViewer.tsx`):
  danh sách bộ hồ sơ (state chips + đếm cảnh báo), tạo mới, upload nhiều file,
  bảng trường theo chứng từ, sửa inline double-click (human review + audit),
  banner cảnh báo cross-check, modal export core-banking.
- **Doc Viewer click-to-highlight**: render PDF bằng pdfjs-dist, click trường →
  vẽ khung cam + dim nền đúng vùng box_2d trên bản scan gốc (killer feature demo).
- Deploy + smoke test: dossier "Nguyễn Văn An" state needs_review, 2 chứng từ, 1 alert critical.

### Phiên 5 — Sat 18/07 sáng (Claude Code)
- Cổng access code (Worker middleware + trang đăng nhập), README chuẩn hướng dẫn sử dụng.
- shared/fields.ts: từ điển trường chuẩn dùng chung prompt + cross-check + UI.
- Form tạo/sửa bộ hồ sơ (tên khách khai báo → đối chiếu declared vs extracted).
- Trang ⚙️ Trường dữ liệu (thêm/bớt trường custom, hiệu lực ngay), dashboard KPI (/api/stats).
- Modal so sánh 2 nguồn cạnh nhau khi giá trị lệch. Đo extract_ms. Chùm bbox nhiều dòng.
- 5 bộ hồ sơ demo (generator + upload prod), fix normalize Đ→D (SWIFT không dấu),
  endpoint recheck, nút xóa bộ/chứng từ, bộ icon Lucide thay emoji, BACKLOG.md audit giải.

### Phiên 6 — Sat 18/07 trưa (Claude Code)
- Nghiên cứu core SHB (Intellect, SOA/ESB) → export payload nói ngôn ngữ CIF + integration metadata.
- **PyTorch classifier end-to-end**: sinh dataset 720 ảnh augmented từ demo-data
  (`training/make_dataset.py`), fine-tune ResNet18 3 epochs — **val acc 94.9%**
  (`training/train.py`), xuất TorchScript, serve `/classify` trên Cloud Run (image v2).
- Worker gọi router trước Gemini (gợi ý loại chứng từ vào prompt), xử lý các file
  SONG SONG (n×26s → ~26s), lưu classifier_type/conf (migration 0004), chip 🔥 PyTorch trên UI.
- Test prod: router 4/4 đúng 99–100% conf, 120–293ms/lượt; E2E router+Gemini khớp nhau.
- Bench accuracy trích xuất: 95% field đúng (loại flake), p50 26s — metrics/ACCURACY.md.
- Dossier mentor SHB (MENTORS-SHB.md), PITCH.md 7 màn, scan giả lập, cash_flow fields.

<!-- Thêm phiên mới theo format trên. Mỗi phiên: thời gian, việc AI làm, file liên quan. -->
