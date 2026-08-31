"use client";

import { useCallback, useEffect, useState } from "react";
import { canEditBox } from "@/lib/lock-client";
import type { Box, LockState } from "@/lib/types";

type Mode = "unlock" | "set" | "manage";

export function ReadOnlyBanner({
  box,
  unlockedBoxIds,
}: {
  box?: Pick<Box, "id" | "name" | "pinEnabled"> | null;
  unlockedBoxIds?: string[] | null;
}) {
  if (!box || canEditBox(box, unlockedBoxIds)) return null;
  return (
    <p className="mt-4 rounded-2xl border-2 border-ink bg-gold/50 px-3 py-2 text-sm font-bold">
      กล่อง “{box.name}” ล็อกอยู่ — ใส่รหัสกล่องนี้ก่อนถึงจะเพิ่ม ลด หรือแก้ได้
    </p>
  );
}

export function BoxUnlockModal() {
  const [boxId, setBoxId] = useState<string | null>(null);
  const [boxName, setBoxName] = useState("");
  const [lock, setLock] = useState<LockState | null>(null);
  const [mode, setMode] = useState<Mode>("unlock");
  const [pin, setPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (id: string) => {
    const res = await fetch(`/api/lock?boxId=${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    const data = (await res.json()) as {
      lock?: LockState;
      box?: { name: string; pinEnabled: boolean };
      error?: string;
    };
    if (!res.ok) throw new Error(data.error || "โหลดสถานะไม่สำเร็จ");
    if (data.lock) setLock(data.lock);
    if (data.box?.name) setBoxName(data.box.name);
    return data.lock;
  }, []);

  useEffect(() => {
    const onNeed = (event: Event) => {
      const detail = (event as CustomEvent<{ boxId?: string; boxName?: string }>).detail;
      if (!detail?.boxId) return;
      setBoxId(detail.boxId);
      if (detail.boxName) setBoxName(detail.boxName);
      setPin("");
      setCurrentPin("");
      setError(null);
      void load(detail.boxId)
        .then((next) => {
          if (!next?.enabled) setMode("set");
          else if (next.unlocked) setMode("manage");
          else setMode("unlock");
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "โหลดสถานะไม่สำเร็จ");
        });
    };
    window.addEventListener("bot-need-unlock", onNeed);
    return () => window.removeEventListener("bot-need-unlock", onNeed);
  }, [load]);

  async function post(body: Record<string, unknown>, close = true) {
    if (!boxId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, boxId }),
      });
      const data = (await res.json()) as { lock?: LockState; error?: string };
      if (!res.ok) throw new Error(data.error || "ทำรายการไม่สำเร็จ");
      if (data.lock) setLock(data.lock);
      window.dispatchEvent(new Event("bot-data-changed"));
      if (close) setBoxId(null);
      else if (data.lock) {
        if (!data.lock.enabled) setMode("set");
        else if (data.lock.unlocked) setMode("manage");
        else setMode("unlock");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  if (!boxId) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-end justify-center bg-ink/70 p-0 md:items-center md:p-6"
      onClick={() => setBoxId(null)}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border-4 border-ink bg-cream p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:rounded-3xl md:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">
              {mode === "set"
                ? "ตั้งรหัสกล่องนี้"
                : mode === "manage"
                  ? "รหัสกล่องนี้"
                  : "ใส่รหัสกล่องนี้"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {boxName ? `กล่อง “${boxName}”` : "กล่องนี้"}
              {mode === "set"
                ? " — คนอื่นดูได้ แต่ต้องใส่รหัสนี้ถึงจะแก้กล่องใบนี้"
                : mode === "manage"
                  ? " — เครื่องนี้ปลดล็อกกล่องนี้อยู่"
                  : " — ดูได้อย่างเดียวจนกว่าจะใส่รหัสถูก"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBoxId(null)}
            className="shrink-0 rounded-full border-2 border-ink px-3 py-1 text-sm font-bold"
          >
            ปิด
          </button>
        </div>

        {mode === "unlock" && (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void post({ action: "unlock", pin });
            }}
          >
            <label className="block text-sm font-bold">
              รหัส
              <input
                autoFocus
                type="password"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                className="mt-1 h-12 w-full rounded-xl border-2 border-ink bg-white px-3"
              />
            </label>
            {error && <p className="text-sm font-bold text-bot-red">{error}</p>}
            <button
              type="submit"
              disabled={busy || !pin.trim()}
              className="h-12 w-full rounded-xl border-2 border-ink bg-ink font-extrabold text-cream disabled:opacity-50"
            >
              {busy ? "กำลังตรวจ..." : "ปลดล็อกกล่องนี้"}
            </button>
          </form>
        )}

        {mode === "set" && (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void post({ action: "set", pin });
            }}
          >
            <label className="block text-sm font-bold">
              รหัสใหม่ (อย่างน้อย 4 ตัว)
              <input
                autoFocus
                type="password"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                className="mt-1 h-12 w-full rounded-xl border-2 border-ink bg-white px-3"
              />
            </label>
            {error && <p className="text-sm font-bold text-bot-red">{error}</p>}
            <button
              type="submit"
              disabled={busy || pin.trim().length < 4}
              className="h-12 w-full rounded-xl border-2 border-ink bg-ink font-extrabold text-cream disabled:opacity-50"
            >
              {busy ? "กำลังบันทึก..." : "ตั้งรหัสกล่องนี้"}
            </button>
          </form>
        )}

        {mode === "manage" && (
          <div className="mt-4 space-y-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => void post({ action: "lock" })}
              className="h-12 w-full rounded-xl border-2 border-ink bg-ink font-extrabold text-cream disabled:opacity-50"
            >
              {busy ? "กำลังล็อก..." : "ล็อกกล่องนี้บนเครื่อง"}
            </button>
            <form
              className="space-y-3 rounded-2xl border-2 border-ink bg-white p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void post({ action: "set", pin, currentPin }, false);
              }}
            >
              <p className="text-sm font-bold">เปลี่ยนรหัสกล่องนี้</p>
              <label className="block text-sm font-bold">
                รหัสปัจจุบัน
                <input
                  type="password"
                  value={currentPin}
                  onChange={(event) => setCurrentPin(event.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border-2 border-ink bg-cream px-3"
                />
              </label>
              <label className="block text-sm font-bold">
                รหัสใหม่
                <input
                  type="password"
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border-2 border-ink bg-cream px-3"
                />
              </label>
              <button
                type="submit"
                disabled={busy || pin.trim().length < 4}
                className="h-11 w-full rounded-xl border-2 border-ink px-3 text-sm font-extrabold disabled:opacity-50"
              >
                บันทึกรหัสใหม่
              </button>
            </form>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const value = window.prompt("ใส่รหัสปัจจุบันเพื่อปิดรหัสกล่องนี้");
                if (!value) return;
                void post({ action: "clear", pin: value });
              }}
              className="w-full text-sm font-bold underline"
            >
              ปิดรหัสกล่องนี้
            </button>
            {error && <p className="text-sm font-bold text-bot-red">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export function BoxPinButton({
  box,
  unlockedBoxIds,
}: {
  box: Pick<Box, "id" | "name" | "pinEnabled">;
  unlockedBoxIds?: string[];
}) {
  const editable = canEditBox(box, unlockedBoxIds);
  const label = !box.pinEnabled ? "ตั้งรหัสกล่อง" : editable ? "รหัสกล่อง" : "ใส่รหัสกล่อง";
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent("bot-need-unlock", {
            detail: { boxId: box.id, boxName: box.name },
          }),
        );
      }}
      className={`rounded-full border-2 px-3 py-1 text-sm font-bold ${
        box.pinEnabled && !editable
          ? "border-ink bg-gold"
          : "border-ink hover:bg-white"
      }`}
    >
      {label}
    </button>
  );
}
