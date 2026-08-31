import type { Card } from "./types";
import { cardKey } from "./types";
import { storageMode } from "./supabase";
import { isReadOnlyError, loadCatalogFile, saveCatalogFile } from "./catalog-file";
import { loadCatalogSupabase, saveCatalogSupabase } from "./catalog-supabase";

let memory: Card[] | null = null;

export async function loadCatalog(): Promise<Card[]> {
  if (memory) return memory;
  if (storageMode() === "supabase") {
    const fromDb = await loadCatalogSupabase();
    if (fromDb.length > 0) {
      memory = fromDb;
      return fromDb;
    }
  }
  const fromFile = await loadCatalogFile();
  memory = fromFile;
  return fromFile;
}

export async function saveCatalog(cards: Card[]) {
  memory = cards;
  if (storageMode() === "supabase") {
    await saveCatalogSupabase(cards);
    try {
      await saveCatalogFile(cards);
    } catch (error) {
      if (!isReadOnlyError(error)) throw error;
    }
    return;
  }
  await saveCatalogFile(cards);
}

export function findCard(cards: Card[], print: string, rare: string) {
  return cards.find((card) => card.print === print && card.rare === rare);
}

export function catalogIndex(cards: Card[]) {
  const map = new Map<string, Card>();
  for (const card of cards) map.set(cardKey(card.print, card.rare), card);
  return map;
}

export function searchCards(cards: Card[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return cards;
  return cards.filter((card) => {
    const hay = [
      card.name,
      card.print,
      card.rare,
      card.type,
      card.subtype,
      card.symbol,
      card.color,
      card.mainEffect,
      card.hashtagText,
      card.ex,
      card.creator,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
