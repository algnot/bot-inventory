import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Box, CatalogMeta, Person, Placement } from "./types";

export type StorageMode = "supabase" | "file";

export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || undefined;
}

export function supabaseKey(): string | undefined {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    undefined
  );
}

export function storageMode(): StorageMode {
  const url = supabaseUrl();
  const key = supabaseKey();
  if (url && key) return "supabase";
  if (url || key) {
    throw new Error(
      "ตั้งค่า NEXT_PUBLIC_SUPABASE_URL และคีย์ (secret หรือ publishable) ให้ครบใน .env.local",
    );
  }
  return "file";
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key) {
    throw new Error("ยังไม่ได้ตั้งค่า Supabase");
  }
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export type PersonRow = {
  id: string;
  name: string;
  notes?: string | null;
  created_at: string;
};

export type BoxRow = {
  id: string;
  name: string;
  rows: number;
  notes: string;
  owner_id: string | null;
  created_at: string;
  pin_hash?: string | null;
};

export type PlacementRow = {
  id: string;
  box_id: string;
  row: number;
  print: string;
  rare: string;
  quantity: number;
  notes: string;
  added_at: string;
};

export type CatalogMetaRow = {
  id: number;
  synced_at: string | null;
  count: number;
  last_added: number;
  last_new_cards: CatalogMeta["lastNewCards"];
  pin_hash?: string | null;
};

export function mapPerson(row: PersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes ?? "",
    createdAt: row.created_at,
  };
}

export function mapBox(row: BoxRow): Box {
  return {
    id: row.id,
    name: row.name,
    rows: row.rows,
    notes: row.notes ?? "",
    ownerId: row.owner_id,
    createdAt: row.created_at,
    pinHash: row.pin_hash ?? null,
    pinEnabled: Boolean(row.pin_hash),
  };
}

export function mapPlacement(row: PlacementRow): Placement {
  return {
    id: row.id,
    boxId: row.box_id,
    row: row.row,
    print: row.print,
    rare: row.rare,
    quantity: row.quantity,
    notes: row.notes ?? "",
    addedAt: row.added_at,
  };
}

export function mapMeta(row: CatalogMetaRow | null): CatalogMeta {
  if (!row) {
    return {
      syncedAt: null,
      count: 0,
      lastAdded: 0,
      lastNewCards: [],
    };
  }
  return {
    syncedAt: row.synced_at,
    count: row.count,
    lastAdded: row.last_added,
    lastNewCards: row.last_new_cards ?? [],
  };
}

export function explainSupabaseError(error: { code?: string; message: string }): string {
  if (error.code === "42P01") {
    return "ยังไม่มีตารางใน Supabase — เปิด SQL Editor แล้วรัน supabase/schema.sql (หรือ supabase/cards.sql ถ้ามีตารางอื่นอยู่แล้ว)";
  }
  if (error.code === "42501" || /row-level security/i.test(error.message)) {
    return "Supabase กันการเขียนไว้ (RLS) — เปิด SQL Editor แล้วรันไฟล์ supabase/rls.sql";
  }
  if (error.code === "23505") {
    if (error.message.includes("people_name")) return "มีชื่อนี้อยู่แล้ว";
    return "ข้อมูลซ้ำ";
  }
  if (error.code === "23503") return "ไม่พบเจ้าของกล่องหรือกล่องที่อ้างถึง";
  return error.message;
}
