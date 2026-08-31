-- เก็บรหัสล็อกไว้ใน catalog_meta (hashed)
alter table catalog_meta add column if not exists pin_hash text;
