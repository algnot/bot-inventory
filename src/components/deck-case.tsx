"use client";

import { useMemo, useState } from "react";
import type { Card, Placement } from "@/lib/types";
import { cardKey } from "@/lib/types";
import { typeLabel } from "@/lib/labels";
import { CardImage } from "./card-image";

export type DeckEntry = {
  placement: Placement;
  card?: Card;
};

type SortKey = "recommended" | "type" | "name" | "cost" | "power" | "color" | "keyword";

const MAIN_LIMIT = 50;
const LIFE_LIMIT = 5;
const COLOR_ORDER = ["แดง", "ฟ้า", "ม่วง", "เขียว"];
const TYPE_ORDER = ["Avatar", "Magic", "Construct", "Token", "Life"];
const TYPE_PILL: Record<string, string> = {
  Avatar: "bg-bot-red text-white",
  Magic: "bg-sky-600 text-white",
  Construct: "bg-gold text-ink",
  Life: "bg-violet-600 text-white",
  Token: "bg-ink text-cream",
};

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "recommended", label: "แนะนำ" },
  { key: "type", label: "ประเภท" },
  { key: "name", label: "ชื่อ" },
  { key: "cost", label: "ค่าใช้" },
  { key: "power", label: "พลัง" },
  { key: "color", label: "สี" },
  { key: "keyword", label: "คีย์เวิร์ด" },
];

function colorRank(color?: string) {
  const index = COLOR_ORDER.indexOf(color ?? "");
  return index < 0 ? 99 : index;
}

function typeRank(type?: string) {
  const index = TYPE_ORDER.indexOf(type ?? "");
  return index < 0 ? 99 : index;
}

function compareEntries(a: DeckEntry, b: DeckEntry, sort: SortKey) {
  const left = a.card;
  const right = b.card;
  const byName = (left?.name ?? a.placement.print).localeCompare(
    right?.name ?? b.placement.print,
    "th",
  );
  if (sort === "name") return byName;
  if (sort === "cost") return (left?.cost ?? 99) - (right?.cost ?? 99) || byName;
  if (sort === "power") return (right?.power ?? -1) - (left?.power ?? -1) || byName;
  if (sort === "color") return colorRank(left?.color) - colorRank(right?.color) || byName;
  if (sort === "type") return typeRank(left?.type) - typeRank(right?.type) || byName;
  if (sort === "keyword") {
    return (left?.symbol ?? "").localeCompare(right?.symbol ?? "", "th") || byName;
  }
  return (
    colorRank(left?.color) - colorRank(right?.color) ||
    typeRank(left?.type) - typeRank(right?.type) ||
    (left?.cost ?? 99) - (right?.cost ?? 99) ||
    byName
  );
}

function DeckTile({
  entry,
  life,
  selected,
  onOpen,
}: {
  entry: DeckEntry;
  life?: boolean;
  selected?: boolean;
  onOpen: () => void;
}) {
  const name = entry.card?.name ?? entry.placement.print;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`relative min-w-0 overflow-hidden rounded-lg border-2 bg-white text-left ${
        selected ? "border-gold ring-4 ring-gold/40" : life ? "border-bot-red" : "border-ink"
      }`}
    >
      <span className="absolute right-1 top-1 z-10 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-ink bg-ink px-1 text-[11px] font-black text-cream">
        {entry.placement.quantity}
      </span>
      <CardImage
        print={entry.placement.print}
        rare={entry.placement.rare}
        name={name}
      />
      <p className="truncate border-t-2 border-ink px-1 py-0.5 text-center text-[10px] font-extrabold">
        {name}
      </p>
    </button>
  );
}

