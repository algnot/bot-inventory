import type { Person } from "./types";

export function locationLabel(boxName: string, row: number, ownerName?: string | null) {
  if (ownerName) return `${boxName} · ของ${ownerName} · แถว ${row}`;
  return `${boxName} · แถว ${row}`;
}

export function personName(people: Person[], ownerId: string | null | undefined) {
  if (!ownerId) return null;
  return people.find((person) => person.id === ownerId)?.name ?? null;
}

export function typeLabel(type: string, subtype?: string) {
  const map: Record<string, string> = {
    Avatar: "อวตาร",
    Magic: "เวทย์",
    Construct: "สิ่งก่อสร้าง",
    Life: "ไลฟ์",
    Token: "โทเคน",
  };
  const base = map[type] ?? type;
  return subtype ? `${base} · ${subtype}` : base;
}
