"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Box, Card, Person } from "@/lib/types";
import { cardKey } from "@/lib/types";
import { CardImage } from "./card-image";
import { MultiFilter } from "./multi-filter";
import { RarityBadge } from "./rarity-badge";
import { searchCards } from "@/lib/catalog-search";
import { displayRare } from "@/lib/image";
import { personName, typeLabel } from "@/lib/labels";
import { canEditBox, requestUnlock, throwIfApiError } from "@/lib/lock-client";
import { seriesCode, seriesLabel } from "@/lib/series";

type SelectedItem = {
  card: Card;
  quantity: number;
};

function QtyStepper({
  value,
  onMinus,
  onPlus,
}: {
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center overflow-hidden rounded-full border-2 border-ink bg-white">
      <button
        type="button"
        onClick={onMinus}
        className="flex h-8 w-8 items-center justify-center text-base font-black hover:bg-ink hover:text-cream sm:h-10 sm:w-10 sm:text-lg"
        aria-label="ลดจำนวน"
      >
        −
      </button>
      <span className="min-w-6 text-center text-sm font-black tabular-nums sm:min-w-8">{value}</span>
      <button
        type="button"
        onClick={onPlus}
        className="flex h-8 w-8 items-center justify-center text-base font-black hover:bg-ink hover:text-cream sm:h-10 sm:w-10 sm:text-lg"
        aria-label="เพิ่มจำนวน"
      >
        +
      </button>
    </div>
  );
}

