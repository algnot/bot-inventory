import type { Box, CatalogMeta, Person, Placement, StoreData } from "./types";
import { storageMode } from "./supabase";
import * as fileStore from "./store-file";
import * as supabaseStore from "./store-supabase";

function backend() {
  return storageMode() === "supabase" ? supabaseStore : fileStore;
}

export function getStore() {
  return backend().getStore();
}

export function createPerson(name: string, notes = "") {
  return backend().createPerson(name, notes);
}

export function updatePerson(
  id: string,
  patch: Partial<Pick<Person, "name" | "notes">>,
) {
  return backend().updatePerson(id, patch);
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

export function addPlacements(input: {
  boxId: string;
  row: number;
  notes?: string;
  items: Array<{ print: string; rare: string; quantity?: number }>;
}) {
  return backend().addPlacements(input);
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

export function setPinHash(pinHash: string | null) {
  return backend().setPinHash(pinHash);
}
