import { promises as fs } from "fs";
import path from "path";
import type { Card } from "./types";
import { cardKey } from "./types";

const CATALOG_PATH = path.join(process.cwd(), "data", "cards.json");

let cache: { cards: Card[]; mtimeMs: number } | null = null;

export async function loadCatalog(): Promise<Card[]> {
  try {
    const stat = await fs.stat(CATALOG_PATH);
    if (cache && cache.mtimeMs === stat.mtimeMs) return cache.cards;
    const raw = await fs.readFile(CATALOG_PATH, "utf8");
    const cards = JSON.parse(raw) as Card[];
    cache = { cards, mtimeMs: stat.mtimeMs };
    return cards;
  } catch {
    return [];
  }
}

export async function saveCatalog(cards: Card[]) {
  await fs.mkdir(path.dirname(CATALOG_PATH), { recursive: true });
  await fs.writeFile(CATALOG_PATH, JSON.stringify(cards), "utf8");
  cache = { cards, mtimeMs: Date.now() };
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
