"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Box, CatalogMeta, LocatedCard, Person, Placement } from "@/lib/types";

export type AppState = {
  boxes: Box[];
  people: Person[];
  placements: Placement[];
  located: LocatedCard[];
  meta: CatalogMeta;
  catalogCount: number;
  storage: "supabase" | "file";
  unlockedBoxIds: string[];
};

export function useAppState(query = "") {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const first = useRef(true);

  const reload = useCallback(async (q = query) => {
    if (first.current) setLoading(true);
    try {
      const res = await fetch(`/api/state?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "โหลดข้อมูลไม่สำเร็จ");
      }
      const data = (await res.json()) as AppState;
      setState({
        ...data,
        people: data.people ?? [],
        storage: data.storage ?? "file",
        unlockedBoxIds: data.unlockedBoxIds ?? [],
        boxes: (data.boxes ?? []).map((box) => ({
          ...box,
          pinEnabled: Boolean(box.pinEnabled),
          pinHash: null,
        })),
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      first.current = false;
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void reload(query);
    }, query ? 180 : 0);
    return () => window.clearTimeout(handle);
  }, [query, reload]);

  useEffect(() => {
    const onChange = () => {
      void reload(query);
    };
    window.addEventListener("bot-data-changed", onChange);
    return () => window.removeEventListener("bot-data-changed", onChange);
  }, [query, reload]);

  return { state, error, loading, reload: () => reload(query) };
}
