"use client";

import { useEffect, useMemo, useState } from "react";
import type { Box, Card, Person } from "@/lib/types";
import { cardKey } from "@/lib/types";
import { CardImage } from "./card-image";
import { RarityBadge } from "./rarity-badge";
import { searchCards } from "@/lib/catalog-search";
import { personName } from "@/lib/labels";
import { throwIfApiError } from "@/lib/lock-client";

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
        className="flex h-10 w-10 items-center justify-center text-lg font-black hover:bg-ink hover:text-cream"
        aria-label="ลดจำนวน"
      >
        −
      </button>
      <span className="min-w-8 text-center text-sm font-black tabular-nums">{value}</span>
      <button
        type="button"
        onClick={onPlus}
        className="flex h-10 w-10 items-center justify-center text-lg font-black hover:bg-ink hover:text-cream"
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
  cards,
  card: lockedCard,
  boxId: defaultBoxId,
  row: defaultRow,
  onClose,
  onSaved,
}: {
  boxes: Box[];
  people?: Person[];
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

  const box = boxes.find((item) => item.id === boxId);
  const selectedCount = selected.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (defaultRow) setRow(defaultRow);
    if (defaultBoxId) setBoxId(defaultBoxId);
  }, [defaultBoxId, defaultRow]);

  const results = useMemo(() => {
    if (lockedCard) return [lockedCard];
    return searchCards(cards, query).slice(0, 72);
  }, [cards, query, lockedCard]);

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
      if (index < 0) return [...current, { card, quantity: 1 }];
      return current.map((item, i) =>
        i === index ? { ...item, quantity: item.quantity + 1 } : item,
      );
    });
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
        <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
          <label className="text-sm font-bold">
            กล่อง
            <select
              value={boxId}
              onChange={(event) => {
                setBoxId(event.target.value);
                setRow(1);
              }}
              className="mt-1 h-11 w-full rounded-xl border-2 border-ink bg-white px-3"
            >
              {boxes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {personName(people, item.ownerId)
                    ? ` · ของ${personName(people, item.ownerId)}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            แถว
            <select
              value={row}
              onChange={(event) => setRow(Number(event.target.value))}
              className="mt-1 h-11 w-full rounded-xl border-2 border-ink bg-white px-3"
            >
              {Array.from({ length: box?.rows ?? 1 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  แถว {n}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold sm:col-span-2">
            หมายเหตุ
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1 h-11 w-full rounded-xl border-2 border-ink bg-white px-3"
            />
          </label>
        </div>
      )}
    </>
  );

  const selectedList = (
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
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
            <div className="w-12 shrink-0 overflow-hidden rounded-md border border-ink sm:w-14">
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
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl border-4 border-ink bg-cream md:h-[min(90vh,52rem)] md:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b-4 border-ink px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-xl font-extrabold">ใส่การ์ดลงแถว</h2>
            {!lockedCard && (
              <p className="mt-0.5 text-sm text-muted">
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
          <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1.1fr)] md:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.9fr)] md:grid-rows-1">
            <section className="flex min-h-0 flex-col border-b-4 border-ink p-3 sm:p-4 md:border-r-4 md:border-b-0">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหาชื่อการ์ด หรือรหัสเช่น BT01-001"
                className="h-11 w-full shrink-0 rounded-xl border-2 border-ink bg-white px-3 outline-none focus:ring-2 focus:ring-ink/30"
              />
              <div className="mt-3 grid min-h-0 flex-1 grid-cols-3 content-start gap-2 overflow-y-auto sm:grid-cols-4 lg:grid-cols-5">
                {results.map((card) => {
                  const qty = qtyOf(card);
                  return (
                    <button
                      type="button"
                      key={cardKey(card.print, card.rare)}
                      onClick={() => addCard(card)}
                      className={`relative overflow-hidden rounded-lg border-2 ${
                        qty > 0 ? "border-bot-red" : "border-ink/30 hover:border-ink"
                      }`}
                    >
                      {qty > 0 && (
                        <span className="absolute right-1 top-1 z-10 rounded bg-bot-red px-1.5 text-[11px] font-black text-white">
                          ×{qty}
                        </span>
                      )}
                      <CardImage print={card.print} rare={card.rare} name={card.name} />
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="flex min-h-0 flex-col gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 md:pb-4">
              <p className="shrink-0 text-sm font-bold">
                {selected.length
                  ? `จะใส่ ${selected.length} แบบ · รวม ${selectedCount} ใบ`
                  : "รายการที่จะใส่ลงแถว"}
              </p>
              {selectedList}
              <div className="shrink-0 space-y-3 border-t-2 border-ink/15 pt-3">
                {locationFields}
                {error && <p className="text-sm font-bold text-bot-red">{error}</p>}
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || selected.length === 0 || !boxId}
                  className="w-full rounded-full border-2 border-ink bg-ink py-3 font-extrabold text-cream disabled:opacity-50"
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
