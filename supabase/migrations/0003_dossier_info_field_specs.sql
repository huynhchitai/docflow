-- Thông tin khai báo khi tạo bộ hồ sơ + bảng cấu hình trường tùy chỉnh
alter table dossiers add column if not exists customer_name text;
alter table dossiers add column if not exists note text;

create table if not exists field_specs (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  aliases text, -- regex source, null = chỉ khớp đúng key
  norm text not null default 'text_loose' check (norm in ('digits','person_name','text_loose')),
  crosscheck boolean not null default false,
  profile boolean not null default true,
  created_at timestamptz not null default now()
);
alter table field_specs enable row level security;