export function DeckCaseView({
  entries,
  onOpen,
  onAdd,
  editable,
  selecting = false,
  selectedIds,
}: {
  entries: DeckEntry[];
  onOpen: (entry: DeckEntry) => void;
  onAdd: () => void;
  editable: boolean;
  selecting?: boolean;
  selectedIds?: Set<string>;
}) {
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("recommended");

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      const type = entry.card?.type ?? "อื่น";
      counts.set(type, (counts.get(type) ?? 0) + entry.placement.quantity);
    }
    return counts;
  }, [entries]);

  const lifeEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.card?.type === "Life")
        .sort((a, b) => compareEntries(a, b, sort)),
    [entries, sort],
  );

  const mainEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.card?.type !== "Life")
        .sort((a, b) => compareEntries(a, b, sort)),
    [entries, sort],
  );

  const visibleLife =
    !typeFilter || typeFilter === "Life"
      ? lifeEntries
      : [];
  const visibleMain =
    !typeFilter || typeFilter !== "Life"
      ? mainEntries.filter((entry) => !typeFilter || entry.card?.type === typeFilter)
      : [];

  const lifeCount = lifeEntries.reduce((sum, item) => sum + item.placement.quantity, 0);
  const mainCount = mainEntries.reduce((sum, item) => sum + item.placement.quantity, 0);
  const mainBreakdown = ["Avatar", "Magic", "Construct", "Token"]
    .map((type) => {
      const count = typeCounts.get(type) ?? 0;
      return count ? `${typeLabel(type)} ${count}` : null;
    })
    .filter(Boolean)
    .join(" · ");

  const typePills = ["Avatar", "Magic", "Construct", "Life", "Token"].filter(
    (type) => (typeCounts.get(type) ?? 0) > 0,
  );

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {typePills.map((type) => {
            const active = typeFilter === type;
            return (
              <button
                type="button"
                key={type}
                onClick={() => setTypeFilter(active ? null : type)}
                className={`rounded-full border-2 border-ink px-3 py-1 text-sm font-extrabold ${
                  active || !typeFilter ? TYPE_PILL[type] ?? "bg-white" : "bg-white text-muted"
                }`}
              >
                {typeLabel(type)} {typeCounts.get(type)}
              </button>
            );
          })}
        </div>
        {editable && !selecting && (
          <button
            type="button"
            onClick={onAdd}
            className="self-start rounded-full border-2 border-ink bg-ink px-4 py-2 text-sm font-extrabold text-cream"
          >
            เพิ่มการ์ดลงเด็ค
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold">
        <span className="text-muted">เรียง</span>
        {SORTS.map((item) => (
          <button
            type="button"
            key={item.key}
            onClick={() => setSort(item.key)}
            className={
              sort === item.key ? "rounded-full bg-ink px-2 py-0.5 text-cream" : "text-muted"
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {(!typeFilter || typeFilter === "Life") && (
        <section>
          <h2 className="mb-2 text-sm font-black tracking-wide">
            ไลฟ์การ์ด ({lifeCount}/{LIFE_LIMIT})
          </h2>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7">
            {visibleLife.map((entry) => (
              <DeckTile
                key={cardKey(entry.placement.print, entry.placement.rare) + entry.placement.id}
                entry={entry}
                life
                selected={selectedIds?.has(entry.placement.id)}
                onOpen={() => onOpen(entry)}
              />
            ))}
            {editable && !selecting && (
              <button
                type="button"
                onClick={onAdd}
                className="flex aspect-[249/339] items-center justify-center rounded-lg border-2 border-dashed border-ink/40 bg-white text-2xl font-black text-ink/25"
              >
                +
              </button>
            )}
          </div>
        </section>
      )}

      {(!typeFilter || typeFilter !== "Life") && (
        <section>
          <div className="mb-2">
            <h2 className="text-sm font-black tracking-wide">
              การ์ดหลัก ({mainCount}/{MAIN_LIMIT})
            </h2>
            {mainBreakdown && (
              <p className="text-xs font-semibold text-muted">{mainBreakdown}</p>
            )}
          </div>
          {visibleMain.length === 0 && lifeCount === 0 && !editable ? (
            <p className="rounded-2xl border-2 border-dashed border-ink/30 px-4 py-10 text-center text-sm font-medium text-muted">
              ยังไม่มีการ์ดในเด็คนี้
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7">
              {visibleMain.map((entry) => (
                <DeckTile
                  key={cardKey(entry.placement.print, entry.placement.rare) + entry.placement.id}
                  entry={entry}
                  selected={selectedIds?.has(entry.placement.id)}
                  onOpen={() => onOpen(entry)}
                />
              ))}
              {editable && !selecting && (
                <button
                  type="button"
                  onClick={onAdd}
                  className="flex aspect-[249/339] items-center justify-center rounded-lg border-2 border-dashed border-ink/40 bg-white text-2xl font-black text-ink/25"
                >
                  +
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
