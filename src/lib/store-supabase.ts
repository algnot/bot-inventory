import type { Box, CatalogMeta, Person, Placement, StoreData } from "./types";
import {
  explainSupabaseError,
  getSupabase,
  mapBox,
  mapMeta,
  mapPerson,
  mapPlacement,
  type BoxRow,
  type CatalogMetaRow,
  type PersonRow,
  type PlacementRow,
} from "./supabase";

function fail(error: { code?: string; message: string } | null): never {
  throw new Error(error ? explainSupabaseError(error) : "บันทึกไม่สำเร็จ");
}

async function loadStore(): Promise<StoreData> {
  const supabase = getSupabase();
  const [people, boxes, placements, meta] = await Promise.all([
    supabase.from("people").select("*").order("created_at"),
    supabase.from("boxes").select("*").order("created_at"),
    supabase.from("placements").select("*").order("added_at"),
    supabase.from("catalog_meta").select("*").eq("id", 1).maybeSingle(),
  ]);

  const firstError = people.error || boxes.error || placements.error || meta.error;
  if (firstError) fail(firstError);

  return {
    meta: mapMeta((meta.data as CatalogMetaRow | null) ?? null),
    people: ((people.data ?? []) as PersonRow[]).map(mapPerson),
    boxes: ((boxes.data ?? []) as BoxRow[]).map(mapBox),
    placements: ((placements.data ?? []) as PlacementRow[]).map(mapPlacement),
  };
}

export function getStore() {
  return loadStore();
}

export async function createPerson(name: string, notes = "") {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("ใส่ชื่อก่อน");
  const payload: Record<string, string> = { name: trimmed };
  const trimmedNotes = notes.trim();
  if (trimmedNotes) payload.notes = trimmedNotes;
  let { error } = await getSupabase().from("people").insert(payload);
  if (error?.code === "42703") {
    const retry = await getSupabase().from("people").insert({ name: trimmed });
    error = retry.error;
  }
  if (error) fail(error);
  return loadStore();
}

export async function updatePerson(
  id: string,
  patch: Partial<Pick<Person, "name" | "notes">>,
) {
  const next: Record<string, string> = {};
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) throw new Error("ใส่ชื่อก่อน");
    next.name = trimmed;
  }
  if (patch.notes !== undefined) next.notes = patch.notes.trim();
  if (Object.keys(next).length === 0) return loadStore();
  let { data, error } = await getSupabase()
    .from("people")
    .update(next)
    .eq("id", id)
    .select("id");
  if (error?.code === "42703" && next.notes !== undefined) {
    delete next.notes;
    if (Object.keys(next).length === 0) return loadStore();
    const retry = await getSupabase().from("people").update(next).eq("id", id).select("id");
    data = retry.data;
    error = retry.error;
  }
  if (error) fail(error);
  if (!data?.length) throw new Error("ไม่พบคนนี้");
  return loadStore();
}

export async function deletePerson(id: string) {
  const { data, error } = await getSupabase()
    .from("people")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail(error);
  if (!data?.length) throw new Error("ไม่พบคนนี้");
  return loadStore();
}

export async function createBox(input: {
  name: string;
  rows: number;
  notes?: string;
  ownerId?: string | null;
}): Promise<StoreData> {
  const ownerId = input.ownerId || null;
  const { error } = await getSupabase().from("boxes").insert({
    name: input.name.trim() || "กล่องใหม่",
    rows: Math.max(1, Math.min(40, Math.floor(input.rows))),
    notes: input.notes?.trim() ?? "",
    owner_id: ownerId,
  });
  if (error) fail(error);
  return loadStore();
}

