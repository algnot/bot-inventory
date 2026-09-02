"use client";

import { useMemo, useState } from "react";
import type { Box, Person } from "@/lib/types";
import { boxKindLabel, personName } from "@/lib/labels";
import { canEditBox } from "@/lib/lock-client";

export type MoveItem = {
  id: string;
  name: string;
  print: string;
  quantity: number;
  boxId: string;
  boxName: string;
  row: number;
};

function ownerLine(box: Box, people: Person[]) {
  const owner = personName(people, box.ownerId);
  return [
    box.name,
    owner ? `ของ${owner}` : null,
    boxKindLabel(box.rows),
  ]
    .filter(Boolean)
    .join(" · ");
}

async function unlockBox(boxId: string, pin: string, label: string) {
  const res = await fetch("/api/lock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "unlock", boxId, pin }),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error || `รหัส${label}ไม่ถูกต้อง`);
}

export function MoveModal({
  boxes,
  people = [],
  unlockedBoxIds = [],
  items,
  onClose,
  onMoved,
}: {
  boxes: Box[];
  people?: Person[];
  unlockedBoxIds?: string[];
  items: MoveItem[];
  onClose: () => void;
  onMoved: () => void;
}) {
  const sourceIds = [...new Set(items.map((item) => item.boxId))];
  const sourceBoxes = sourceIds
    .map((id) => boxes.find((box) => box.id === id))
    .filter((box): box is Box => Boolean(box));
  const sourceBox = sourceBoxes[0];
  const destinations = boxes.filter((box) => !sourceIds.includes(box.id));
  const [boxId, setBoxId] = useState(destinations[0]?.id ?? "");
  const [row, setRow] = useState(1);
  const [quantity, setQuantity] = useState(items[0]?.quantity ?? 1);
  const [pins, setPins] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dest = boxes.find((item) => item.id === boxId);
  const single = items.length === 1;
  const maxQty = items[0]?.quantity ?? 1;
  const movingCount = single ? quantity : items.reduce((sum, item) => sum + item.quantity, 0);
  const sourceRows = [...new Set(items.map((item) => item.row))];
  const sourceLocked = sourceBoxes.filter((box) => !canEditBox(box, unlockedBoxIds));
  const destNeedsPin = Boolean(dest && !canEditBox(dest, unlockedBoxIds));
  const pinBoxes = [
    ...sourceLocked.map((box) => ({ box, role: "ต้นทาง" as const })),
    ...(destNeedsPin && dest ? [{ box: dest, role: "ปลายทาง" as const }] : []),
  ];

  const payload = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        quantity: single ? quantity : item.quantity,
      })),
    [items, single, quantity],
  );

  async function save() {
    if (!boxId) {
      setError("เลือกกล่องปลายทางก่อน");
      return;
    }
    for (const { box, role } of pinBoxes) {
      if (!pins[box.id]?.trim()) {
        setError(`ใส่รหัสกล่อง${role} “${box.name}” ก่อนย้าย`);
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      for (const { box, role } of pinBoxes) {
        await unlockBox(box.id, pins[box.id], role);
      }
      const res = await fetch("/api/inventory/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boxId, row, items: payload }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "ย้ายการ์ดไม่สำเร็จ");
      window.dispatchEvent(new Event("bot-data-changed"));
      onMoved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ย้ายการ์ดไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-55 flex items-end justify-center bg-ink/70 p-0 md:items-center md:p-4">
      <div
        className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border-4 border-ink bg-cream p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:rounded-3xl md:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">ย้ายการ์ด</h2>
            <p className="mt-1 text-sm text-muted">
              {single
                ? `${items[0].name}${quantity > 1 ? ` ×${quantity}` : ""}`
                : `${items.length} แบบ · รวม ${movingCount} ใบ`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-2 border-ink px-3 py-1 text-sm font-bold"
          >
            ปิด
          </button>
        </div>

        {single && maxQty > 1 && (
          <div className="mt-4 flex items-center gap-2">
            <p className="text-sm font-bold">จำนวนที่ย้าย</p>
            <button
              type="button"
              onClick={() => setQuantity((n) => Math.max(1, n - 1))}
              className="h-10 w-10 rounded-full border-2 border-ink bg-white text-lg font-black"
            >
              −
            </button>
            <span className="min-w-8 text-center text-lg font-black tabular-nums">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((n) => Math.min(maxQty, n + 1))}
              className="h-10 w-10 rounded-full border-2 border-ink bg-white text-lg font-black"
            >
              +
            </button>
            <span className="text-sm font-medium text-muted">จาก {maxQty} ใบ</span>
          </div>
        )}

        {destinations.length === 0 ? (
          <p className="mt-4 text-sm font-bold text-bot-red">
            ยังไม่มีกล่องอื่น — สร้างกล่องปลายทางก่อน
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
              <section className="rounded-2xl border-4 border-ink bg-white p-3">
                <p className="text-[11px] font-black tracking-wide text-bot-red">ต้นทาง</p>
                <p className="mt-1 font-extrabold">
                  {sourceBox ? ownerLine(sourceBox, people) : items[0]?.boxName}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-muted">
                  {sourceBox?.rows === 1
                    ? "เคสเด็ค"
                    : sourceRows.length === 1
                      ? `แถว ${sourceRows[0]}`
                      : `แถว ${sourceRows.join(", ")}`}
                </p>
                {sourceBox?.pinEnabled && (
                  <p className="mt-1 text-xs font-bold text-muted">
                    {canEditBox(sourceBox, unlockedBoxIds) ? "ปลดล็อกแล้ว" : "มีรหัส"}
                  </p>
                )}
                {!single && (
                  <ul className="mt-2 max-h-28 space-y-0.5 overflow-y-auto text-sm font-semibold">
                    {items.map((item) => (
                      <li key={item.id} className="truncate">
                        {item.name}
                        {item.quantity > 1 ? ` ×${item.quantity}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="flex items-center justify-center py-1 sm:px-1">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink bg-ink text-lg font-black text-cream sm:h-12 sm:w-12 sm:text-xl">
                  <span className="sm:hidden">↓</span>
                  <span className="hidden sm:inline">→</span>
                </span>
              </div>

              <section className="rounded-2xl border-4 border-ink bg-white p-3">
                <p className="text-[11px] font-black tracking-wide text-bot-red">ปลายทาง</p>
                <label className="mt-1 block text-sm font-bold">
                  กล่อง
                  <select
                    value={boxId}
                    onChange={(event) => {
                      setBoxId(event.target.value);
                      setRow(1);
                    }}
                    className="mt-1 h-11 w-full rounded-xl border-2 border-ink bg-cream px-2"
                  >
                    {destinations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {ownerLine(item, people)}
                        {item.pinEnabled ? " · มีรหัส" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                {dest && dest.rows > 1 ? (
                  <label className="mt-2 block text-sm font-bold">
                    แถว
                    <select
                      value={row}
                      onChange={(event) => setRow(Number(event.target.value))}
                      className="mt-1 h-11 w-full rounded-xl border-2 border-ink bg-cream px-2"
                    >
                      {Array.from({ length: dest.rows }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          แถว {n}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-muted">เคสเด็ค</p>
                )}
                {dest?.pinEnabled && (
                  <p className="mt-1 text-xs font-bold text-muted">
                    {canEditBox(dest, unlockedBoxIds) ? "ปลดล็อกแล้ว" : "มีรหัส"}
                  </p>
                )}
              </section>
            </div>

            {pinBoxes.length > 0 && (
              <section className="space-y-3 rounded-2xl border-4 border-ink bg-white p-3">
                <p className="text-sm font-black">ใส่รหัสกล่องที่ย้าย</p>
                <p className="text-xs font-medium text-muted">
                  {pinBoxes.length === 1
                    ? `กล่อง${pinBoxes[0].role} “${pinBoxes[0].box.name}” มีรหัส`
                    : "ทั้งต้นทางและปลายทางมีรหัส — ใส่ทั้งสองช่องในหน้านี้"}
                </p>
                {pinBoxes.map(({ box, role }) => (
                  <label key={`${role}-${box.id}`} className="block text-sm font-bold">
                    รหัส{role} · {box.name}
                    <input
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      value={pins[box.id] ?? ""}
                      onChange={(event) =>
                        setPins((current) => ({ ...current, [box.id]: event.target.value }))
                      }
                      className="mt-1 h-11 w-full rounded-xl border-2 border-ink bg-cream px-3"
                    />
                  </label>
                ))}
              </section>
            )}

            {error && <p className="text-sm font-bold text-bot-red">{error}</p>}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !boxId}
              className="w-full rounded-full border-2 border-ink bg-ink py-3 font-extrabold text-cream disabled:opacity-50"
            >
              {saving
                ? "กำลังย้าย..."
                : `ย้าย ${movingCount} ใบ ${sourceBox ? `จาก “${sourceBox.name}”` : ""} → ${
                    dest ? `“${dest.name}”` : "ปลายทาง"
                  }`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
