import { promises as fs } from "fs";
import path from "path";
import type { Card } from "./types";

const CATALOG_PATH = path.join(process.cwd(), "data", "cards.json");

export function isReadOnlyError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = error instanceof Error ? error.message : "";
  return (
    code === "EROFS" ||
    code === "EACCES" ||
    code === "EPERM" ||
    /read-only file system/i.test(message)
  );
}

export async function loadCatalogFile(): Promise<Card[]> {
  try {
    const raw = await fs.readFile(CATALOG_PATH, "utf8");
    return JSON.parse(raw) as Card[];
  } catch {
    return [];
  }
}

export async function saveCatalogFile(cards: Card[]) {
  await fs.mkdir(path.dirname(CATALOG_PATH), { recursive: true });
  await fs.writeFile(CATALOG_PATH, JSON.stringify(cards), "utf8");
}
