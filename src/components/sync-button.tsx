"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "ซิงก์ไม่สำเร็จ");
      const extra =
        data.added > 0
          ? ` มีการ์ดใหม่ ${data.added} ใบ`
          : " ไม่มีการ์ดใหม่";
      setMessage(`ซิงก์แล้ว ${data.total} ใบ.${extra}`);
      window.dispatchEvent(new Event("bot-data-changed"));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ซิงก์ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void sync()}
        disabled={busy}
        className="rounded-full border-2 border-gold bg-gold px-2.5 py-1 text-xs font-extrabold text-ink hover:bg-cream disabled:opacity-60 sm:px-3 sm:text-sm"
      >
        {busy ? "กำลังซิงก์..." : <><span className="sm:hidden">ซิงก์</span><span className="hidden sm:inline">ซิงก์การ์ด</span></>}
      </button>
      {message && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-xl border-2 border-ink bg-cream p-3 text-sm font-medium text-ink shadow-[4px_4px_0_#12100e] sm:w-72">
          <p>{message}</p>
          <button
            type="button"
            className="mt-2 text-xs font-bold underline"
            onClick={() => setMessage(null)}
          >
            ปิด
          </button>
        </div>
      )}
    </div>
  );
}
