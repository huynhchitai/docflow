# AI Collaboration Log — DocFlow (team megalondon)

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
| Google Gemini 2.5 Flash/Pro | Lõi trích xuất chứng từ trong sản phẩm (runtime) | Prompt trong `worker/index.ts` |
| PyTorch (fine-tune tại sự kiện) | Model phân loại chứng từ, serve trên Google Cloud Run | `training/` (sẽ thêm) |

## Nhật ký phiên làm việc

### Phiên 1 — Fri 17/07, ~15:30–17:30 ICT (Claude Code, sau khai màn 14:00)
- Scaffold dự án: Vite + React + TS, Hono Worker, `@cloudflare/vite-plugin`, wrangler.jsonc.
- Viết `worker/index.ts`: endpoint `/api/extract` gọi Gemini 2.5 Flash (PDF/ảnh inline base64,
  structured JSON + `box_2d` + warnings, fallback mock khi chưa có key), `/api/health`.
- Viết UI upload drag-drop + bảng field với confidence badge (`src/App.tsx`, `src/App.css`).
- Deploy Cloudflare Workers: https://docflow.prismtechemails.workers.dev — smoke test OK.
- Sinh bộ demo data hư cấu bằng script Python (fpdf2): đơn vay, BCTC, hợp đồng thế chấp
  (cài lỗi CCCD lệch cho demo cross-check), điện SWIFT MT103.
- Viết ROADMAP.md (kiến trúc đích + phân công 48h).
- Restyle UI theo bộ nhận diện SHB 2026 (cam + Midnight Navy, motif tròn-vuông).

<!-- Thêm phiên mới theo format trên. Mỗi phiên: thời gian, việc AI làm, file liên quan. -->
