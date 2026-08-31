-- รันไฟล์นี้ใน SQL Editor ถ้าตารางมีอยู่แล้ว แต่ซิงก์แล้วเจอ RLS
-- (เช่น new row violates row-level security policy)

drop policy if exists bot_inventory_people_all on people;
drop policy if exists bot_inventory_boxes_all on boxes;
drop policy if exists bot_inventory_placements_all on placements;
drop policy if exists bot_inventory_catalog_meta_all on catalog_meta;

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

grant all on table people, boxes, placements, catalog_meta to anon, authenticated, service_role;
