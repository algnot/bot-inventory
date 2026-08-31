import { promises as fs } from "fs";
import path from "path";
import type { Box, CatalogMeta, Person, Placement, StoreData } from "./types";

/** Local JSON fallback when Supabase env vars are not set. */

const STORE_PATH = path.join(process.cwd(), "data", "store.json");

const emptyMeta = (): CatalogMeta => ({
  syncedAt: null,
  count: 0,
  lastAdded: 0,
  lastNewCards: [],
});

const emptyStore = (): StoreData => ({
  meta: emptyMeta(),
  people: [],
  boxes: [],
  placements: [],
});

function migratePerson(raw: Person): Person {
  return {
    id: raw.id,
    name: raw.name,
    notes: raw.notes ?? "",
    createdAt: raw.createdAt,
  };
}

function migrateBox(raw: Box & { slotsPerRow?: number }): Box {
  return {
    id: raw.id,
    name: raw.name,
    rows: raw.rows,
    notes: raw.notes ?? "",
    ownerId: raw.ownerId ?? null,
    createdAt: raw.createdAt,
    pinHash: raw.pinHash ?? null,
    pinEnabled: Boolean(raw.pinHash),
  };
}

function migratePlacement(raw: Placement & { slot?: number }): Placement {
  return {
    id: raw.id,
    boxId: raw.boxId,
    row: raw.row,
    print: raw.print,
    rare: raw.rare,
    quantity: raw.quantity,
    notes: raw.notes ?? "",
    addedAt: raw.addedAt,
  };
}

let writeQueue: Promise<void> = Promise.resolve();

async function readStore(): Promise<StoreData> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const data = JSON.parse(raw) as StoreData;
    return {
      meta: { ...emptyMeta(), ...data.meta },
      people: (data.people ?? []).map(migratePerson),
      boxes: (data.boxes ?? []).map(migrateBox),
      placements: (data.placements ?? []).map(migratePlacement),
    };
  } catch {
    return emptyStore();
  }
}

async function writeStore(data: StoreData) {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function getStore() {
  return enqueue(() => readStore());
}

export function updateStore(mutator: (data: StoreData) => StoreData | void) {
  return enqueue(async () => {
    const current = await readStore();
    const next = mutator(current) ?? current;
    await writeStore(next);
    return next;
  });
}

export function createPerson(name: string, notes = "") {
  return updateStore((data) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("ใส่ชื่อก่อน");
    if (data.people.some((person) => person.name === trimmed)) {
      throw new Error("มีชื่อนี้อยู่แล้ว");
    }
    const person: Person = {
      id: crypto.randomUUID(),
      name: trimmed,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };
    data.people.push(person);
  });
}

export function updatePerson(
  id: string,
  patch: Partial<Pick<Person, "name" | "notes">>,
) {
  return updateStore((data) => {
    const person = data.people.find((item) => item.id === id);
    if (!person) throw new Error("ไม่พบคนนี้");
    if (patch.name !== undefined) {
      const trimmed = patch.name.trim();
      if (!trimmed) throw new Error("ใส่ชื่อก่อน");
      if (data.people.some((item) => item.id !== id && item.name === trimmed)) {
        throw new Error("มีชื่อนี้อยู่แล้ว");
      }
      person.name = trimmed;
    }
    if (patch.notes !== undefined) person.notes = patch.notes.trim();
  });
}

export function deletePerson(id: string) {
  return updateStore((data) => {
    data.people = data.people.filter((person) => person.id !== id);
    for (const box of data.boxes) {
      if (box.ownerId === id) box.ownerId = null;
    }
  });
}

export function createBox(input: {
  name: string;
  rows: number;
  notes?: string;
  ownerId?: string | null;
}): Promise<StoreData> {
  return updateStore((data) => {
    const ownerId = input.ownerId || null;
    if (ownerId && !data.people.some((person) => person.id === ownerId)) {
      throw new Error("ไม่พบเจ้าของกล่อง");
    }
    const box: Box = {
      id: crypto.randomUUID(),
      name: input.name.trim() || "กล่องใหม่",
      rows: Math.max(1, Math.min(40, Math.floor(input.rows))),
      notes: input.notes?.trim() ?? "",
      ownerId,
      createdAt: new Date().toISOString(),
      pinHash: null,
      pinEnabled: false,
    };
    data.boxes.push(box);
  });
}

export function updateBox(
  id: string,
  patch: Partial<Pick<Box, "name" | "rows" | "notes" | "ownerId">>,
) {
  return updateStore((data) => {
    const box = data.boxes.find((item) => item.id === id);
    if (!box) throw new Error("ไม่พบกล่อง");
    if (patch.name !== undefined) box.name = patch.name.trim() || box.name;
    if (patch.notes !== undefined) box.notes = patch.notes;
    if (patch.rows !== undefined) {
      box.rows = Math.max(1, Math.min(40, Math.floor(patch.rows)));
    }
    if (patch.ownerId !== undefined) {
      const ownerId = patch.ownerId || null;
      if (ownerId && !data.people.some((person) => person.id === ownerId)) {
        throw new Error("ไม่พบเจ้าของกล่อง");
      }
      box.ownerId = ownerId;
    }
    data.placements = data.placements.filter(
      (item) => item.boxId !== id || item.row <= box.rows,
    );
  });
}