export function PlaceModal({
  boxes,
  people = [],
  unlockedBoxIds = [],
  cards,
  card: lockedCard,
  boxId: defaultBoxId,
  row: defaultRow,
  onClose,
  onSaved,
}: {
  boxes: Box[];
  people?: Person[];
  unlockedBoxIds?: string[];
  cards: Card[];
  card?: Card | null;
  boxId?: string;
  row?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [query, setQuery] = useState(lockedCard?.name ?? "");
  const [selected, setSelected] = useState<SelectedItem[]>(
    lockedCard ? [{ card: lockedCard, quantity: 1 }] : [],
  );
  const [boxId, setBoxId] = useState(defaultBoxId ?? boxes[0]?.id ?? "");
  const [row, setRow] = useState(defaultRow ?? 1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [series, setSeries] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [rares, setRares] = useState<string[]>([]);
  const selectedListRef = useRef<HTMLDivElement>(null);

  const box = boxes.find((item) => item.id === boxId);
  const selectedCount = selected.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (defaultRow) setRow(defaultRow);
    if (defaultBoxId) setBoxId(defaultBoxId);
  }, [defaultBoxId, defaultRow]);

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

  const hasFilters = series.length > 0 || types.length > 0 || rares.length > 0;

  const results = useMemo(() => {
    if (lockedCard) return [lockedCard];
    const filtered = searchCards(cards, query).filter((card) => {
      if (series.length && !series.includes(seriesCode(card.print))) return false;
      if (types.length && !types.includes(card.type)) return false;
      if (rares.length && !rares.includes(card.rare)) return false;
      return true;
    });
    if (query.trim() || hasFilters) return filtered;
    return filtered.slice(0, 96);
  }, [cards, query, lockedCard, series, types, rares, hasFilters]);

  function qtyOf(card: Card) {
    return (
      selected.find(
        (item) => item.card.print === card.print && item.card.rare === card.rare,
      )?.quantity ?? 0
    );
  }

  function addCard(card: Card) {
    setSelected((current) => {
      const index = current.findIndex(
        (item) => item.card.print === card.print && item.card.rare === card.rare,
      );
      if (index < 0) return [{ card, quantity: 1 }, ...current];
      const next = { ...current[index], quantity: current[index].quantity + 1 };
      return [next, ...current.filter((_, i) => i !== index)];
    });
    const list = selectedListRef.current;
    if (list) list.scrollTo({ left: 0, top: 0 });
  }

  function bump(card: Card, delta: number) {
    setSelected((current) =>
      current.flatMap((item) => {
        if (item.card.print !== card.print || item.card.rare !== card.rare) {
          return [item];
        }
        const next = item.quantity + delta;
        if (next < 1) return lockedCard ? [{ ...item, quantity: 1 }] : [];
        return [{ ...item, quantity: next }];
      }),
    );
  }

  function removeCard(card: Card) {
    if (lockedCard) return;
    setSelected((current) =>
      current.filter(
        (item) => item.card.print !== card.print || item.card.rare !== card.rare,
      ),
    );
  }

  async function save() {
    if (!selected.length) {
      setError("เลือกการ์ดก่อน");
      return;
    }
    if (!boxId) {
      setError("สร้างกล่องก่อน");
      return;
    }
    const dest = boxes.find((item) => item.id === boxId);
    if (!canEditBox(dest, unlockedBoxIds)) {
      requestUnlock(dest?.id, dest?.name);
      setError(dest ? `ใส่รหัสกล่อง “${dest.name}” ก่อนบันทึก` : "ใส่รหัสกล่องก่อนบันทึก");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boxId,
          row,
          notes,
          items: selected.map((item) => ({
            print: item.card.print,
            rare: item.card.rare,
            quantity: item.quantity,
          })),
        }),
      });
      const data = await res.json();
      throwIfApiError(res, data, "บันทึกไม่สำเร็จ");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  const locationFields = (
    <>
      {boxes.length === 0 ? (
        <p className="text-sm font-medium text-bot-red">
          ยังไม่มีกล่อง — ไปหน้ากล่องเพื่อสร้างก่อน
        </p>
      ) : (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
          <label className="min-w-0 text-sm font-bold">
            กล่อง
            <select
              value={boxId}
              onChange={(event) => {
                setBoxId(event.target.value);
                setRow(1);
              }}
              className="mt-1 h-10 w-full min-w-0 rounded-xl border-2 border-ink bg-white px-2 sm:h-11 sm:px-3"
            >
              {boxes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {personName(people, item.ownerId)
                    ? ` · ของ${personName(people, item.ownerId)}`
                    : ""}
                  {item.pinEnabled ? " · มีรหัส" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            แถว
            <select
              value={row}
              onChange={(event) => setRow(Number(event.target.value))}
              className="mt-1 h-10 w-full rounded-xl border-2 border-ink bg-white px-2 sm:h-11 sm:px-3"
            >
              {Array.from({ length: box?.rows ?? 1 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  แถว {n}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 hidden text-sm font-bold md:block">
            หมายเหตุ
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border-2 border-ink bg-white px-3 sm:h-11"
            />
          </label>
        </div>
      )}
      {box && box.pinEnabled && !canEditBox(box, unlockedBoxIds) && (
        <button
          type="button"
          onClick={() => requestUnlock(box.id, box.name)}
          className="text-sm font-extrabold underline"
        >
          ใส่รหัสกล่อง “{box.name}” ก่อนบันทึก
        </button>
      )}
    </>
  );

  const selectedList = (
    <>
      {selected.length > 0 && (
        <div
          ref={selectedListRef}
          className="flex min-w-0 w-full max-w-full flex-nowrap gap-2 overflow-x-auto overscroll-x-contain pb-1 md:hidden"
        >
          {selected.map((item) => (
            <div
              key={cardKey(item.card.print, item.card.rare)}
              className="flex w-28 shrink-0 flex-col items-center gap-1 rounded-xl border-2 border-ink bg-white p-1"
            >
              <div className="w-12 overflow-hidden rounded-md border border-ink">
                <CardImage
                  print={item.card.print}
                  rare={item.card.rare}
                  name={item.card.name}
                />
              </div>
              <p className="w-full truncate text-center text-[11px] font-extrabold">
                {item.card.name}
              </p>
              <QtyStepper
                value={item.quantity}
                onMinus={() => bump(item.card, -1)}
                onPlus={() => bump(item.card, 1)}
              />
              <button
                type="button"
                onClick={() => removeCard(item.card)}
                className="text-[11px] font-bold text-muted underline"
              >
                เอาออก
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="hidden min-h-0 flex-1 flex-col space-y-2 overflow-y-auto md:flex">
        {selected.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed border-ink/30 px-3 py-8 text-center text-sm font-medium text-muted">
            กดการ์ดจากแคตตาล็อกเพื่อเพิ่มจำนวน
          </p>
        ) : (
          selected.map((item) => (
            <div
              key={cardKey(item.card.print, item.card.rare)}
              className="flex items-center gap-2 rounded-xl border-2 border-ink bg-white p-2"
            >
              <div className="w-14 shrink-0 overflow-hidden rounded-md border border-ink">
                <CardImage
                  print={item.card.print}
                  rare={item.card.rare}
                  name={item.card.name}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold">{item.card.name}</p>
                <p className="text-xs text-muted">{item.card.print}</p>
                <div className="mt-1">
                  <RarityBadge rare={item.card.rare} compact />
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <QtyStepper
                  value={item.quantity}
                  onMinus={() => bump(item.card, -1)}
                  onPlus={() => bump(item.card, 1)}
                />
                {!lockedCard && (
                  <button
                    type="button"
                    onClick={() => removeCard(item.card)}
                    className="text-xs font-bold text-muted underline hover:text-bot-red"
                  >
                    เอาออก
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink/70 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-svh max-h-svh w-full max-w-6xl flex-col overflow-hidden border-4 border-ink bg-cream md:h-[min(90vh,52rem)] md:max-h-none md:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b-4 border-ink px-3 py-2 sm:px-5 sm:py-3">
          <div>
            <h2 className="text-xl font-extrabold">ใส่การ์ดลงแถว</h2>
            {!lockedCard && (
              <p className="mt-0.5 hidden text-sm text-muted sm:block">
                กดการ์ดซ้ำเพื่อเพิ่มจำนวน แล้วบันทึกครั้งเดียว
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-2 border-ink px-3 py-1 text-sm font-bold"
          >
            ปิด
          </button>
        </div>

        {lockedCard ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-5">
            {selectedList}
            {locationFields}
            {error && <p className="text-sm font-bold text-bot-red">{error}</p>}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || selected.length === 0 || !boxId}
              className="w-full rounded-full border-2 border-ink bg-ink py-3 font-extrabold text-cream disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : "บันทึกลงแถวนี้"}
            </button>
          </div>
        ) : (
          <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden md:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.9fr)] md:grid-rows-1">
            <section className="flex min-h-0 min-w-0 flex-col overflow-hidden border-b-4 border-ink p-3 sm:p-4 md:border-r-4 md:border-b-0">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหาชื่อการ์ด หรือรหัสเช่น BT01-001"
                className="h-10 w-full shrink-0 rounded-xl border-2 border-ink bg-white px-3 outline-none focus:ring-2 focus:ring-ink/30 sm:h-11"
              />
              <div className="relative z-20 mt-2 shrink-0 space-y-2">
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <MultiFilter
                    label="ซีรีส์"
                    allLabel="ทุกซีรีส์"
                    options={seriesOptions}
                    selected={series}
                    onChange={setSeries}
                    searchable
                    compact
                  />
                  <MultiFilter
                    label="ประเภท"
                    allLabel="ทุกประเภท"
                    options={typeOptions}
                    selected={types}
                    onChange={setTypes}
                    compact
                  />
                  <MultiFilter
                    label="ความหายาก"
                    allLabel="ทุกความหายาก"
                    options={rareOptions}
                    selected={rares}
                    onChange={setRares}
                    compact
                    menuAlign="end"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-muted">
                    {query.trim() || hasFilters
                      ? `พบ ${results.length} ใบ`
                      : <>แสดง {results.length} ใบแรก<span className="hidden sm:inline"> · ค้นหรือกรองเพื่อหาใบอื่น</span></>}
                  </p>
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setSeries([]);
                        setTypes([]);
                        setRares([]);
                      }}
                      className="text-xs font-bold underline"
                    >
                      ล้างตัวกรอง
                    </button>
                  )}
                </div>
                {hasFilters && (
                  <div className="flex flex-wrap gap-1.5">
                    {series.map((code) => (
                      <button
                        type="button"
                        key={`s-${code}`}
                        onClick={() => setSeries(series.filter((item) => item !== code))}
                        className="rounded-full border-2 border-ink bg-white px-2 py-0.5 text-[11px] font-bold"
                      >
                        {seriesLabel(`${code}-000`)} ×
                      </button>
                    ))}
                    {types.map((item) => (
                      <button
                        type="button"
                        key={`t-${item}`}
                        onClick={() => setTypes(types.filter((value) => value !== item))}
                        className="rounded-full border-2 border-ink bg-white px-2 py-0.5 text-[11px] font-bold"
                      >
                        {typeLabel(item)} ×
                      </button>
                    ))}
                    {rares.map((item) => (
                      <button
                        type="button"
                        key={`r-${item}`}
                        onClick={() => setRares(rares.filter((value) => value !== item))}
                        className="rounded-full border-2 border-ink bg-white px-2 py-0.5 text-[11px] font-bold"
                      >
                        {displayRare(item)} ×
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {results.length === 0 && (
                  <p className="col-span-full py-8 text-center text-sm font-medium text-muted">
                    ไม่พบการ์ดตามตัวกรอง
                  </p>
                )}
                {results.map((card) => {
                  const qty = qtyOf(card);
                  return (
                    <button
                      type="button"
                      key={cardKey(card.print, card.rare)}
                      onClick={() => addCard(card)}
                      className={`relative min-w-0 overflow-hidden rounded-lg border-2 bg-white ${
                        qty > 0 ? "border-bot-red" : "border-ink/30 hover:border-ink"
                      }`}
                    >
                      {qty > 0 && (
                        <span className="absolute right-1 top-1 z-10 rounded bg-bot-red px-1.5 text-[11px] font-black text-white">
                          ×{qty}
                        </span>
                      )}
                      <CardImage
                        print={card.print}
                        rare={card.rare}
                        name={card.name}
                      />
                    </button>
                  );
                })}
                </div>
              </div>
            </section>

            <section className="flex min-w-0 shrink-0 flex-col gap-2 overflow-hidden p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-4 md:min-h-0 md:flex-1 md:gap-3 md:pb-4">
              <p className="shrink-0 text-sm font-bold">
                {selected.length
                  ? `จะใส่ ${selected.length} แบบ · รวม ${selectedCount} ใบ`
                  : "รายการที่จะใส่ลงแถว"}
              </p>
              {selectedList}
              <div className="shrink-0 space-y-2 border-t-2 border-ink/15 pt-2 md:space-y-3 md:pt-3">
                {locationFields}
                {error && <p className="text-sm font-bold text-bot-red">{error}</p>}
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || selected.length === 0 || !boxId}
                  className="w-full rounded-full border-2 border-ink bg-ink py-2.5 text-sm font-extrabold text-cream disabled:opacity-50 sm:py-3 sm:text-base"
                >
                  {saving
                    ? "กำลังบันทึก..."
                    : selectedCount > 0
                      ? `บันทึก ${selectedCount} ใบลงแถวนี้`
                      : "บันทึกลงแถวนี้"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
