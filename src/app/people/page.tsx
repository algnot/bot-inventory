"use client";

import { useState } from "react";
import { throwIfApiError } from "@/lib/lock-client";
import { useAppState } from "@/lib/use-app-state";

export default function PeoplePage() {
  const { state, loading, reload, error: loadError } = useAppState();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const boxCount = new Map<string, number>();
  for (const box of state?.boxes ?? []) {
    if (box.ownerId) boxCount.set(box.ownerId, (boxCount.get(box.ownerId) ?? 0) + 1);
  }

  async function addPerson(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, notes }),
      });
      const data = await res.json();
      throwIfApiError(res, data, "เพิ่มคนไม่สำเร็จ");
      setName("");
      setNotes("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เพิ่มคนไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(id: string, personName: string, personNotes: string) {
    setEditingId(id);
    setEditName(personName);
    setEditNotes(personNotes);
    setEditError(null);
  }

  async function savePerson(event: React.FormEvent) {
    event.preventDefault();
    if (!editingId) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/people/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, notes: editNotes }),
      });
      const data = await res.json();
      throwIfApiError(res, data, "บันทึกไม่สำเร็จ");
      setEditingId(null);
      await reload();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setEditSaving(false);
    }
  }

  async function remove(id: string, personName: string) {
    if (!confirm(`ลบ “${personName}” ออกจากรายชื่อ? กล่องที่เป็นของคนนี้จะกลายเป็นยังไม่ระบุเจ้าของ`)) {
      return;
    }
    try {
      const res = await fetch(`/api/people/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      throwIfApiError(res, data, "ลบคนไม่สำเร็จ");
      if (editingId === id) setEditingId(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบคนไม่สำเร็จ");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-6">
      <h1 className="text-2xl font-black sm:text-3xl">เจ้าของกล่อง</h1>
      <p className="mt-1 text-muted">เพิ่มคนไว้ก่อน แล้วตอนสร้างกล่องค่อยเลือกว่ากล่องนี้ของใคร</p>

      <form
        onSubmit={(event) => void addPerson(event)}
        className="mt-5 grid items-end gap-3 rounded-2xl border-4 border-ink bg-cream p-3 sm:p-4 md:grid-cols-[1fr_1fr_auto]"
      >
        <label className="block text-sm font-bold">
          ชื่อ
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="เช่น ต้นก้า"
            className="mt-1 h-12 w-full rounded-xl border-2 border-ink bg-white px-3"
          />
        </label>
        <label className="block text-sm font-bold">
          หมายเหตุ
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="เช่น เก็บกล่องชุดหลัก"
            className="mt-1 h-12 w-full rounded-xl border-2 border-ink bg-white px-3"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="h-12 rounded-xl border-2 border-ink bg-ink px-4 font-extrabold text-cream disabled:opacity-50"
        >
          {saving ? "กำลังเพิ่ม..." : "เพิ่มคน"}
        </button>
        {error && <p className="md:col-span-3 text-sm font-bold text-bot-red">{error}</p>}
      </form>

      {loading && !state && <p className="mt-6 text-muted">กำลังโหลด...</p>}
      {loadError && <p className="mt-6 font-bold text-bot-red">{loadError}</p>}

      {state && state.people.length === 0 && (
        <p className="mt-6 text-muted">ยังไม่มีรายชื่อ — ใส่ชื่อด้านบนแล้วกดเพิ่มคน</p>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {(state?.people ?? []).map((person) => (
          <div
            key={person.id}
            className="rounded-2xl border-2 border-ink bg-cream p-4"
          >
            {editingId === person.id ? (
              <form onSubmit={(event) => void savePerson(event)} className="space-y-3">
                <label className="block text-sm font-bold">
                  ชื่อ
                  <input
                    required
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border-2 border-ink bg-white px-3"
                  />
                </label>
                <label className="block text-sm font-bold">
                  หมายเหตุ
                  <textarea
                    value={editNotes}
                    onChange={(event) => setEditNotes(event.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-xl border-2 border-ink bg-white px-3 py-2"
                  />
                </label>
                {editError && <p className="text-sm font-bold text-bot-red">{editError}</p>}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="h-10 rounded-full border-2 border-ink bg-ink px-4 text-sm font-extrabold text-cream disabled:opacity-50"
                  >
                    {editSaving ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="h-10 rounded-full border-2 border-ink px-4 text-sm font-bold"
                  >
                    ยกเลิก
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-extrabold">{person.name}</h2>
                  {person.notes ? (
                    <p className="mt-1 text-sm text-muted">{person.notes}</p>
                  ) : null}
                  <p className="mt-1 text-sm text-muted">{boxCount.get(person.id) ?? 0} กล่อง</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => startEdit(person.id, person.name, person.notes ?? "")}
                    className="rounded-full border-2 border-ink px-3 py-1 text-sm font-bold hover:bg-white"
                  >
                    แก้
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(person.id, person.name)}
                    className="rounded-full border-2 border-ink px-3 py-1 text-sm font-bold hover:bg-bot-red hover:text-white"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
