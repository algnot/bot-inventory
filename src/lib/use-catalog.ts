"use client";

import { useEffect, useState } from "react";
import type { Card } from "@/lib/types";
import {
  catalogVersion,
  loadCatalogClient,
  readCatalogCache,
} from "@/lib/catalog-client";

export function useCatalog(syncedAt?: string | null, count?: number) {
  const version = catalogVersion(syncedAt, count);
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    let live = true;
    void (async () => {
      const cached = await readCatalogCache();
      if (cached?.cards.length && live) setCards(cached.cards);
      if (!version && cached?.cards.length) return;
      try {
        const next = await loadCatalogClient(version);
        if (live) setCards(next);
      } catch {
        if (live && cached?.cards.length) setCards(cached.cards);
      }
    })();
    return () => {
      live = false;
    };
  }, [version]);

  return cards;
}
