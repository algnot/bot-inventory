-- BOT Inventory — วางใน SQL Editor ของ Supabase แล้วกด Run
-- Project Settings → API: คัดลอก URL + service_role ใส่ .env.local

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists boxes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rows integer not null default 4 check (rows >= 1 and rows <= 40),
  notes text not null default '',
  owner_id uuid references people (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists placements (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references boxes (id) on delete cascade,
  row integer not null check (row >= 1),
  print text not null,
  rare text not null,
  quantity integer not null default 1 check (quantity >= 1),
  notes text not null default '',
  added_at timestamptz not null default now(),
  unique (box_id, row, print, rare)
);

create table if not exists catalog_meta (
  id integer primary key check (id = 1),
  synced_at timestamptz,
  count integer not null default 0,
  last_added integer not null default 0,
  last_new_cards jsonb not null default '[]'::jsonb
);

insert into catalog_meta (id)
values (1)
on conflict (id) do nothing;

create index if not exists boxes_owner_id_idx on boxes (owner_id);
create index if not exists placements_box_id_idx on placements (box_id);

alter table people enable row level security;
alter table boxes enable row level security;
alter table placements enable row level security;
alter table catalog_meta enable row level security;
