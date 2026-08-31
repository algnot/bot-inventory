-- รันไฟล์นี้ใน SQL Editor ถ้าตารางมีอยู่แล้ว แต่ซิงก์แล้วเจอ RLS
-- (เช่น new row violates row-level security policy)

create table if not exists cards (
  id text primary key,
  print text not null,
  rare text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists cards_print_idx on cards (print);
alter table cards enable row level security;

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
