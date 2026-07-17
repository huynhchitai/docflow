# DocFlow — Vietnam AI Innovation Challenge 2026 (team megalondon)

IDP cho hồ sơ tín dụng ngân hàng (đề SHB #195). **Đọc `.claude/ARCHITECTURE.md` trước khi làm bất cứ gì** — nó chứa bản đồ tiền thưởng, kiến trúc mermaid, pipeline, data model, kịch bản demo và các luật bất di bất dịch.

- Stack: React SPA + Hono trên Cloudflare Workers · Supabase (Postgres/pgvector/Storage) · Vertex AI Gemini qua Cloud Run proxy (ADC) · PyTorch classifier trên Cloud Run.
- Node 22 qua nvm (`source ~/.nvm/nvm.sh && nvm use 22`), package manager: pnpm.
- Sau MỖI phiên làm việc: thêm mục vào `AI-LOG.md` (bắt buộc để hợp lệ Final submission).
- Deploy: `pnpm build && npx wrangler deploy` → https://docflow.prismtechemails.workers.dev
