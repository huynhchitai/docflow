# Đo độ chính xác trích xuất — 18/07/2026

**Phương pháp:** 4 chứng từ demo (đơn vay ×2, hợp đồng, điện SWIFT MT103) × 3 lượt gọi
`/api/extract` trên production, so giá trị trích với ground truth của bộ sinh dữ liệu,
chuẩn hóa trước khi so (số: chỉ giữ chữ số; tên: bỏ dấu, Đ→D). Script: `metrics/bench.py`.

## Kết quả (12 lượt)

| Trường | Đúng | Tỷ lệ |
|---|---|---|
| Họ tên khách hàng | 11/12 | 92% |
| Số CCCD | 8/9 | 89% |
| Số tiền vay | 9/12 | 75% |
| Kỳ hạn | 8/9 | 89% |
| Lãi suất | 2/3 | 67% |
| **Tổng** | **38/45** | **84.4%** |

**Phân tích:** 1/12 lượt Gemini trả về rỗng (đã retry) — riêng lượt đó chiếm 5 ô sai.
**Loại lượt lỗi hạ tầng: 38/40 = 95% field đúng.** Sau đo đã tăng retry 2→3 lần kèm backoff.

## Thời gian trích xuất
- PDF sạch: mean 34.6s · p50 25.8s · max 92.9s (n=12, gồm cả retry)
- Ảnh scan mờ/nghiêng (chụp điện thoại giả lập): 34–43s, phân loại đúng 3/3, vẫn bắt được CCCD lệch

## Chi phí
Gemini Flash qua Vertex: ~1–3 nghìn token/trang → **dưới 500đ/bộ hồ sơ 4 chứng từ**.
