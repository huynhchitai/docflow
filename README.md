# DocFlow

**Hồ sơ tín dụng: từ scan đến core-banking trong vài phút — trích xuất có truy vết nguồn, không bịa số liệu.**

Bài dự thi Vietnam AI Innovation Challenge 2026 · Đề SHB #195 — Intelligent Document Processing · Track Tài chính/Ngân hàng · Team **megalondon**

> 🔗 **Demo:** https://docflow.prismtechemails.workers.dev
> Mã truy cập: xem trong hồ sơ Checkpoint 2 trên hub BTC (mục credentials).
>
> *(English: AI document processing for Vietnamese bank credit dossiers — classify, extract with source-traceable bounding boxes, cross-check across documents, human review with audit trail, export to core banking. Built in 48h, 100% AI-generated code.)*

---

## DocFlow làm được gì

Cán bộ tín dụng nhận một bộ hồ sơ vay gồm nhiều chứng từ scan (đơn vay, báo cáo tài chính, hợp đồng thế chấp, điện SWIFT/TT) và phải gõ lại hàng chục trường vào hệ thống. DocFlow thay việc gõ tay đó bằng một luồng duy nhất:

1. **Thả cả bộ hồ sơ vào** — nhiều file PDF/ảnh một lúc, scan mờ/nghiêng vẫn đọc được
2. **AI phân loại từng chứng từ** rồi trích xuất trường nghiệp vụ theo đúng loại (~10–20 giây/chứng từ, có đồng hồ ⏱ đo thật)
3. **Mọi con số đều truy vết được** — click một trường, bản scan gốc mở đúng vị trí, khoanh cam từng dòng
4. **Hệ thống tự đối chiếu chéo** — số CCCD trên hợp đồng lệch với đơn vay là báo đỏ CRITICAL ngay, kèm cảnh báo thiếu chữ ký/con dấu
5. **Người duyệt sửa tại chỗ** — double-click giá trị để sửa, mọi thay đổi ghi vào audit log
6. **Bấm Export core-banking** — nhận payload JSON chuẩn hóa sẵn sàng tích hợp

Nguyên tắc thiết kế: **không bịa**. Trường nào AI không đọc được thì bỏ trống + cảnh báo, không đoán. Trường nào tin cậy thấp thì đánh vàng/đỏ chờ người duyệt.

## Hướng dẫn sử dụng (2 phút)

### Đăng nhập
Mở [demo](https://docflow.prismtechemails.workers.dev), nhập mã truy cập, bấm **Vào hệ thống**. Mã lưu trên máy bạn — lần sau vào thẳng.

### Tạo bộ hồ sơ và nạp chứng từ
1. Gõ tên (vd: *Hồ sơ vay · Nguyễn Văn An*) rồi bấm **+ Tạo bộ hồ sơ**. Bỏ trống tên cũng được — hệ thống tự đặt theo ngày giờ.
2. Thả file vào vùng **"Thả thêm chứng từ vào đây"** — chọn được nhiều file. Dùng thử bộ mẫu trong [`demo-data/`](demo-data/) (dữ liệu hư cấu, có cài sẵn một lỗi lệch CCCD để xem cảnh báo).
3. Chờ dòng *"Đang trích xuất — Gemini đang đọc từng trang…"* chạy xong (mỗi chứng từ hiển thị ⏱ thời gian xử lý thật).

### Đọc kết quả
- **Thẻ "👤 Thông tin chung khách hàng"** trên cùng: hồ sơ khách tổng hợp từ mọi chứng từ. `✓×2` nghĩa là giá trị khớp trên 2 chứng từ; ô viền đỏ **⚠️ LỆCH** nghĩa là các chứng từ mâu thuẫn nhau.
- **Banner đỏ CRITICAL**: cảnh báo đối chiếu chéo (vd: *Số CCCD không khớp giữa hợp đồng và đơn vay*).
- **Bảng trường theo từng chứng từ**: giá trị + % tin cậy (xanh ≥90, vàng ≥70, đỏ <70) + trang nguồn.

### Soi nguồn — tính năng đáng thử nhất
Click bất kỳ trường nào (trong thẻ khách hàng hoặc bảng). Bản scan gốc mở ở cột phải, **khoanh cam đúng vị trí con số đó**, phần còn lại mờ đi. Giá trị nằm vắt nhiều dòng thì khoanh từng dòng.

### Duyệt và xuất
- Sửa giá trị sai: **double-click** vào giá trị → gõ lại → Enter. Trường đã sửa hiện ✏️ và được ưu tiên khi tổng hợp. Mọi lần sửa ghi vào audit log (ai, lúc nào, giá trị cũ → mới).
- Bấm **🏦 Export core-banking** để nhận payload JSON (`shb.core-banking.loan-intake.v1`) gồm thông tin khách hàng, khoản vay, danh mục chứng từ và trạng thái review.

## Kiến trúc

```
React SPA ── Cloudflare Worker (Hono) ── Cloud Run proxy (ADC, không key file) ── Vertex AI Gemini
                   │                            │
                   ├── Supabase Postgres        └── PyTorch classifier (router)
                   └── Supabase Storage (scan gốc)
```

Chi tiết đầy đủ (sơ đồ mermaid, pipeline, data model, lý do chọn từng mảnh): [`.claude/ARCHITECTURE.md`](.claude/ARCHITECTURE.md)

Điểm kiến trúc đáng chú ý:
- **Vertex AI qua Cloud Run proxy chạy bằng service account ADC** — không tồn tại credential file nào trong hệ thống (org policy chặn SA key, và đó là điều tốt)
- **Bounding box `box_2d` chuẩn hóa 0–1000** trả thẳng từ Gemini trong structured output — nguồn gốc mọi trường lưu trong Postgres cùng giá trị
- **Cross-check engine** chạy rule thuần TypeScript trên toàn bộ dossier sau mỗi lần upload — CCCD/tên/số tiền/kỳ hạn
- API khóa bằng access code từ tầng Worker; RLS bật trên mọi bảng

## Chạy local

```bash
pnpm install
cp .env.example .dev.vars   # điền SUPABASE_URL, SUPABASE_SECRET_KEY
pnpm dev                     # Vite + Worker (wrangler) cùng lúc
pnpm build && npx wrangler deploy   # deploy Cloudflare
```

Cần Node 22+. Schema DB: chạy lần lượt các file trong [`supabase/migrations/`](supabase/migrations/) bằng Supabase SQL Editor.

## Tuân thủ 100% AI-native

Toàn bộ code sinh bởi AI trong cửa sổ 48h của hackathon. Nhật ký cộng tác AI đầy đủ theo từng phiên: [`AI-LOG.md`](AI-LOG.md) (kèm session files Claude Code nộp trong final submission).

## Team megalondon

Vietnam AI Innovation Challenge 2026 · Đà Nẵng · 17–19/07/2026