export function deleteBox(id: string) {
  return updateStore((data) => {
    data.boxes = data.boxes.filter((box) => box.id !== id);
    data.placements = data.placements.filter((item) => item.boxId !== id);
  });
}

export function addPlacement(input: {
  boxId: string;
  row: number;
  print: string;
  rare: string;
  quantity?: number;
  notes?: string;
}) {
  return addPlacements({
    boxId: input.boxId,
    row: input.row,
    notes: input.notes,
    items: [{ print: input.print, rare: input.rare, quantity: input.quantity }],
  });
}

export function addPlacements(input: {
  boxId: string;
  row: number;
  notes?: string;
  items: Array<{ print: string; rare: string; quantity?: number }>;
}) {
  return updateStore((data) => {
    if (!input.items.length) throw new Error("เลือกการ์ดก่อน");
    const box = data.boxes.find((item) => item.id === input.boxId);
    if (!box) throw new Error("ไม่พบกล่อง");
    if (input.row < 1 || input.row > box.rows) throw new Error("แถวไม่ถูกต้อง");
    const notes = input.notes?.trim() ?? "";
    const addedAt = new Date().toISOString();

    for (const item of input.items) {
      const print = item.print.trim();
      const rare = item.rare.trim();
      if (!print || !rare) continue;
      const quantity = Math.max(1, Math.floor(item.quantity ?? 1));
      const existing = data.placements.find(
        (entry) =>
          entry.boxId === input.boxId &&
          entry.row === input.row &&
          entry.print === print &&
          entry.rare === rare,
      );
      if (existing) {
        existing.quantity += quantity;
        if (notes) existing.notes = notes;
        continue;
      }
      data.placements.push({
        id: crypto.randomUUID(),
        boxId: input.boxId,
        row: input.row,
        print,
        rare,
        quantity,
        notes,
        addedAt,
      });
    }
  });
}

export function setRowPlacements(input: {
  boxId: string;
  row: number;
  notes?: string;
  items: Array<{ print: string; rare: string; quantity?: number }>;
}) {
  return updateStore((data) => {
    const box = data.boxes.find((item) => item.id === input.boxId);
    if (!box) throw new Error("ไม่พบกล่อง");
    if (input.row < 1 || input.row > box.rows) throw new Error("แถวไม่ถูกต้อง");
    const notes = input.notes?.trim() ?? "";
    const addedAt = new Date().toISOString();

    const wanted = new Map<string, { print: string; rare: string; quantity: number }>();
    for (const item of input.items) {
      const print = item.print.trim();
      const rare = item.rare.trim();
      if (!print || !rare) continue;
      const quantity = Math.max(1, Math.floor(item.quantity ?? 1));
      const key = `${print}::${rare}`;
      const prev = wanted.get(key);
      wanted.set(key, {
        print,
        rare,
        quantity: (prev?.quantity ?? 0) + quantity,
      });
    }

    const keepIds = new Set<string>();
    for (const existing of data.placements) {
      if (existing.boxId !== input.boxId || existing.row !== input.row) continue;
      const key = `${existing.print}::${existing.rare}`;
      const next = wanted.get(key);
      if (!next) continue;
      existing.quantity = next.quantity;
      existing.notes = notes;
      keepIds.add(existing.id);
      wanted.delete(key);
    }

    data.placements = data.placements.filter(
      (item) =>
        item.boxId !== input.boxId || item.row !== input.row || keepIds.has(item.id),
    );

    for (const item of wanted.values()) {
      data.placements.push({
        id: crypto.randomUUID(),
        boxId: input.boxId,
        row: input.row,
        print: item.print,
        rare: item.rare,
        quantity: item.quantity,
        notes,
        addedAt,
      });
    }
  });
}

export function updatePlacement(
  id: string,
  patch: Partial<Pick<Placement, "row" | "boxId" | "quantity" | "notes">>,
) {
  return updateStore((data) => {
    const item = data.placements.find((placement) => placement.id === id);
    if (!item) throw new Error("ไม่พบการ์ดในแถวนี้");
    const boxId = patch.boxId ?? item.boxId;
    const box = data.boxes.find((entry) => entry.id === boxId);
    if (!box) throw new Error("ไม่พบกล่อง");
    const row = patch.row ?? item.row;
    if (row < 1 || row > box.rows) throw new Error("แถวไม่ถูกต้อง");
    const clash = data.placements.find(
      (other) =>
        other.id !== id &&
        other.boxId === boxId &&
        other.row === row &&
        other.print === item.print &&
        other.rare === item.rare,
    );
    if (clash) {
      clash.quantity += item.quantity;
      data.placements = data.placements.filter((entry) => entry.id !== id);
      return;
    }
    item.boxId = boxId;
    item.row = row;
    if (patch.quantity !== undefined) {
      item.quantity = Math.max(1, Math.floor(patch.quantity));
    }
    if (patch.notes !== undefined) item.notes = patch.notes;
  });
}

export function deletePlacement(id: string) {
  return updateStore((data) => {
    data.placements = data.placements.filter((item) => item.id !== id);
  });
}

export function setCatalogMeta(meta: CatalogMeta) {
  return updateStore((data) => {
    data.meta = meta;
  });
}

export function setBoxPinHash(id: string, pinHash: string | null) {
  return updateStore((data) => {
    const box = data.boxes.find((item) => item.id === id);
    if (!box) throw new Error("ไม่พบกล่อง");
    box.pinHash = pinHash;
    box.pinEnabled = Boolean(pinHash);
  });
}