export async function updateBox(
  id: string,
  patch: Partial<Pick<Box, "name" | "rows" | "notes" | "ownerId">>,
) {
  const supabase = getSupabase();
  const { data: current, error: loadError } = await supabase
    .from("boxes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (loadError) fail(loadError);
  if (!current) throw new Error("ไม่พบกล่อง");

  const next = {
    name:
      patch.name !== undefined ? patch.name.trim() || current.name : current.name,
    notes: patch.notes !== undefined ? patch.notes : current.notes,
    rows:
      patch.rows !== undefined
        ? Math.max(1, Math.min(40, Math.floor(patch.rows)))
        : current.rows,
    owner_id:
      patch.ownerId !== undefined ? patch.ownerId || null : current.owner_id,
  };

  const { error: updateError } = await supabase.from("boxes").update(next).eq("id", id);
  if (updateError) fail(updateError);

  if (next.rows < current.rows) {
    const { error: pruneError } = await supabase
      .from("placements")
      .delete()
      .eq("box_id", id)
      .gt("row", next.rows);
    if (pruneError) fail(pruneError);
  }

  return loadStore();
}

export async function deleteBox(id: string) {
  const { data, error } = await getSupabase()
    .from("boxes")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail(error);
  if (!data?.length) throw new Error("ไม่พบกล่อง");
  return loadStore();
}

export async function addPlacement(input: {
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

export async function addPlacements(input: {
  boxId: string;
  row: number;
  notes?: string;
  items: Array<{ print: string; rare: string; quantity?: number }>;
}) {
  const items = input.items.filter((item) => item.print.trim() && item.rare.trim());
  if (!items.length) throw new Error("เลือกการ์ดก่อน");

  const supabase = getSupabase();
  const { data: box, error: boxError } = await supabase
    .from("boxes")
    .select("id, rows")
    .eq("id", input.boxId)
    .maybeSingle();
  if (boxError) fail(boxError);
  if (!box) throw new Error("ไม่พบกล่อง");
  if (input.row < 1 || input.row > box.rows) throw new Error("แถวไม่ถูกต้อง");

  const notes = input.notes?.trim() ?? "";
  const { data: existingRows, error: findError } = await supabase
    .from("placements")
    .select("*")
    .eq("box_id", input.boxId)
    .eq("row", input.row);
  if (findError) fail(findError);

  const existingMap = new Map(
    ((existingRows ?? []) as PlacementRow[]).map((row) => [
      `${row.print}::${row.rare}`,
      row,
    ]),
  );

  const qtyByKey = new Map<string, { print: string; rare: string; quantity: number }>();
  for (const item of items) {
    const print = item.print.trim();
    const rare = item.rare.trim();
    const key = `${print}::${rare}`;
    const quantity = Math.max(1, Math.floor(item.quantity ?? 1));
    const prev = qtyByKey.get(key);
    qtyByKey.set(key, {
      print,
      rare,
      quantity: (prev?.quantity ?? 0) + quantity,
    });
  }

  const updates: Array<{ id: string; quantity: number; notes: string }> = [];
  const inserts: Array<{
    box_id: string;
    row: number;
    print: string;
    rare: string;
    quantity: number;
    notes: string;
  }> = [];

  for (const item of qtyByKey.values()) {
    const existing = existingMap.get(`${item.print}::${item.rare}`);
    if (existing) {
      updates.push({
        id: existing.id,
        quantity: existing.quantity + item.quantity,
        notes: notes || existing.notes,
      });
    } else {
      inserts.push({
        box_id: input.boxId,
        row: input.row,
        print: item.print,
        rare: item.rare,
        quantity: item.quantity,
        notes,
      });
    }
  }

  if (updates.length) {
    const results = await Promise.all(
      updates.map((item) =>
        supabase
          .from("placements")
          .update({ quantity: item.quantity, notes: item.notes })
          .eq("id", item.id),
      ),
    );
    const updateError = results.find((result) => result.error)?.error;
    if (updateError) fail(updateError);
  }

  if (inserts.length) {
    const { error } = await supabase.from("placements").insert(inserts);
    if (error) fail(error);
  }

  return loadStore();
}

export async function setRowPlacements(input: {
  boxId: string;
  row: number;
  notes?: string;
  items: Array<{ print: string; rare: string; quantity?: number }>;
}) {
  const supabase = getSupabase();
  const { data: box, error: boxError } = await supabase
    .from("boxes")
    .select("id, rows")
    .eq("id", input.boxId)
    .maybeSingle();
  if (boxError) fail(boxError);
  if (!box) throw new Error("ไม่พบกล่อง");
  if (input.row < 1 || input.row > box.rows) throw new Error("แถวไม่ถูกต้อง");

  const notes = input.notes?.trim() ?? "";
  const { data: existingRows, error: findError } = await supabase
    .from("placements")
    .select("*")
    .eq("box_id", input.boxId)
    .eq("row", input.row);
  if (findError) fail(findError);

  const existingMap = new Map(
    ((existingRows ?? []) as PlacementRow[]).map((row) => [
      `${row.print}::${row.rare}`,
      row,
    ]),
  );

  const wanted = new Map<string, { print: string; rare: string; quantity: number }>();
  for (const item of input.items) {
    const print = item.print.trim();
    const rare = item.rare.trim();
    if (!print || !rare) continue;
    const key = `${print}::${rare}`;
    const quantity = Math.max(1, Math.floor(item.quantity ?? 1));
    const prev = wanted.get(key);
    wanted.set(key, {
      print,
      rare,
      quantity: (prev?.quantity ?? 0) + quantity,
    });
  }

  const updates: Array<{ id: string; quantity: number }> = [];
  const inserts: Array<{
    box_id: string;
    row: number;
    print: string;
    rare: string;
    quantity: number;
    notes: string;
  }> = [];
  const keepIds = new Set<string>();

  for (const item of wanted.values()) {
    const existing = existingMap.get(`${item.print}::${item.rare}`);
    if (existing) {
      updates.push({ id: existing.id, quantity: item.quantity });
      keepIds.add(existing.id);
    } else {
      inserts.push({
        box_id: input.boxId,
        row: input.row,
        print: item.print,
        rare: item.rare,
        quantity: item.quantity,
        notes,
      });
    }
  }

  const deleteIds = ((existingRows ?? []) as PlacementRow[])
    .filter((row) => !keepIds.has(row.id))
    .map((row) => row.id);

  if (updates.length) {
    const results = await Promise.all(
      updates.map((item) =>
        supabase
          .from("placements")
          .update({ quantity: item.quantity, notes })
          .eq("id", item.id),
      ),
    );
    const updateError = results.find((result) => result.error)?.error;
    if (updateError) fail(updateError);
  }

  if (deleteIds.length) {
    const { error } = await supabase.from("placements").delete().in("id", deleteIds);
    if (error) fail(error);
  }

  if (inserts.length) {
    const { error } = await supabase.from("placements").insert(inserts);
    if (error) fail(error);
  }

  return loadStore();
}

export async function updatePlacement(
  id: string,
  patch: Partial<Pick<Placement, "row" | "boxId" | "quantity" | "notes">>,
) {
  const supabase = getSupabase();
  const { data: item, error: loadError } = await supabase
    .from("placements")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (loadError) fail(loadError);
  if (!item) throw new Error("ไม่พบการ์ดในแถวนี้");

  const boxId = patch.boxId ?? item.box_id;
  const { data: box, error: boxError } = await supabase
    .from("boxes")
    .select("id, rows")
    .eq("id", boxId)
    .maybeSingle();
  if (boxError) fail(boxError);
  if (!box) throw new Error("ไม่พบกล่อง");

  const row = patch.row ?? item.row;
  if (row < 1 || row > box.rows) throw new Error("แถวไม่ถูกต้อง");

  const { data: clash, error: clashError } = await supabase
    .from("placements")
    .select("*")
    .neq("id", id)
    .eq("box_id", boxId)
    .eq("row", row)
    .eq("print", item.print)
    .eq("rare", item.rare)
    .maybeSingle();
  if (clashError) fail(clashError);

  if (clash) {
    const { error: mergeError } = await supabase
      .from("placements")
      .update({ quantity: clash.quantity + item.quantity })
      .eq("id", clash.id);
    if (mergeError) fail(mergeError);
    const { error: deleteError } = await supabase.from("placements").delete().eq("id", id);
    if (deleteError) fail(deleteError);
    return loadStore();
  }

  const next: Record<string, unknown> = {
    box_id: boxId,
    row,
  };
  if (patch.quantity !== undefined) {
    next.quantity = Math.max(1, Math.floor(patch.quantity));
  }
  if (patch.notes !== undefined) next.notes = patch.notes;

  const { error } = await supabase.from("placements").update(next).eq("id", id);
  if (error) fail(error);
  return loadStore();
}

export async function movePlacements(input: {
  boxId: string;
  row: number;
  items: Array<{ id: string; quantity?: number }>;
}) {
  if (!input.items.length) throw new Error("เลือกการ์ดก่อน");
  const supabase = getSupabase();
  const { data: dest, error: boxError } = await supabase
    .from("boxes")
    .select("id, rows")
    .eq("id", input.boxId)
    .maybeSingle();
  if (boxError) fail(boxError);
  if (!dest) throw new Error("ไม่พบกล่องปลายทาง");
  if (input.row < 1 || input.row > dest.rows) throw new Error("แถวไม่ถูกต้อง");

  const seen = new Set<string>();
  for (const entry of input.items) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    const { data: item, error: loadError } = await supabase
      .from("placements")
      .select("*")
      .eq("id", entry.id)
      .maybeSingle();
    if (loadError) fail(loadError);
    if (!item) throw new Error("ไม่พบการ์ดในแถวนี้");

    const moving =
      entry.quantity === undefined
        ? item.quantity
        : Math.max(1, Math.min(item.quantity, Math.floor(entry.quantity)));
    if (item.box_id === input.boxId && item.row === input.row) continue;

    const { data: clash, error: clashError } = await supabase
      .from("placements")
      .select("*")
      .neq("id", item.id)
      .eq("box_id", input.boxId)
      .eq("row", input.row)
      .eq("print", item.print)
      .eq("rare", item.rare)
      .maybeSingle();
    if (clashError) fail(clashError);

    if (moving >= item.quantity) {
      if (clash) {
        const { error: mergeError } = await supabase
          .from("placements")
          .update({ quantity: clash.quantity + item.quantity })
          .eq("id", clash.id);
        if (mergeError) fail(mergeError);
        const { error: deleteError } = await supabase
          .from("placements")
          .delete()
          .eq("id", item.id);
        if (deleteError) fail(deleteError);
      } else {
        const { error: updateError } = await supabase
          .from("placements")
          .update({ box_id: input.boxId, row: input.row })
          .eq("id", item.id);
        if (updateError) fail(updateError);
      }
      continue;
    }

    const { error: shrinkError } = await supabase
      .from("placements")
      .update({ quantity: item.quantity - moving })
      .eq("id", item.id);
    if (shrinkError) fail(shrinkError);

    if (clash) {
      const { error: mergeError } = await supabase
        .from("placements")
        .update({ quantity: clash.quantity + moving })
        .eq("id", clash.id);
      if (mergeError) fail(mergeError);
    } else {
      const { error: insertError } = await supabase.from("placements").insert({
        box_id: input.boxId,
        row: input.row,
        print: item.print,
        rare: item.rare,
        quantity: moving,
        notes: item.notes ?? "",
      });
      if (insertError) fail(insertError);
    }
  }

  return loadStore();
}

export async function deletePlacement(id: string) {
  const { data, error } = await getSupabase()
    .from("placements")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail(error);
  if (!data?.length) throw new Error("ไม่พบการ์ดในแถวนี้");
  return loadStore();
}

export async function setCatalogMeta(meta: CatalogMeta) {
  const { error } = await getSupabase().from("catalog_meta").upsert({
    id: 1,
    synced_at: meta.syncedAt,
    count: meta.count,
    last_added: meta.lastAdded,
    last_new_cards: meta.lastNewCards,
  });
  if (error) fail(error);
  return loadStore();
}

export async function setBoxPinHash(id: string, pinHash: string | null) {
  const { data, error } = await getSupabase()
    .from("boxes")
    .update({ pin_hash: pinHash })
    .eq("id", id)
    .select("id");
  if (error?.code === "42703") {
    throw new Error("ยังไม่มีคอลัมน์รหัสกล่อง — เปิด SQL Editor แล้วรัน supabase/lock.sql");
  }
  if (error) fail(error);
  if (!data?.length) throw new Error("ไม่พบกล่อง");
  return loadStore();
}
