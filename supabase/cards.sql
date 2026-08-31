-- รันไฟล์นี้ถ้าตารางอื่นมีอยู่แล้ว แต่ยังไม่มีตารางการ์ด
-- (แก้ EROFS บน Vercel — แคตตาล็อกจะเก็บบน Supabase แทนไฟล์)

create table if not exists cards (
  id text primary key,
  print text not null,
  rare text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists cards_print_idx on cards (print);
alter table cards enable row level security;

drop policy if exists bot_inventory_cards_all on cards;
create policy bot_inventory_cards_all
  on cards for all to anon, authenticated
  using (true) with check (true);

grant all on table cards to anon, authenticated, service_role;
