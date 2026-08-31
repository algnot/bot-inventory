-- BOT Inventory — วางใน SQL Editor ของ Supabase แล้วกด Run
-- Project Settings → API: คัดลอก URL + secret หรือ publishable ใส่ .env.local

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

create table if not exists cards (
  id text primary key,
  print text not null,
  rare text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists boxes_owner_id_idx on boxes (owner_id);
create index if not exists placements_box_id_idx on placements (box_id);
create index if not exists cards_print_idx on cards (print);

alter table people enable row level security;
alter table boxes enable row level security;
alter table placements enable row level security;
alter table catalog_meta enable row level security;
alter table cards enable row level security;

-- publishable / anon key ต้องมี policy ถึงจะอ่าน-เขียนได้
-- (secret / service_role ข้าม RLS ได้อยู่แล้ว)
drop policy if exists bot_inventory_people_all on people;
drop policy if exists bot_inventory_boxes_all on boxes;
drop policy if exists bot_inventory_placements_all on placements;
drop policy if exists bot_inventory_catalog_meta_all on catalog_meta;
drop policy if exists bot_inventory_cards_all on cards;

create policy bot_inventory_people_all
  on people for all to anon, authenticated
  using (true) with check (true);

create policy bot_inventory_boxes_all
  on boxes for all to anon, authenticated
  using (true) with check (true);

create policy bot_inventory_placements_all
  on placements for all to anon, authenticated
  using (true) with check (true);

create policy bot_inventory_catalog_meta_all
  on catalog_meta for all to anon, authenticated
  using (true) with check (true);

create policy bot_inventory_cards_all
  on cards for all to anon, authenticated
  using (true) with check (true);

grant all on table people, boxes, placements, catalog_meta, cards to anon, authenticated, service_role;
