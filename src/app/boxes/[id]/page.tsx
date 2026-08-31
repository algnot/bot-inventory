"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CardImage } from "@/components/card-image";
import { CardModal } from "@/components/card-modal";
import { PlaceModal } from "@/components/place-modal";
import { cardKey } from "@/lib/types";
import type { Card, LocatedCard, Placement } from "@/lib/types";
import { personName } from "@/lib/labels";
import { useAppState } from "@/lib/use-app-state";
import { useCatalog } from "@/lib/use-catalog";

export default function BoxDetailPage() {
  const params = useParams<{ id: string }>();
  const { state, reload, error } = useAppState();
  const catalog = useCatalog(state?.meta.syncedAt, state?.catalogCount);
  const [placeRow, setPlaceRow] = useState<number | null>(null);
  const [detail, setDetail] = useState<LocatedCard | null>(null);
  const [name, setName] = useState("");
  const [rows, setRows] = useState(4);
  const [notes, setNotes] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const box = state?.boxes.find((item) => item.id === params.id);

  useEffect(() => {
    if (!box) return;
    setName(box.name);
    setRows(box.rows);
    setNotes(box.notes ?? "");
    setOwnerId(box.ownerId ?? "");
  }, [box?.id, box?.name, box?.rows, box?.notes, box?.ownerId]);

  const cardsByKey = useMemo(() => {
    const map = new Map<string, Card>();
    for (const card of catalog) map.set(cardKey(card.print, card.rare), card);
    return map;
  }, [catalog]);

  const byRow = useMemo(() => {
    const map = new Map<number, Placement[]>();
    for (const item of state?.placements ?? []) {
      if (item.boxId !== params.id) continue;
      const list = map.get(item.row) ?? [];
      list.push(item);
      map.set(item.row, list);
    }
    return map;
  }, [state?.placements, params.id]);

  async function remove(id: string) {
    await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    setDetail(null);
    await reload();
  }

  async function saveBox(event: React.FormEvent) {
    event.preventDefault();
    if (!box) return;
    if (rows < box.rows) {
      const extra = (state?.placements ?? []).filter(
        (item) => item.boxId === box.id && item.row > rows,
      );
      const extraCount = extra.reduce((sum, item) => sum + item.quantity, 0);
      if (
        extraCount > 0 &&
        !confirm(`ลดเหลือ ${rows} แถว การ์ด ${extraCount} ใบที่อยู่แถวถัดไปจะถูกลบ`)
      ) {
        return;
      }
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/boxes/${box.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          rows,
          notes,
          ownerId: ownerId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกกล่องไม่สำเร็จ");
      await reload();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "บันทึกกล่องไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <p className="p-6 font-bold text-bot-red">{error}</p>;
  if (!state) return <p className="p-6 text-muted">กำลังโหลด...</p>;
  if (!box) {
    return (
      <div className="p-6">
        <p className="font-bold">ไม่พบกล่องนี้</p>
        <Link href="/boxes" className="underline">
          กลับไปหน้ากล่อง
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-6">
      <Link href="/boxes" className="text-sm font-bold underline">
        ← กล่องทั้งหมด
      </Link>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black sm:text-3xl">{box.name}</h1>
          <p className="text-muted">
            {personName(state.people, box.ownerId)
              ? `ของ${personName(state.people, box.ownerId)} · ${box.rows} แถว`
              : `${box.rows} แถว แบบรางยาว`}
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (!confirm(`ลบกล่อง “${box.name}” และการ์ดทั้งหมดในกล่องนี้?`)) return;
            await fetch(`/api/boxes/${box.id}`, { method: "DELETE" });
            window.location.href = "/boxes";
          }}
          className="self-start rounded-full border-2 border-ink px-3 py-1 text-sm font-bold hover:bg-bot-red hover:text-white"
        >
          ลบกล่อง
        </button>
      </div>

      <form
        onSubmit={(event) => void saveBox(event)}
        className="mt-5 grid gap-3 rounded-2xl border-4 border-ink bg-cream p-3 sm:grid-cols-2 sm:p-4 md:grid-cols-[1fr_160px_110px]"
      >
        <label className="block text-sm font-bold">
          ชื่อกล่อง
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 h-12 w-full rounded-xl border-2 border-ink bg-white px-3"
          />
        </label>
        <label className="block text-sm font-bold">
          เจ้าของ
          <select
            value={ownerId}
            onChange={(event) => setOwnerId(event.target.value)}
            className="mt-1 h-12 w-full rounded-xl border-2 border-ink bg-white px-3"
          >
            <option value="">ยังไม่ระบุ</option>
            {(state.people ?? []).map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-bold">
          จำนวนแถว
          <input
            type="number"
            min={1}
            max={40}
            value={rows}
            onChange={(event) => setRows(Number(event.target.value))}
            className="mt-1 h-12 w-full rounded-xl border-2 border-ink bg-white px-3"
          />
        </label>
        <label className="block text-sm font-bold sm:col-span-2 md:col-span-3">
          หมายเหตุ
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            placeholder="เช่น กล่องใบนี้เก็บชุด BT01"
            className="mt-1 w-full rounded-xl border-2 border-ink bg-white px-3 py-2"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 md:col-span-3">
          <button
            type="submit"
            disabled={saving}
            className="h-12 rounded-xl border-2 border-ink bg-ink px-4 font-extrabold text-cream disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลกล่อง"}
          </button>
          {saveError && <p className="text-sm font-bold text-bot-red">{saveError}</p>}
        </div>
      </form>

      <div className="mt-6 space-y-4">
        {Array.from({ length: box.rows }, (_, rowIdx) => {
          const row = rowIdx + 1;
          const items = byRow.get(row) ?? [];
          const total = items.reduce((sum, item) => sum + item.quantity, 0);
          return (
            <section key={row} className="rounded-2xl border-4 border-ink bg-cream p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-black tracking-wide">แถว {row}</h2>
                <p className="text-sm font-semibold text-muted">{total} ใบ</p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {items.map((item) => {
                  const card = cardsByKey.get(cardKey(item.print, item.rare));
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        if (!card) return;
                        setDetail({
                          ...item,
                          card,
                          box,
                          ownerName: personName(state.people, box.ownerId),
                        });
                      }}
                      className="relative w-20 shrink-0 overflow-hidden rounded-lg border-2 border-ink bg-white sm:w-24"
                    >
                      {item.quantity > 1 && (
                        <span className="absolute right-1 top-1 z-10 rounded bg-ink px-1 text-[10px] font-bold text-cream">
                          ×{item.quantity}
                        </span>
                      )}
                      <CardImage
                        print={item.print}
                        rare={item.rare}
                        name={card?.name ?? item.print}
                      />
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setPlaceRow(row)}
                  className="flex w-20 shrink-0 aspect-[249/339] items-center justify-center rounded-lg border-2 border-dashed border-ink/40 bg-white text-2xl font-black text-ink/25 sm:w-24"
                >
                  +
                </button>
              </div>
            </section>
          );
        })}
      </div>

      {placeRow !== null && (
        <PlaceModal
          boxes={state.boxes}
          people={state.people}
          cards={catalog}
          boxId={box.id}
          row={placeRow}
          onClose={() => setPlaceRow(null)}
          onSaved={() => void reload()}
        />
      )}

      {detail && (
        <CardModal
          card={detail.card}
          locations={[detail]}
          onClose={() => setDetail(null)}
          onRemove={() => void remove(detail.id)}
        />
      )}
    </div>
  );
}
