# Dossier mentor SHB — ai là ai, hỏi gì, khoe gì

> Nguồn: expertise tags từ hub, chức danh trong lịch workshop BTC, thông tin công khai SHB.
> Cả 8 mentor SHB đều **onsite, không cần booking** — đến bàn mentor khu Technical Architecture Review (09:00–18:00).
> Bối cảnh tổ chức: khối CNTT SHB do Phó TGĐ **Lưu Danh Đức** phụ trách ([bổ nhiệm công khai](https://www.shb.com.vn/shb-chinh-thuc-bo-nhiem-tong-giam-doc-va-pho-tong-giam-doc-phu-trach-cntt/)); core banking là **Intellect** (golive ~2010); đề IDP ghi rõ SHB **đã có prototype nội bộ AWS Bedrock OCR**.

## 🎯 Ưu tiên 1 — Nguyễn Chiến Thắng (Giám đốc Trung tâm Phát triển CNTT)
Tags hub: `ai_ml, computer_vision, nlp` — đúng bộ ba của bài IDP. Trình workshop "AI applications in SHB Bank".
**Suy luận quan trọng: team anh này nhiều khả năng là tác giả đề IDP và chủ prototype Bedrock OCR** → anh ấy biết chính xác prototype nội bộ *thiếu gì* — đó là đáp án chấm giải SHB.

Khoe (theo thứ tự): scan điện thoại mờ → bảng trường 26s → click-to-highlight → **cảnh báo CCCD lệch + so sánh 2 bản gốc** → export core-banking.
Hỏi:
1. "Prototype Bedrock của anh dừng ở đâu — OCR thuần hay đã có lớp đối chiếu chéo/human review như bọn em?"
2. "Payload loan-intake nên bắn vào ESB/middleware nào trước core Intellect? Field naming chuẩn của luồng thẩm định?"
3. "Nếu pilot 1 chi nhánh, anh cần thấy KPI gì để ký?"

## Ưu tiên 2 — Tào Thị Minh Nguyệt (`ai_ml, business_strategy, data_science, product, research`)
Tag rộng nhất nhóm — profile của quản lý sản phẩm/chuyển đổi số hoặc data lead. Người validate **câu chuyện kinh doanh**.
Khoe: dashboard KPI + slide số liệu (95%, 26s, <500đ) + lộ trình pilot 3 tháng.
Hỏi: "Con số nào thuyết phục hội đồng nội bộ SHB nhất — % tự động, thời gian, hay risk catch rate?" · "Quy trình duyệt một pilot công nghệ ở SHB đi qua những cửa nào?"

## Ưu tiên 3 — Nguyễn Huy Phương (`ai_ml, backend, design, frontend, nlp`)
Fullstack + AI — dev senior trong team AI. Người sẽ soi **kiến trúc và code**.
Khoe: repo + ARCHITECTURE.md + shared/fields.ts (từ điển trường chuẩn) + trang ⚙️ tự cấu hình trường.
Hỏi: "Tài liệu SHB thật khác gì demo của em — mẫu biểu nào khó nhất (viết tay? mộc đè chữ? bảng phức tạp?)"

## Các mentor SHB còn lại (gặp nếu 3 người trên bận)
| Ai | Tags | Vai trò suy đoán | Một câu đáng hỏi |
|---|---|---|---|
| Cát Hoàng Long | backend, cloud_infra, devops, frontend, product | DevOps/hạ tầng | "SHB có chính sách cloud nào chặn Cloudflare/GCP không, hay phải on-prem?" |
| Đào Mộng Long | business_strategy, cloud_infra, devops | Hạ tầng + chiến lược | "Chuẩn bảo mật dữ liệu khách hàng khi đi qua LLM bên thứ ba?" |
| Nguyễn Quý Tú | backend, design, devops, product | Dev sản phẩm | "Luồng phê duyệt tín dụng hiện tại có bao nhiêu bước chạm hồ sơ giấy?" |
| Dương Thị Thúy Hằng | business_strategy, design, product, research | Nghiệp vụ/UX | "Cán bộ tín dụng ghét gì nhất ở quy trình nhập liệu hiện tại?" |
| Nguyễn Thị Luận | business_strategy, computer_vision, design, product | Product + CV | "Loại chứng từ nào chiếm 80% khối lượng thực tế?" |

## Ngày mai (Chủ nhật) — không phải mentor nhưng phải gặp
- **14:20 · Chu Minh Ngọc — Head of Talent Development & Recruitment Branding**: talk "Become an AI Builder at SHB". Sau talk lên chào, đưa link demo — đường internship/job trực tiếp, và là người "khuếch đại" tên đội trong nội bộ SHB trước giờ chấm 14:40.

## Luật chung khi gặp
1. Demo trước, hỏi sau — 90 giây demo đáng giá hơn 10 phút mô tả.
2. Ghi âm/ghi chú câu trả lời → về sửa export schema + thêm vào Q&A của PITCH.md.
3. Xin cách liên hệ sau sự kiện (LinkedIn/email) — giải SHB chấm xong vẫn còn pilot pathway.
4. Không hỏi "đề này chấm thế nào" trực diện — hỏi "anh cần thấy gì để tin nó chạy được ở SHB".
