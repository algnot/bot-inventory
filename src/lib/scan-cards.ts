import type { Card } from "./types";
import { cardKey } from "./types";

export type ScanGuess = {
  print?: string;
  name?: string;
  rare?: string;
  quantity?: number;
};

export type ScanMatch = {
  print: string;
  rare: string;
  name: string;
  quantity: number;
};

const RARE_FALLBACK = ["C", "R", "SR", "UR", "SCR", "PR", "CBR", "USEC"];
const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";

export function normalizePrint(raw: string) {
  let value = raw.trim().toUpperCase().replace(/\s+/g, "");
  value = value.replace(/[๐-๙]/g, (digit) => String(THAI_DIGITS.indexOf(digit)));
  if (/^[A-Z]{2,5}\d{2}\d{3}[A-Z]?$/.test(value) && !value.includes("-")) {
    value = `${value.slice(0, -3)}-${value.slice(-3)}`;
  }
  return value.replace(/O(?=\d)/g, "0");
}

export function normalizeRare(raw: string) {
  const value = raw.trim().toUpperCase();
  if (value === "SEC") return "SCR";
  return value;
}

function pickRare(candidates: Card[], guessedRare?: string) {
  if (guessedRare) {
    const exact = candidates.find((card) => card.rare === guessedRare);
    if (exact) return exact;
  }
  for (const rare of RARE_FALLBACK) {
    const hit = candidates.find((card) => card.rare === rare);
    if (hit) return hit;
  }
  return candidates[0] ?? null;
}

function byPrint(cards: Card[]) {
  const map = new Map<string, Card[]>();
  for (const card of cards) {
    const list = map.get(card.print) ?? [];
    list.push(card);
    map.set(card.print, list);
  }
  return map;
}

export function catalogHint(cards: Card[]) {
  const map = new Map<string, { name: string; rares: string[] }>();
  for (const card of cards) {
    const prev = map.get(card.print);
    if (prev) {
      if (!prev.rares.includes(card.rare)) prev.rares.push(card.rare);
    } else {
      map.set(card.print, { name: card.name, rares: [card.rare] });
    }
  }
  return [...map.entries()]
    .map(([print, item]) => `${print}\t${item.name}\t${item.rares.join(",")}`)
    .join("\n");
}

export function matchGuesses(cards: Card[], guesses: ScanGuess[]) {
  const printMap = byPrint(cards);
  const matched = new Map<string, ScanMatch>();
  const unmatched: string[] = [];

  for (const guess of guesses) {
    const quantity = Math.max(1, Math.floor(Number(guess.quantity) || 1));
    const print = guess.print ? normalizePrint(guess.print) : "";
    const rare = guess.rare ? normalizeRare(guess.rare) : undefined;
    let found: Card | null = null;

    if (print) {
      found = pickRare(printMap.get(print) ?? [], rare);
    }

    if (!found && guess.name?.trim()) {
      const name = guess.name.trim();
      const named = cards.filter((card) => card.name === name);
      const uniquePrints = [...new Set(named.map((card) => card.print))];
      if (uniquePrints.length === 1) {
        found = pickRare(named, rare);
      }
    }

    if (!found) {
      const label = [guess.print, guess.name].filter(Boolean).join(" ");
      unmatched.push(label || "ไม่ทราบใบ");
      continue;
    }

    const key = cardKey(found.print, found.rare);
    const prev = matched.get(key);
    if (prev) {
      prev.quantity += quantity;
    } else {
      matched.set(key, {
        print: found.print,
        rare: found.rare,
        name: found.name,
        quantity,
      });
    }
  }

  return { matched: [...matched.values()], unmatched };
}

function parseModelJson(raw: string): ScanGuess[] {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const parsed = JSON.parse(trimmed) as { cards?: ScanGuess[] } | ScanGuess[];
  const list = Array.isArray(parsed) ? parsed : parsed.cards;
  if (!Array.isArray(list)) return [];
  return list.filter((item) => item && (item.print || item.name));
}

function explainOpenAiError(status: number, body: string) {
  if (status === 401) return "คีย์ OpenAI ไม่ถูกต้อง — ตรวจ OPENAI_API_KEY ใน .env.local";
  if (status === 429) return "โควต้า OpenAI เต็มหรือถี่ไป ลองใหม่ภายหลัง";
  if (/insufficient_quota/i.test(body)) return "เครดิต OpenAI หมด";
  return "อ่านรูปด้วย AI ไม่สำเร็จ";
}

export async function scanCardsWithOpenAi(imageDataUrl: string, cards: Card[]) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ยังไม่ได้ตั้ง OPENAI_API_KEY ใน .env.local");
  }

  const model = process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You identify Battle of Talingchan (BOT TCG / แบทเทิลออฟตลิ่งชัน) cards in photos. A single photo often contains MANY cards in a row, grid, stack, or fan — list every visible physical card, do not stop after the first. Read print codes like BT01-001, SD01-012, PRE0-001. Return JSON {\"cards\":[{\"print\":\"BT01-001\",\"name\":\"...\",\"rare\":\"C\",\"quantity\":1}]}. If the same card appears more than once, set quantity to the number of copies. Use only print codes from the catalog. Omit rare if unsure. Never invent prints.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Catalog (print, Thai name, rarities):\n${catalogHint(cards)}\n\nIdentify ALL cards in this photo. One image can have many cards. Return every one; merge identical copies with quantity.`,
            },
            {
              type: "image_url",
              image_url: { url: imageDataUrl, detail: "high" },
            },
          ],
        },
      ],
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(explainOpenAiError(res.status, body));
  }

  const data = JSON.parse(body) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI ไม่ส่งผลลัพธ์มา");

  return matchGuesses(cards, parseModelJson(content));
}
