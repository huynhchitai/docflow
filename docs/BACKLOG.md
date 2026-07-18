# Tồn đọng — đối chiếu đề SHB #195 & mục tiêu 520tr

> Cập nhật: Sat 18/07 chiều · Snapshot chấm 36h: 23:00 hôm nay (FREEZE DEPLOY từ 22:00) · Final 11:00 mai (nộp trước 10:00) · Demo Day 14:40 mai

## A. Deliverables của đề SHB — ĐỦ 100%

Toàn bộ deliverable trong đề đã phủ và có bảng đối chiếu công khai trong README
(mục "Đối chiếu đề bài SHB #195") để AI grader chấm 1:1. Không còn mục nào hở.

## B. Trạng thái theo giải

### Giải Nhất 260tr
- ✅ Sản phẩm live + đo thật (95% field, p50 26s, <500đ/bộ) · repo public · README có bảng đối chiếu đề
- ✅ AI-LOG 7 phiên · nhập tay giá trị chuẩn (cả hai nguồn đều sai) · button theo nhận diện SHB Finance
- 🔴 **Video demo backup — quay TỐI NAY** khi sản phẩm ổn định (kịch bản: docs/PITCH.md, dùng bộ "Scan điện thoại · Nguyễn Văn An")
- 🟡 Slide Canva theo PITCH.md — **bắt buộc có slide business model** (BTC yêu cầu riêng)
- 🟡 Final submission trước 10:00 mai: deck + video + AI-LOG + **ZIP session files Claude Code** (`~/.claude/projects/-Users-huynhtai-Developer-*`)

### SHB Award 130tr
- ✅ Cash flow + CIF + export nói ngôn ngữ Intellect · skin SHB · luồng nghiệp vụ đúng đề
- 🟡 Chưa gặp được mentor thì tranh thủ Demo Day: 14:20 mai talk Chu Minh Ngọc (SHB) — đến sớm bắt chuyện

### META PyTorch 130tr
- ✅ XONG toàn bộ: ResNet18 router (val 94.9%, prod 4/4 @ 99–100%, 120–293ms), TorchScript trên Cloud Run, chip PyTorch trên UI, vai trò "router quyết định luồng" trong PITCH màn 6

## C. Nợ kỹ thuật chấp nhận được (kể trong slide roadmap, KHÔNG code thêm)
- PaddleOCR verify layer · RAG Q&A trên hồ sơ · YOLO mộc đỏ

## D. Checklist tối nay
1. Trước 21:30: chốt deploy cuối cùng, chạy lại 1 vòng demo đủ 7 bước
2. **22:00: FREEZE** — không deploy, không sửa data demo
3. Quay video trên bộ "Scan điện thoại · Nguyễn Văn An" — **KHÔNG resolve cảnh báo CCCD của bộ này** (đạo cụ demo)
4. Bộ "Lê Hoàng Phúc" (lệch kỳ hạn) giữ needs_review làm bằng chứng review queue
