import { catalogIndex, loadCatalog } from "./catalog";
import { getStore } from "./store";
import type { LocatedCard } from "./types";
import { cardKey } from "./types";
export { locationLabel, typeLabel } from "./labels";

export async function getLocatedCards(query = ""): Promise<LocatedCard[]> {
  const [store, cards] = await Promise.all([getStore(), loadCatalog()]);
  const index = catalogIndex(cards);
  const boxes = new Map(store.boxes.map((box) => [box.id, box]));
  const people = new Map(store.people.map((person) => [person.id, person]));
  const q = query.trim().toLowerCase();

  const rows: LocatedCard[] = [];
  for (const placement of store.placements) {
    const card = index.get(cardKey(placement.print, placement.rare));
    const box = boxes.get(placement.boxId);
    if (!card || !box) continue;
    const owner = box.ownerId ? people.get(box.ownerId)?.name : null;
    if (q) {
      const hay = [
        card.name,
        card.print,
        card.rare,
        card.type,
        card.symbol,
        card.mainEffect,
        box.name,
        owner,
        placement.notes,
        `แถว ${placement.row}`,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) continue;
    }
    rows.push({ ...placement, card, box, ownerName: owner ?? null });
  }

  rows.sort((a, b) => {
    const boxCmp = a.box.name.localeCompare(b.box.name, "th");
    if (boxCmp) return boxCmp;
    return a.row - b.row;
  });
  return rows;
}
