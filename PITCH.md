# DocFlow — Kịch bản pitch 5' + Q&A 2' (Demo Day, livestream)

> Người pitch cầm nhịp theo 7 màn. Số liệu lấy từ `metrics/ACCURACY.md`. Demo live trên
> https://docflow.prismtechemails.workers.dev (đăng nhập sẵn TRƯỚC khi lên sân khấu, mở sẵn 2 tab:
> danh sách + bộ "Scan điện thoại · Nguyễn Văn An").

## Màn 1 — Cú mở (30s)
> "Mỗi bộ hồ sơ vay tại SHB đi qua tay một cán bộ tín dụng phải gõ lại **hàng chục trường** từ giấy scan
> vào một hệ thống core ra đời năm 2010. Sai một số CCCD — khoản vay đóng băng, hoặc tệ hơn: lọt gian lận.
> DocFlow biến việc đó thành **26 giây một chứng từ, dưới 500 đồng một bộ** — và không bao giờ bịa số."

## Màn 2 — Demo: thả hồ sơ (45s)
- Kéo 2 ảnh **chụp điện thoại nghiêng mờ** vào bộ mới → chờ chạy (nói trong lúc chờ: kiến trúc 1 câu —
  "Cloudflare Worker điều phối, PyTorch phân loại, Gemini trên Vertex AI trích xuất, Supabase lưu vết").
- Bảng trường hiện ra + thẻ **Thông tin chung khách hàng** tự tổng hợp: "form thẩm định tự điền xong."

## Màn 3 — Khoảnh khắc trust (60s) ⭐ đinh của bài
- Click trường "Số CCCD" → viewer **khoanh cam đúng vị trí trên bản scan**, nền mờ đi:
  > "Mọi con số đều truy vết được về đúng chỗ nó nằm trên giấy. AI không được phép nói mà không chỉ tay."
- Chỉ vào banner đỏ: **"CCCD trên hợp đồng lệch với đơn vay"** → click ô LỆCH → **2 bản scan mở cạnh nhau**:
  > "Đây không phải OCR. Đây là một lớp kiểm soát rủi ro — thứ ngân hàng trả tiền để có."

## Màn 4 — Human-in-the-loop + vận hành (45s)
- Double-click sửa 1 trường → ✏️ + audit log: "người quyết, máy ghi vết."
- Quay về dashboard KPI: % tự động, thời gian TB, cảnh báo — "cán bộ quản lý nhìn thấy cả phòng."
- Bấm **Export core-banking** → JSON: "payload trung lập, adapter đứng trước core Intellect — không đụng core."

## Màn 5 — Số liệu (30s)
| | |
|---|---|
| Field đúng (đo 12 lượt, có ground truth) | **95%** (84% tính cả lượt lỗi hạ tầng — chúng em công bố cả hai) |
| Thời gian / chứng từ | **p50 26s** — so với hàng giờ nhập tay |
| Chi phí AI / bộ hồ sơ | **< 500đ** |
| Scan điện thoại nghiêng mờ | phân loại 3/3, vẫn bắt được CCCD lệch |

## Màn 6 — Kiến trúc + AI-native (30s)
- "AI đọc — code đối chiếu — người quyết định": trọng tài deterministic, giải thích được từng cảnh báo.
- 100% code AI sinh trong 48h (AI-LOG đầy đủ). PyTorch làm **router** phân loại trước khi Gemini trích.
- Không một credential file nào tồn tại: Cloud Run chạy bằng service account ADC.
- Nghiệp vụ tự cấu hình trường mới trên UI — thêm "Mã số thuế" trong 10 giây, không cần deploy.

## Màn 7 — Pilot & chốt (30s)
> "2 tuần sau hôm nay: sandbox chạy trên hồ sơ ẩn danh SHB. 3 tháng: pilot một chi nhánh, luồng vay cá nhân,
> KPI 70% trường tự động. DocFlow không phải demo hackathon — nó là sản phẩm SHB có thể bật công tắc."

---

## Q&A dự phòng (2')
- **Sai thì sao?** → confidence thấp tự vào review queue; verify OCR độc lập là lớp tiếp theo (roadmap); mọi sửa tay có audit.
- **Hồ sơ nhiều người (đồng vay/bảo lãnh)?** → roadmap entity resolution: gom trường theo cụm tên+CCCD, profile riêng từng người.
- **Tích hợp core Intellect 2010 kiểu gì?** → adapter layer trước core qua ESB/API trung gian, payload versioned — nguyên tắc: không đụng core.
- **Sao không để AI tự đối chiếu?** → bộ phận bắt sai lệch mà dùng model thì chính nó có thể bịa; rule thuần + từ điển trường chuẩn (shared/fields.ts).
- **Bảo mật dữ liệu?** → access code tầng API, RLS mọi bảng, credentials chỉ giám khảo thấy qua BTC, file trong private bucket.
- **Scale?** → serverless toàn tuyến (Worker + Cloud Run + Vertex), chi phí tuyến tính theo trang; 10.000 bộ/ngày ≈ 5 triệu đồng AI.
