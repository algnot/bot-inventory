"use client";

import type { Card } from "./types";

const DB_NAME = "bot-inventory";
const STORE = "kv";
const CACHE_KEY = "catalog";

export type CatalogCache = {
  version: string;
  cards: Card[];
};

let memory: CatalogCache | null = null;
let inflight: Promise<Card[]> | null = null;

export function catalogVersion(syncedAt?: string | null, count?: number) {
  if (!syncedAt && !count) return "";
  return `${syncedAt ?? ""}:${count ?? 0}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("เปิดแคชไม่สำเร็จ"));
  });
}

export async function readCatalogCache(): Promise<CatalogCache | null> {
  if (memory) return memory;
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    const cached = await new Promise<CatalogCache | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(CACHE_KEY);
      req.onsuccess = () => resolve((req.result as CatalogCache | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (cached?.cards?.length) {
      memory = cached;
      return cached;
    }
  } catch {
    return null;
  }
  return null;
}

export async function writeCatalogCache(cache: CatalogCache) {
  memory = cache;
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).put(cache, CACHE_KEY);
    });
    db.close();
  } catch {
    // แคชในเบราว์เซอร์พังได้ โหลดจาก API ต่อได้
  }
}

export async function loadCatalogClient(version = ""): Promise<Card[]> {
  const cached = await readCatalogCache();
  if (cached && (!version || cached.version === version)) {
    return cached.cards;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    const res = await fetch("/api/catalog", {
      cache: cached ? "no-store" : "force-cache",
    });
    if (!res.ok) throw new Error("โหลดแคตตาล็อกไม่สำเร็จ");
    const data = (await res.json()) as { cards?: Card[]; count?: number };
    const cards = data.cards ?? [];
    const next: CatalogCache = {
      version: version || catalogVersion(null, data.count ?? cards.length),
      cards,
    };
    await writeCatalogCache(next);
    return cards;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}
