"use client";

import { useEffect, useMemo, useState } from "react";
import type { Box, Card, Person } from "@/lib/types";
import { CardImage } from "./card-image";
import { RarityBadge } from "./rarity-badge";
import { searchCards } from "@/lib/catalog-search";
import { personName } from "@/lib/labels";

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
  const [selected, setSelected] = useState<Card | null>(lockedCard ?? null);
  const [boxId, setBoxId] = useState(defaultBoxId ?? boxes[0]?.id ?? "");
  const [row, setRow] = useState(defaultRow ?? 1);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const box = boxes.find((item) => item.id === boxId);

  useEffect(() => {
    if (defaultRow) setRow(defaultRow);
    if (defaultBoxId) setBoxId(defaultBoxId);
  }, [defaultBoxId, defaultRow]);

  const results = useMemo(() => {
    if (lockedCard) return [lockedCard];
    return searchCards(cards, query).slice(0, 24);
  }, [cards, query, lockedCard]);

  async function save() {
    if (!selected) {
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
          print: selected.print,
          rare: selected.rare,
          quantity,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 md:items-center md:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border-4 border-ink bg-cream p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:rounded-3xl md:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">ใส่การ์ดลงแถว</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-2 border-ink px-3 py-1 text-sm font-bold"
          >
            ปิด
          </button>
        </div>

        {!lockedCard && (
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาชื่อการ์ด หรือรหัสเช่น BT01-001"
            className="mt-4 w-full rounded-xl border-2 border-ink bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ink/30"
          />
        )}

        {!lockedCard && (
          <div className="mt-3 grid max-h-56 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-6">
            {results.map((card) => {
              const active =
                selected?.print === card.print && selected?.rare === card.rare;
              return (
                <button
                  type="button"
                  key={`${card.print}-${card.rare}`}
                  onClick={() => setSelected(card)}
                  className={`overflow-hidden rounded-lg border-2 ${
                    active ? "border-bot-red" : "border-ink/30 hover:border-ink"
                  }`}
                >
                  <CardImage print={card.print} rare={card.rare} name={card.name} />
                </button>
              );
            })}
          </div>
        )}

        {selected && (
          <div className="mt-4 flex gap-3 rounded-xl border-2 border-ink bg-white p-3">
            <div className="w-20 shrink-0 overflow-hidden rounded-lg border border-ink">
              <CardImage print={selected.print} rare={selected.rare} name={selected.name} />
            </div>
            <div>
              <p className="font-extrabold">{selected.name}</p>
              <p className="text-sm text-muted">{selected.print}</p>
              <div className="mt-1">
                <RarityBadge rare={selected.rare} />
              </div>
            </div>
          </div>
        )}

        {boxes.length === 0 ? (
          <p className="mt-4 text-sm font-medium text-bot-red">
            ยังไม่มีกล่อง — ไปหน้ากล่องเพื่อสร้างก่อน
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <label className="sm:col-span-2 text-sm font-bold">
              กล่อง
              <select
                value={boxId}
                onChange={(event) => {
                  setBoxId(event.target.value);
                  setRow(1);
                }}
                className="mt-1 w-full rounded-xl border-2 border-ink bg-white px-3 py-2"
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
                className="mt-1 w-full rounded-xl border-2 border-ink bg-white px-3 py-2"
              >
                {Array.from({ length: box?.rows ?? 1 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    แถว {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold">
              จำนวน
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border-2 border-ink bg-white px-3 py-2"
              />
            </label>
            <label className="sm:col-span-4 text-sm font-bold">
              หมายเหตุ
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-1 w-full rounded-xl border-2 border-ink bg-white px-3 py-2"
              />
            </label>
          </div>
        )}

        {error && <p className="mt-3 text-sm font-bold text-bot-red">{error}</p>}

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !selected || !boxId}
          className="mt-5 w-full rounded-full border-2 border-ink bg-ink py-3 font-extrabold text-cream disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกลงแถวนี้"}
        </button>
      </div>
    </div>
  );
}
