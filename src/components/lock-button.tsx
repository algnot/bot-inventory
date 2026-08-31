"use client";

import { useCallback, useEffect, useState } from "react";
import { canEdit } from "@/lib/lock-client";
import type { LockState } from "@/lib/types";

type Mode = "unlock" | "set" | "manage";

export function ReadOnlyBanner({ lock }: { lock?: LockState | null }) {
  if (canEdit(lock)) return null;
  return (
    <p className="mt-4 rounded-2xl border-2 border-ink bg-gold/50 px-3 py-2 text-sm font-bold">
      โหมดดูอย่างเดียว — กด “ใส่รหัส” มุมบนขวาถ้าต้องการเพิ่ม ลด หรือแก้กล่อง
    </p>
  );
}

export function LockButton() {
  const [lock, setLock] = useState<LockState | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("unlock");
  const [pin, setPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/lock", { cache: "no-store" });
      const data = (await res.json()) as { lock?: LockState };
      if (res.ok && data.lock) setLock(data.lock);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onNeed = () => {
      void refresh().then(() => setOpen(true));
    };
    const onChange = () => void refresh();
    window.addEventListener("bot-need-unlock", onNeed);
    window.addEventListener("bot-data-changed", onChange);
    return () => {
      window.removeEventListener("bot-need-unlock", onNeed);
      window.removeEventListener("bot-data-changed", onChange);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    if (!lock?.enabled) setMode("set");
    else if (lock.unlocked) setMode("manage");
    else setMode("unlock");
    setPin("");
    setCurrentPin("");
    setError(null);
  }, [open, lock?.enabled, lock?.unlocked]);

  async function post(body: Record<string, unknown>, close = true) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { lock?: LockState; error?: string };
      if (!res.ok) throw new Error(data.error || "ทำรายการไม่สำเร็จ");
      if (data.lock) setLock(data.lock);
      window.dispatchEvent(new Event("bot-data-changed"));
      if (close) setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const locked = Boolean(lock?.enabled && !lock.unlocked);
  const label = !lock?.enabled ? "ตั้งรหัส" : locked ? "ใส่รหัส" : "ล็อกแล้ว";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-full border-2 px-2.5 py-1 text-xs font-extrabold whitespace-nowrap sm:px-3 sm:text-sm ${
          locked
            ? "border-gold bg-gold text-ink"
            : "border-cream/40 text-cream hover:border-cream"
        }`}
      >
        {label}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-60 flex items-end justify-center bg-ink/70 p-0 md:items-center md:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border-4 border-ink bg-cream p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:rounded-3xl md:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold">
                  {mode === "set"
                    ? "ตั้งรหัสล็อกคลัง"
                    : mode === "manage"
                      ? "รหัสล็อกคลัง"
                      : "ใส่รหัสเพื่อแก้ไข"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {mode === "set"
                    ? "คนอื่นยังดูกล่องได้ แต่ต้องใส่รหัสนี้ถึงจะเพิ่ม ลด หรือแก้ได้"
                    : mode === "manage"
                      ? "เครื่องนี้ปลดล็อกอยู่ — ล็อกเมื่อเลิกแก้ หรือเปลี่ยนรหัสได้ที่นี่"
                      : "ดูได้อย่างเดียวจนกว่าจะใส่รหัสถูก"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
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
                  {busy ? "กำลังตรวจ..." : "ปลดล็อกเครื่องนี้"}
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
                  {busy ? "กำลังบันทึก..." : "ตั้งรหัส"}
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
                  {busy ? "กำลังล็อก..." : "ล็อกเครื่องนี้"}
                </button>
                <form
                  className="space-y-3 rounded-2xl border-2 border-ink bg-white p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void post({ action: "set", pin, currentPin }, false);
                  }}
                >
                  <p className="text-sm font-bold">เปลี่ยนรหัส</p>
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
                    const value = window.prompt("ใส่รหัสปัจจุบันเพื่อปิดการล็อก");
                    if (!value) return;
                    void post({ action: "clear", pin: value });
                  }}
                  className="w-full text-sm font-bold underline"
                >
                  ปิดรหัสล็อก
                </button>
                {error && <p className="text-sm font-bold text-bot-red">{error}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
