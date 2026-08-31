import { unstable_cache, revalidateTag } from "next/cache";
import type { Card } from "./types";
import { cardKey } from "./types";
import { storageMode } from "./supabase";
import { isReadOnlyError, loadCatalogFile, saveCatalogFile } from "./catalog-file";
import { loadCatalogSupabase, saveCatalogSupabase } from "./catalog-supabase";

const CATALOG_TAG = "catalog";

let memory: Card[] | null = null;
let inflight: Promise<Card[]> | null = null;

async function loadCatalogFresh(): Promise<Card[]> {
  if (storageMode() === "supabase") {
    const fromDb = await loadCatalogSupabase();
    if (fromDb.length > 0) return fromDb;
  }
  return loadCatalogFile();
}

const loadCatalogCached = unstable_cache(loadCatalogFresh, ["bot-catalog"], {
  tags: [CATALOG_TAG],
  revalidate: 3600,
});

export async function loadCatalog(): Promise<Card[]> {
  if (memory !== null) return memory;
  if (!inflight) {
    inflight = loadCatalogCached()
      .then((cards) => {
        memory = cards;
        return cards;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
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
  } else {
    await saveCatalogFile(cards);
  }
  revalidateTag(CATALOG_TAG, { expire: 0 });
}

export function catalogFingerprint(cards: Card[]) {
  const first = cards[0]?.print ?? "";
  const last = cards[cards.length - 1]?.print ?? "";
  return `W/"${cards.length}-${first}-${last}"`;
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
