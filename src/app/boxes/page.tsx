"use client";

import Link from "next/link";
import { useState } from "react";
import { personName } from "@/lib/labels";
import { useAppState } from "@/lib/use-app-state";

export default function BoxesPage() {
  const { state, loading, reload, error: loadError } = useAppState();
  const [name, setName] = useState("");
  const [rows, setRows] = useState(4);
  const [ownerId, setOwnerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createBox(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/boxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rows, ownerId: ownerId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "สร้างกล่องไม่สำเร็จ");
      setName("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้างกล่องไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  const counts = new Map<string, number>();
  for (const item of state?.placements ?? []) {
    counts.set(item.boxId, (counts.get(item.boxId) ?? 0) + item.quantity);
  }

  const people = state?.people ?? [];
  const grouped = [
    ...people.map((person) => ({
      id: person.id,
      title: `ของ${person.name}`,
      boxes: (state?.boxes ?? []).filter((box) => box.ownerId === person.id),
    })),
    {
      id: "unassigned",
      title: "ยังไม่ระบุเจ้าของ",
      boxes: (state?.boxes ?? []).filter((box) => !box.ownerId),
    },
  ].filter((group) => group.boxes.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-6">
      <h1 className="text-2xl font-black sm:text-3xl">กล่องทั้งหมด</h1>

      <form
        onSubmit={(event) => void createBox(event)}
        className="mt-5 grid items-end gap-3 rounded-2xl border-4 border-ink bg-cream p-3 sm:grid-cols-2 sm:p-4 md:grid-cols-[1fr_160px_110px_auto]"
      >
        <label className="block text-sm font-bold">
          ชื่อกล่อง
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="เช่น กล่อง BT01"
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
            {people.map((person) => (
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
        <button
          type="submit"
          disabled={saving}
          className="h-12 rounded-xl border-2 border-ink bg-ink px-4 font-extrabold text-cream disabled:opacity-50 sm:col-span-2 md:col-span-1"
        >
          {saving ? "กำลังสร้าง..." : "สร้างกล่อง"}
        </button>
        {people.length === 0 && (
          <p className="sm:col-span-2 md:col-span-4 text-sm font-medium text-muted">
            ยังไม่มีรายชื่อเจ้าของ — ไปหน้า{" "}
            <Link href="/people" className="font-extrabold underline">
              เจ้าของ
            </Link>{" "}
            เพื่อเพิ่มคนก่อน
          </p>
        )}
        {error && (
          <p className="sm:col-span-2 md:col-span-4 text-sm font-bold text-bot-red">
            {error}
          </p>
        )}
      </form>

      {loadError && <p className="mt-6 font-bold text-bot-red">{loadError}</p>}

      {loading && !state && <p className="mt-6 text-muted">กำลังโหลด...</p>}

      <div className="mt-6 space-y-8">
        {grouped.map((group) => (
          <section key={group.id}>
            <h2 className="mb-3 text-sm font-black tracking-wide">{group.title}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {group.boxes.map((box) => (
                <Link
                  key={box.id}
                  href={`/boxes/${box.id}`}
                  className="rounded-2xl border-2 border-ink bg-cream p-4 hover:bg-white"
                >
                  <h3 className="text-xl font-extrabold">{box.name}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {personName(people, box.ownerId)
                      ? `ของ${personName(people, box.ownerId)} · ${box.rows} แถว`
                      : `${box.rows} แถว`}
                  </p>
                  <p className="mt-3 font-black text-bot-red">
                    {counts.get(box.id) ?? 0} ใบ
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
