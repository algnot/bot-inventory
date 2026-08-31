-- รหัสล็อกต่อกล่อง (hashed) — แต่ละกล่องตั้งรหัสเองได้
alter table boxes add column if not exists pin_hash text;
