import type { Card } from "@/lib/types";

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
