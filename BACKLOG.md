# Tồn đọng — đối chiếu đề SHB #195 & mục tiêu 520tr

> Cập nhật: Sat 18/07 ~13:00 · CP2 hạn 23:00 hôm nay · Final 11:00 mai · Demo Day 14:40 mai (5' pitch + 2' Q&A, livestream)

## A. Deliverables tối thiểu của đề SHB (bắt buộc)

| Yêu cầu trong đề | Trạng thái |
|---|---|
| Demo upload & xử lý hồ sơ vay (PDF/scan) | ✅ chạy prod, 5 bộ mẫu |
| Trích xuất thông tin khách hàng | ✅ + thẻ tổng hợp đa chứng từ |
| Trích xuất tài sản bảo đảm | ✅ |
| Trích xuất dữ liệu dòng tiền (cash flow) | ✅ 4 trường revenue/net_profit/repayment_source/monthly_repayment + mục cash_flow trong export |
| Dashboard tracking trạng thái xử lý | ✅ KPI row + state chips |
| API endpoint tích hợp core-banking | ✅ export JSON + access code |
| SWIFT/TT | ✅ MT103 đọc đúng field |
| Mục tiêu 70–80% giảm nhập tay, ngày→giờ | ✅ ĐO RỒI: 95% field đúng (loại lượt lỗi hạ tầng), p50 26s/chứng từ, <500đ/bộ — metrics/ACCURACY.md |

## B. Tồn đọng theo giải (ưu tiên từ trên xuống)

### 🥇 Giải Nhất 260tr — đường vào top 10
- ✅ Bộ test accuracy: 84.4% thô / 95% loại flake · p50 26s · metrics/ACCURACY.md + bench.py
- ✅ Scan giả lập (nghiêng/mờ/nhiễu/bóng): demo-data/scans/ — 3/3 phân loại đúng, vẫn bắt CCCD lệch. (In+chụp thật vẫn nên làm nếu kịp)
- 🔴 **Pitch deck** (theo kịch bản 7 bước trong ARCHITECTURE.md §5) + luyện 5'
- 🔴 **Video demo backup** (quay tối nay khi sản phẩm ổn định)
- 🟡 Final submission fields: deck, video, AI-log ZIP session files (`~/.claude/projects/`)
- ✅ AI-LOG.md đủ phiên · ✅ live URL · ✅ repo public + README

### 🏦 SHB Award 130tr
- 🔴 **Gặp mentor SHB onsite** (Nguyễn Chiến Thắng — Giám đốc TT CNTT) — demo + hỏi format core-banking thật → chỉnh export schema theo lời họ. ĐI CHIỀU NAY, mentor chỉ trực đến 18:00
- ✅ cash_flow fields + export
- ✅ Skin SHB · ✅ luồng nghiệp vụ đúng đề · ✅ pilot pathway trong README

### 🔥 META PyTorch 130tr
- 🔴 **PyTorch classifier CHƯA TỒN TẠI** — tồn đọng lớn nhất. Bạn C: augmented data từ demo-data (xoay/mờ/nhiễu) → fine-tune ResNet18 phân loại 5 loại chứng từ → endpoint `/classify` vào Cloud Run proxy (image v2) → Worker gọi trước Gemini làm router. Không có nó = mất trắng 130tr
- 🔴 Ghi rõ vai trò PyTorch trong pitch: "router quyết định luồng, không phải đồ trang trí"

### ⏰ Checkpoint 2 (hạn 23:00 hôm nay)
- 🟡 Form ĐÃ ĐIỀN SẴN (URL + GitHub + credentials) — lead chỉ bấm Nộp sau 12:00. **Nộp trước 21:00**

## C. Nợ kỹ thuật chấp nhận được (không chặn giải — chỉ làm nếu dư giờ)
- PaddleOCR verify layer (lớp đối chiếu OCR độc lập) — kể trong slide "roadmap" là đủ
- RAG Q&A trên hồ sơ — stretch, chỉ làm sau khi mọi 🔴 xong
- YOLO mộc đỏ — Gemini warnings đã cover 80% giá trị demo
- Migration 0003 user chạy xong thì PATCH customer_name cho 4 bộ demo + recheck

## D. Phân công chiều nay (13:00–19:00)
| Ai | Việc |
|---|---|
| Tài | Gặp mentor SHB (mang laptop) → về chỉnh export schema + thêm cash_flow fields → nộp CP2 |
| Triết | In + scan giấy thật → up test → polish UI theo feedback mentor |
| Bạn C | PyTorch classifier end-to-end (deadline tích hợp: 21:00) |
| Bạn D | Bộ test accuracy + bảng số liệu → draft deck theo kịch bản demo |
