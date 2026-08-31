"use client";

import { useEffect, useMemo, useState } from "react";
import { CardImage } from "@/components/card-image";
import { CardModal } from "@/components/card-modal";
import { MultiFilter } from "@/components/multi-filter";
import { Pagination } from "@/components/pagination";
import { PlaceModal } from "@/components/place-modal";
import { MoveModal, type MoveItem } from "@/components/move-modal";
import { RarityBadge } from "@/components/rarity-badge";
import { searchCards } from "@/lib/catalog-search";
import { displayRare } from "@/lib/image";
import { personName, typeLabel } from "@/lib/labels";
import { seriesCode, seriesLabel } from "@/lib/series";
import { cardKey } from "@/lib/types";
import type { Box, Card, LocatedCard, Person, Placement } from "@/lib/types";
import { useAppState } from "@/lib/use-app-state";
import { useCatalog } from "@/lib/use-catalog";

export default function CatalogPage() {
  const { state, reload, error } = useAppState();
  const cards = useCatalog(state?.meta.syncedAt, state?.catalogCount);
  const [query, setQuery] = useState("");
  const [series, setSeries] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [rares, setRares] = useState<string[]>([]);
  const [selected, setSelected] = useState<Card | null>(null);
  const [placeCard, setPlaceCard] = useState<Card | null>(null);
  const [moveItems, setMoveItems] = useState<MoveItem[] | null>(null);
  const [page, setPage] = useState(1);

  const seriesOptions = useMemo(() => {
    return [...new Set(cards.map((card) => seriesCode(card.print)))]
      .sort()
      .map((code) => ({ value: code, label: seriesLabel(`${code}-000`) }));
  }, [cards]);

  const typeOptions = [
    { value: "Avatar", label: typeLabel("Avatar") },
    { value: "Magic", label: typeLabel("Magic") },
    { value: "Construct", label: typeLabel("Construct") },
    { value: "Life", label: typeLabel("Life") },
    { value: "Token", label: typeLabel("Token") },
  ];

  const rareOptions = ["C", "R", "SR", "UR", "SCR", "PR", "CBR", "USEC"].map((item) => ({
    value: item,
    label: displayRare(item),
  }));

  const filtered = useMemo(() => {
    return searchCards(cards, query).filter((card) => {
      if (series.length && !series.includes(seriesCode(card.print))) return false;
      if (types.length && !types.includes(card.type)) return false;
      if (rares.length && !rares.includes(card.rare)) return false;
      return true;
    });
  }, [cards, query, series, types, rares]);

  const hasFilters = series.length > 0 || types.length > 0 || rares.length > 0;
  const pageSize = 42;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [query, series, types, rares]);

  const locationsFor = (card: Card, boxes: Box[], placements: Placement[], people: Person[]) => {
    const boxMap = new Map(boxes.map((box) => [box.id, box]));
    const rows: LocatedCard[] = [];
    for (const item of placements) {
      if (item.print === card.print && item.rare === card.rare) {
        const box = boxMap.get(item.boxId);
        if (box) {
          rows.push({
            ...item,
            card,
            box,
            ownerName: personName(people, box.ownerId),
          });
        }
      }
    }
    return rows;
  };

  return (
    <div className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-6">
      <h1 className="text-2xl font-black sm:text-3xl">การ์ดทั้งหมด</h1>
      <p className="mt-1 text-sm text-muted sm:text-base">
        ค้นจากแคตตาล็อก Battle of Talingchan
        {state?.meta.syncedAt
          ? ` · ซิงก์ล่าสุด ${new Date(state.meta.syncedAt).toLocaleString("th-TH")}`
          : " · ยังไม่เคยซิงก์จากเว็บ"}
        {state?.storage === "supabase" ? " · คลาวด์" : ""}
      </p>
      {error && <p className="mt-3 font-bold text-bot-red">{error}</p>}
      {state?.meta.lastAdded ? (
        <p className="mt-2 rounded-xl border-2 border-ink bg-gold/40 px-3 py-2 text-sm font-bold">
          ซิงก์รอบล่าสุดมีการ์ดใหม่ {state.meta.lastAdded} ใบ
          {state.meta.lastNewCards.length > 0 &&
            ` เช่น ${state.meta.lastNewCards
              .slice(0, 5)
              .map((card) => card.name)
              .join(", ")}`}
        </p>
      ) : null}

      <div className="mt-4 space-y-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ค้นชื่อ ความสามารถ หรือรหัสการ์ด"
          className="h-12 w-full rounded-xl border-2 border-ink bg-white px-3"
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MultiFilter
            label="ซีรีส์"
            allLabel="ทุกซีรีส์"
            options={seriesOptions}
            selected={series}
            onChange={setSeries}
            searchable
          />
          <MultiFilter
            label="ประเภท"
            allLabel="ทุกประเภท"
            options={typeOptions}
            selected={types}
            onChange={setTypes}
          />
          <MultiFilter
            label="ความหายาก"
            allLabel="ทุกความหายาก"
            options={rareOptions}
            selected={rares}
            onChange={setRares}
          />
          <div className="flex items-center justify-between gap-2 sm:col-span-2 lg:col-span-1 lg:px-1">
            <p className="text-sm font-semibold text-muted">
              แสดง {from}-{to} จาก {filtered.length} ใบ
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSeries([]);
                  setTypes([]);
                  setRares([]);
                }}
                className="text-sm font-bold underline"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>
        {hasFilters && (
          <div className="flex flex-wrap gap-2">
            {series.map((code) => (
              <button
                type="button"
                key={`s-${code}`}
                onClick={() => setSeries(series.filter((item) => item !== code))}
                className="rounded-full border-2 border-ink bg-white px-3 py-1 text-xs font-bold"
              >
                {seriesLabel(`${code}-000`)} ×
              </button>
            ))}
            {types.map((item) => (
              <button
                type="button"
                key={`t-${item}`}
                onClick={() => setTypes(types.filter((value) => value !== item))}
                className="rounded-full border-2 border-ink bg-white px-3 py-1 text-xs font-bold"
              >
                {typeLabel(item)} ×
              </button>
            ))}
            {rares.map((item) => (
              <button
                type="button"
                key={`r-${item}`}
                onClick={() => setRares(rares.filter((value) => value !== item))}
                className="rounded-full border-2 border-ink bg-white px-3 py-1 text-xs font-bold"
              >
                {displayRare(item)} ×
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
        {paged.map((card) => (
          <button
            type="button"
            key={cardKey(card.print, card.rare)}
            onClick={() => setSelected(card)}
            className="min-w-0 overflow-hidden rounded-lg border-2 border-ink bg-white text-left hover:scale-[1.02]"
          >
            <CardImage print={card.print} rare={card.rare} name={card.name} />
            <div className="flex items-center justify-between gap-1 px-1 py-1">
              <span className="min-w-0 truncate text-[10px] font-bold">
                {card.print}
              </span>
              <RarityBadge rare={card.rare} compact />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onChange={(next) => {
            setPage(next);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>

      {selected && (
        <CardModal
          card={selected}
          locations={locationsFor(
            selected,
            state?.boxes ?? [],
            state?.placements ?? [],
            state?.people ?? [],
          )}
          onClose={() => setSelected(null)}
          onPlace={(card) => {
            setSelected(null);
            setPlaceCard(card);
          }}
          onMove={(item) => {
            setSelected(null);
            setMoveItems([
              {
                id: item.id,
                name: item.card.name,
                print: item.print,
                quantity: item.quantity,
                boxId: item.boxId,
                boxName: item.box.name,
              },
            ]);
          }}
        />
      )}

      {moveItems && (
        <MoveModal
          boxes={state?.boxes ?? []}
          people={state?.people ?? []}
          unlockedBoxIds={state?.unlockedBoxIds ?? []}
          items={moveItems}
          onClose={() => setMoveItems(null)}
          onMoved={() => void reload()}
        />
      )}

      {placeCard && (
        <PlaceModal
          boxes={state?.boxes ?? []}
          people={state?.people ?? []}
          unlockedBoxIds={state?.unlockedBoxIds ?? []}
          placements={state?.placements ?? []}
          cards={cards}
          card={placeCard}
          onClose={() => setPlaceCard(null)}
          onSaved={() => void reload()}
        />
      )}
    </div>
  );
}
