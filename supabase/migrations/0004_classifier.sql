-- Kết quả của PyTorch router (phân loại trước khi trích xuất)
alter table documents add column if not exists classifier_type text;
alter table documents add column if not exists classifier_confidence real;
