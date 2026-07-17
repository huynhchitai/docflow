-- DocFlow schema v1 — theo ER diagram trong .claude/ARCHITECTURE.md
create extension if not exists pgcrypto;

create table if not exists dossiers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state text not null default 'uploading'
    check (state in ('uploading','extracting','needs_review','done','exported')),
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  mime_type text not null default 'application/pdf',
  doc_type text not null default 'other',
  doc_type_confidence real not null default 0,
  state text not null default 'pending'
    check (state in ('pending','extracting','extracted','failed')),
  warnings jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists fields (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  key text not null,
  label text not null,
  value text not null,
  confidence real not null default 0,
  page int not null default 1,
  box_2d int[] , -- [ymin,xmin,ymax,xmax] chuẩn hóa 0–1000
  verified boolean not null default false,
  human_reviewed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists crosscheck_alerts (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers(id) on delete cascade,
  rule text not null,
  detail text not null,
  severity text not null default 'warning' check (severity in ('info','warning','critical')),
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  field_id uuid references fields(id) on delete set null,
  actor text not null default 'system',
  action text not null,
  old_value text,
  new_value text,
  at timestamptz not null default now()
);

create index if not exists idx_documents_dossier on documents(dossier_id);
create index if not exists idx_fields_document on fields(document_id);
create index if not exists idx_alerts_dossier on crosscheck_alerts(dossier_id);

-- Khóa cửa với anon/authenticated: chỉ Worker (service_role, bypass RLS) được đụng DB
alter table dossiers enable row level security;
alter table documents enable row level security;
alter table fields enable row level security;
alter table crosscheck_alerts enable row level security;
alter table audit_log enable row level security;
