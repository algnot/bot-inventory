import vm from "node:vm";
import type { Card } from "./types";
import { cardKey } from "./types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const SITE = "https://bottcg.com";

async function fetchText(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "*/*" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ดึงข้อมูลไม่สำเร็จ (${res.status}) ${url}`);
  return res.text();
}

function chunkUrls(html: string) {
  const found = new Set<string>();
  const re = /\/_next\/static\/immutable\/chunks\/[^"' ]+\.js/g;
  for (const match of html.matchAll(re)) found.add(`${SITE}${match[0]}`);
  return [...found];
}

function extractCardsArray(js: string): Card[] | null {
  if (!js.includes('print:"SD01-001"') && !js.includes('print:"BT01-001"')) {
    return null;
  }
  const startToken = js.includes("let r=[{name:")
    ? "let r=[{name:"
    : js.includes("let r=[{")
      ? "let r=[{"
      : null;
  if (!startToken) return null;
  const start = js.indexOf(startToken);
  const arrStart = js.indexOf("[{", start);
  const endMarkers = [
    '],t=a=>{if(!a||"string"',
    '];a.s(["cards"',
    '];e.s(["cards"',
  ];
  let end = -1;
  for (const marker of endMarkers) {
    const idx = js.indexOf(marker, arrStart);
    if (idx !== -1 && (end === -1 || idx < end)) end = idx;
  }
  if (arrStart < 0 || end < 0) return null;
  const source = js.slice(arrStart, end + 1);
  try {
    const cards = vm.runInNewContext(source, Object.create(null), {
      timeout: 8000,
    });
    if (!Array.isArray(cards) || cards.length === 0) return null;
    return cards as Card[];
  } catch {
    return null;
  }
}

export type SyncResult = {
  total: number;
  added: number;
  newCards: Array<{ name: string; print: string; rare: string }>;
  syncedAt: string;
};

export async function syncCatalogFromBottcg(previous: Card[]): Promise<{
  cards: Card[];
  result: SyncResult;
}> {
  const html = await fetchText(`${SITE}/cards`);
  const urls = chunkUrls(html);
  if (urls.length === 0) {
    throw new Error("ไม่พบไฟล์ข้อมูลการ์ดจาก bottcg.com");
  }

  let cards: Card[] | null = null;
  for (const url of urls) {
    const js = await fetchText(url);
    cards = extractCardsArray(js);
    if (cards) break;
  }
  if (!cards) {
    throw new Error("อ่านรายการการ์ดจากเว็บอย่างเป็นทางการไม่สำเร็จ");
  }

  const prevKeys = new Set(previous.map((card) => cardKey(card.print, card.rare)));
  const newCards = cards
    .filter((card) => !prevKeys.has(cardKey(card.print, card.rare)))
    .map((card) => ({ name: card.name, print: card.print, rare: card.rare }));

  return {
    cards,
    result: {
      total: cards.length,
      added: newCards.length,
      newCards: newCards.slice(0, 80),
      syncedAt: new Date().toISOString(),
    },
  };
}
