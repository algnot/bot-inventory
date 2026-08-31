"use client";

import { useMemo, useState } from "react";
import type { Box, Person } from "@/lib/types";
import { boxKindLabel, personName } from "@/lib/labels";
import { canEditBox, requestUnlock, throwIfApiError } from "@/lib/lock-client";

export type MoveItem = {
  id: string;
  name: string;
  print: string;
  quantity: number;
  boxId: string;
  boxName: string;
};

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
  const destinations = boxes.filter((box) => !sourceIds.includes(box.id));
  const [boxId, setBoxId] = useState(destinations[0]?.id ?? "");
  const [row, setRow] = useState(1);
  const [quantity, setQuantity] = useState(items[0]?.quantity ?? 1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dest = boxes.find((item) => item.id === boxId);
  const single = items.length === 1;
  const maxQty = items[0]?.quantity ?? 1;
  const sourceLocked = sourceBoxes.find((box) => !canEditBox(box, unlockedBoxIds));
  const destLocked = dest && !canEditBox(dest, unlockedBoxIds);

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
    if (sourceLocked) {
      requestUnlock(sourceLocked.id, sourceLocked.name);
      setError(`ใส่รหัสกล่องต้นทาง “${sourceLocked.name}” ก่อนย้าย`);
      return;
    }
    if (destLocked && dest) {
      requestUnlock(dest.id, dest.name);
      setError(`ใส่รหัสกล่องปลายทาง “${dest.name}” ก่อนย้าย`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/inventory/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boxId, row, items: payload }),
      });
      const data = await res.json();
      throwIfApiError(res, data, "ย้ายการ์ดไม่สำเร็จ");
      onMoved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ย้ายการ์ดไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-55 flex items-end justify-center bg-ink/70 p-0 md:items-center md:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border-4 border-ink bg-cream p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:rounded-3xl md:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">ย้ายไปกล่องอื่น</h2>
            <p className="mt-1 text-sm text-muted">
              {items.length === 1
                ? `${items[0].name} · จาก “${items[0].boxName}”`
                : `ย้าย ${items.length} แบบ จาก “${items[0]?.boxName ?? "กล่อง"}”`}
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

        {destinations.length === 0 ? (
          <p className="mt-4 text-sm font-bold text-bot-red">
            ยังไม่มีกล่องอื่น — สร้างกล่องปลายทางก่อน
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-bold">
              ไปกล่อง
              <select
                value={boxId}
                onChange={(event) => {
                  setBoxId(event.target.value);
                  setRow(1);
                }}
                className="mt-1 h-12 w-full rounded-xl border-2 border-ink bg-white px-3"
              >
                {destinations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {personName(people, item.ownerId)
                      ? ` · ของ${personName(people, item.ownerId)}`
                      : ""}
                    {item.pinEnabled ? " · มีรหัส" : ""}
                    {` · ${boxKindLabel(item.rows)}`}
                  </option>
                ))}
              </select>
            </label>
            {dest && dest.rows > 1 && (
              <label className="block text-sm font-bold">
                แถว
                <select
                  value={row}
                  onChange={(event) => setRow(Number(event.target.value))}
                  className="mt-1 h-12 w-full rounded-xl border-2 border-ink bg-white px-3"
                >
                  {Array.from({ length: dest.rows }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      แถว {n}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {single && maxQty > 1 && (
              <label className="block text-sm font-bold">
                จำนวนที่ย้าย
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((n) => Math.max(1, n - 1))}
                    className="h-11 w-11 rounded-full border-2 border-ink bg-white text-lg font-black"
                  >
                    −
                  </button>
                  <span className="min-w-10 text-center text-lg font-black tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((n) => Math.min(maxQty, n + 1))}
                    className="h-11 w-11 rounded-full border-2 border-ink bg-white text-lg font-black"
                  >
                    +
                  </button>
                  <span className="text-sm font-medium text-muted">จาก {maxQty} ใบ</span>
                </div>
              </label>
            )}
            {sourceLocked && (
              <button
                type="button"
                onClick={() => requestUnlock(sourceLocked.id, sourceLocked.name)}
                className="text-sm font-extrabold underline"
              >
                ใส่รหัสกล่องต้นทาง “{sourceLocked.name}”
              </button>
            )}
            {destLocked && dest && (
              <button
                type="button"
                onClick={() => requestUnlock(dest.id, dest.name)}
                className="block text-sm font-extrabold underline"
              >
                ใส่รหัสกล่องปลายทาง “{dest.name}”
              </button>
            )}
            {error && <p className="text-sm font-bold text-bot-red">{error}</p>}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !boxId}
              className="w-full rounded-full border-2 border-ink bg-ink py-3 font-extrabold text-cream disabled:opacity-50"
            >
              {saving ? "กำลังย้าย..." : "ย้ายการ์ด"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
