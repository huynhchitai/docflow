-- Đo thời gian trích xuất mỗi chứng từ (ms) — số liệu cho pitch "từ ngày xuống còn giây"
alter table documents add column if not exists extract_ms int;
