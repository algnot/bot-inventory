-- เพิ่มหมายเหตุให้รายชื่อเจ้าของ (ตาราง people ที่มีอยู่แล้ว)
alter table people add column if not exists notes text not null default '';
