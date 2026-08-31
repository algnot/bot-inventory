import type { Box, CatalogMeta, Placement, StoreData } from "./types";
import { storageMode } from "./supabase";
import * as fileStore from "./store-file";
import * as supabaseStore from "./store-supabase";

function backend() {
  return storageMode() === "supabase" ? supabaseStore : fileStore;
}

export function getStore() {
  return backend().getStore();
}

export function createPerson(name: string) {
  return backend().createPerson(name);
}

export function updatePerson(id: string, name: string) {
  return backend().updatePerson(id, name);
}

export function deletePerson(id: string) {
  return backend().deletePerson(id);
}

export function createBox(input: {
  name: string;
  rows: number;
  notes?: string;
  ownerId?: string | null;
}): Promise<StoreData> {
  return backend().createBox(input);
}

export function updateBox(
  id: string,
  patch: Partial<Pick<Box, "name" | "rows" | "notes" | "ownerId">>,
) {
  return backend().updateBox(id, patch);
}

export function deleteBox(id: string) {
  return backend().deleteBox(id);
}

export function addPlacement(input: {
  boxId: string;
  row: number;
  print: string;
  rare: string;
  quantity?: number;
  notes?: string;
}) {
  return backend().addPlacement(input);
}

export function updatePlacement(
  id: string,
  patch: Partial<Pick<Placement, "row" | "boxId" | "quantity" | "notes">>,
) {
  return backend().updatePlacement(id, patch);
}

export function deletePlacement(id: string) {
  return backend().deletePlacement(id);
}

export function setCatalogMeta(meta: CatalogMeta) {
  return backend().setCatalogMeta(meta);
}
