import type { Card } from "./types";
import { cardKey } from "./types";
import { explainSupabaseError, getSupabase } from "./supabase";

const PAGE = 1000;
const UPSERT_CHUNK = 250;

type CardRow = {
  id: string;
  print: string;
  rare: string;
  data: Card;
  updated_at: string;
};

function fail(error: { code?: string; message: string } | null): never {
  throw new Error(error ? explainSupabaseError(error) : "บันทึกแคตตาล็อกไม่สำเร็จ");
}

function toRow(card: Card, updatedAt: string): CardRow {
  return {
    id: cardKey(card.print, card.rare),
    print: card.print,
    rare: card.rare,
    data: card,
    updated_at: updatedAt,
  };
}

export async function loadCatalogSupabase(): Promise<Card[]> {
  const supabase = getSupabase();
  const cards: Card[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("cards")
      .select("data")
      .order("print")
      .range(from, from + PAGE - 1);
    if (error) fail(error);
    const rows = (data ?? []) as Array<{ data: Card }>;
    for (const row of rows) {
      if (row.data) cards.push(row.data);
    }
    if (rows.length < PAGE) break;
  }
  return cards;
}

export async function saveCatalogSupabase(cards: Card[]) {
  const supabase = getSupabase();
  const updatedAt = new Date().toISOString();
  const rows = cards.map((card) => toRow(card, updatedAt));

  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    const { error } = await supabase.from("cards").upsert(chunk, { onConflict: "id" });
    if (error) fail(error);
  }

  const { error } = await supabase.from("cards").delete().lt("updated_at", updatedAt);
  if (error) fail(error);
}
