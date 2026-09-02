"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Box, Card, Person, Placement } from "@/lib/types";
import { cardKey } from "@/lib/types";
import { CardImage } from "./card-image";
import { MultiFilter } from "./multi-filter";
import { RarityBadge } from "./rarity-badge";
import { searchCards } from "@/lib/catalog-search";
import { displayRare } from "@/lib/image";
import { personName, typeLabel } from "@/lib/labels";
import { compressImageFile } from "@/lib/compress-image";
import { canEditBox, requestUnlock, throwIfApiError } from "@/lib/lock-client";
import { seriesCode, seriesLabel } from "@/lib/series";

type SelectedItem = {
  card: Card;
  quantity: number;
  placementId?: string;
  fromScan?: boolean;
};

function stubCard(print: string, rare: string): Card {
  return { name: print, type: "", soi: 0, print, rare };
}

function fingerprint(
  existing: SelectedItem[],
  incoming: SelectedItem[],
  notesValue: string,
) {
  const part = (items: SelectedItem[], tag: string) =>
    `${tag}:${items
      .map((item) => `${cardKey(item.card.print, item.card.rare)}:${item.quantity}`)
      .sort()
      .join("|")}`;
  return `${part(existing, "e")}#${part(incoming, "i")}#${notesValue.trim()}`;
}

function bumpList(
  current: SelectedItem[],
  card: Card,
  delta: number,
): SelectedItem[] {
  return current.flatMap((item) => {
    if (item.card.print !== card.print || item.card.rare !== card.rare) return [item];
    const next = item.quantity + delta;
    if (next < 1) return [];
    return [{ ...item, quantity: next }];
  });
}

function addToList(current: SelectedItem[], card: Card, quantity: number, fromScan: boolean) {
  const index = current.findIndex(
    (item) => item.card.print === card.print && item.card.rare === card.rare,
  );
  if (index < 0) {
    return [{ card, quantity, fromScan }, ...current];
  }
  const next = {
    ...current[index],
    quantity: current[index].quantity + quantity,
    fromScan: current[index].fromScan || fromScan,
  };
  return [next, ...current.filter((_, i) => i !== index)];
}

function qtyIn(list: SelectedItem[], card: Card) {
  return (
    list.find((item) => item.card.print === card.print && item.card.rare === card.rare)
      ?.quantity ?? 0
  );
}

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
        className="flex h-8 w-8 items-center justify-center text-base font-black hover:bg-ink hover:text-cream sm:h-10 sm:w-10 sm:text-lg"
        aria-label="ลดจำนวน"
      >
        −
      </button>
      <span className="min-w-6 text-center text-sm font-black tabular-nums sm:min-w-8">{value}</span>
      <button
        type="button"
        onClick={onPlus}
        className="flex h-8 w-8 items-center justify-center text-base font-black hover:bg-ink hover:text-cream sm:h-10 sm:w-10 sm:text-lg"
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
  unlockedBoxIds = [],
  cards,
  placements = [],
  card: lockedCard,
  boxId: defaultBoxId,
  row: defaultRow,
  onClose,
  onSaved,
}: {
  boxes: Box[];
  people?: Person[];
  unlockedBoxIds?: string[];
  cards: Card[];
  placements?: Placement[];
  card?: Card | null;
  boxId?: string;
  row?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [query, setQuery] = useState(lockedCard?.name ?? "");
  const [existing, setExisting] = useState<SelectedItem[]>([]);
  const [incoming, setIncoming] = useState<SelectedItem[]>([]);
  const [boxId, setBoxId] = useState(defaultBoxId ?? boxes[0]?.id ?? "");
  const [row, setRow] = useState(defaultRow ?? 1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [series, setSeries] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [rares, setRares] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const incomingListRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const baselineRef = useRef(fingerprint([], [], ""));
  const originalCountRef = useRef(0);

  const box = boxes.find((item) => item.id === boxId);
  const existingCount = existing.reduce((sum, item) => sum + item.quantity, 0);
  const incomingCount = incoming.reduce((sum, item) => sum + item.quantity, 0);
  const selectedCount = existingCount + incomingCount;
  const dirty = fingerprint(existing, incoming, notes) !== baselineRef.current;

  const cardsByKey = useMemo(() => {
    const map = new Map<string, Card>();
    for (const card of cards) map.set(cardKey(card.print, card.rare), card);
    return map;
  }, [cards]);

  const placementsRef = useRef(placements);
  const cardsByKeyRef = useRef(cardsByKey);
  placementsRef.current = placements;
  cardsByKeyRef.current = cardsByKey;

  useEffect(() => {
    if (defaultRow) setRow(defaultRow);
    if (defaultBoxId) setBoxId(defaultBoxId);
  }, [defaultBoxId, defaultRow]);

  useEffect(() => {
    const rowPlacements = placementsRef.current.filter(
      (item) => item.boxId === boxId && item.row === row,
    );
    const original: SelectedItem[] = rowPlacements.map((item) => ({
      card:
        cardsByKeyRef.current.get(cardKey(item.print, item.rare)) ??
        stubCard(item.print, item.rare),
      quantity: item.quantity,
      placementId: item.id,
    }));
    const rowNotes = rowPlacements[0]?.notes ?? "";
    setExisting(original);
    setIncoming(
      lockedCard &&
        !original.some(
          (item) =>
            item.card.print === lockedCard.print && item.card.rare === lockedCard.rare,
        )
        ? [{ card: lockedCard, quantity: 1 }]
        : [],
    );
    setNotes(rowNotes);
    setError(null);
    setScanMessage(null);
    originalCountRef.current = original.length;
    baselineRef.current = fingerprint(original, [], rowNotes);
  }, [boxId, row, lockedCard]);

  const seriesOptions = useMemo(() => {
    return [...new Set(cards.map((card) => seriesCode(card.print)))]
      .sort()
      .map((code) => ({ value: code, label: seriesLabel(`${code}-000`) }));
  }, [cards]);

  const typeOptions = [
    { value: "Avatar", label: typeLabel("Avatar") },
    { value: "Magic", label: typeLabel("Magic") },
    { value: "Construct", label: typeLabel("Construct") },
    { value: "Life", label: typeLabel("Life") },
    { value: "Token", label: typeLabel("Token") },
  ];

  const rareOptions = ["C", "R", "SR", "UR", "SCR", "PR", "CBR", "USEC"].map((item) => ({
    value: item,
    label: displayRare(item),
  }));

  const hasFilters = series.length > 0 || types.length > 0 || rares.length > 0;

  const results = useMemo(() => {
    if (lockedCard) return [lockedCard];
    const filtered = searchCards(cards, query).filter((card) => {
      if (series.length && !series.includes(seriesCode(card.print))) return false;
      if (types.length && !types.includes(card.type)) return false;
      if (rares.length && !rares.includes(card.rare)) return false;
      return true;
    });
    if (query.trim() || hasFilters) return filtered;
    return filtered.slice(0, 96);
  }, [cards, query, lockedCard, series, types, rares, hasFilters]);

  function qtyOf(card: Card) {
    return qtyIn(incoming, card);
  }

  function addCard(card: Card) {
    setIncoming((current) => addToList(current, card, 1, false));
    incomingListRef.current?.scrollTo({ left: 0, top: 0 });
  }

  function bumpIncoming(card: Card, delta: number) {
    setIncoming((current) => bumpList(current, card, delta));
  }

  function bumpExisting(card: Card, delta: number) {
    setExisting((current) => bumpList(current, card, delta));
  }

  function removeIncoming(card: Card) {
    setIncoming((current) =>
      current.filter(
        (item) => item.card.print !== card.print || item.card.rare !== card.rare,
      ),
    );
  }

  function removeExisting(card: Card) {
    setExisting((current) =>
      current.filter(
        (item) => item.card.print !== card.print || item.card.rare !== card.rare,
      ),
    );
  }

  function applyScan(
    found: Array<{ print: string; rare: string; quantity: number }>,
  ) {
    setIncoming((current) => {
      let next = current;
      for (const item of found) {
        const card = cardsByKey.get(cardKey(item.print, item.rare));
        if (!card) continue;
        next = addToList(next, card, item.quantity, true);
      }
      return next;
    });
    incomingListRef.current?.scrollTo({ left: 0, top: 0 });
  }

  async function onPickImage(file: File | undefined) {
    if (!file) return;
    setScanning(true);
    setError(null);
    setScanMessage(null);
    try {
      const image = await compressImageFile(file);
      const res = await fetch("/api/scan-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = (await res.json()) as {
        cards?: Array<{ print: string; rare: string; quantity: number }>;
        unmatched?: string[];
        error?: string;
      };
      throwIfApiError(res, data, "อ่านรูปไม่สำเร็จ");
      const found = data.cards ?? [];
      if (!found.length) {
        throw new Error("อ่านการ์ดจากรูปไม่เจอ ลองถ่ายใกล้ ๆ ให้เห็นรหัสใบการ์ด");
      }
      applyScan(found);
      const added = found.reduce((sum, item) => sum + item.quantity, 0);
      const unmatched = data.unmatched ?? [];
      setScanMessage(
        unmatched.length
          ? `อ่านได้ ${added} ใบจากรูป · อ่านไม่ออก ${unmatched.length} ใบ — แยกไว้ด้านบน ยังไม่ปนกับแถว`
          : `อ่านได้ ${added} ใบจากรูป · แยกไว้ด้านบน ตรวจแล้วค่อยบันทึก`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "อ่านรูปไม่สำเร็จ");
    } finally {
      setScanning(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  }

  const scanInputs = (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => void onPickImage(event.target.files?.[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void onPickImage(event.target.files?.[0])}
      />
    </>
  );

  const scanButtons = !lockedCard && (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={scanning}
        onClick={() => cameraInputRef.current?.click()}
        className="h-10 shrink-0 rounded-full border-2 border-ink bg-white px-3 text-sm font-extrabold disabled:opacity-50 sm:h-11"
      >
        {scanning ? "กำลังอ่านรูป..." : "ถ่ายรูปให้ AI อ่าน"}
      </button>
      <button
        type="button"
        disabled={scanning}
        onClick={() => galleryInputRef.current?.click()}
        className="text-xs font-bold underline disabled:opacity-50"
      >
        เลือกจากคลัง
      </button>
    </div>
  );

  async function save() {
    if (!boxId) {
      setError("สร้างกล่องก่อน");
      return;
    }
    if (!dirty) return;
    if (!existing.length && !incoming.length && originalCountRef.current === 0) {
      setError("เลือกการ์ดก่อน");
      return;
    }
    if (
      !existing.length &&
      !incoming.length &&
      originalCountRef.current > 0 &&
      !confirm("ลบการ์ดทั้งหมดในแถวนี้?")
    ) {
      return;
    }
    const dest = boxes.find((item) => item.id === boxId);
    if (!canEditBox(dest, unlockedBoxIds)) {
      requestUnlock(dest?.id, dest?.name);
      setError(dest ? `ใส่รหัสกล่อง “${dest.name}” ก่อนบันทึก` : "ใส่รหัสกล่องก่อนบันทึก");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const merged = new Map<string, { print: string; rare: string; quantity: number }>();
      for (const item of existing) {
        merged.set(cardKey(item.card.print, item.card.rare), {
          print: item.card.print,
          rare: item.card.rare,
          quantity: item.quantity,
        });
      }
      for (const item of incoming) {
        const key = cardKey(item.card.print, item.card.rare);
        const prev = merged.get(key);
        if (prev) prev.quantity += item.quantity;
        else {
          merged.set(key, {
            print: item.card.print,
            rare: item.card.rare,
            quantity: item.quantity,
          });
        }
      }
      const res = await fetch("/api/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boxId,
          row,
          notes,
          items: [...merged.values()],
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
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
          <label className="min-w-0 text-sm font-bold">
            กล่อง
            <select
              value={boxId}
              onChange={(event) => {
                setBoxId(event.target.value);
                setRow(1);
              }}
              className="mt-1 h-10 w-full min-w-0 rounded-xl border-2 border-ink bg-white px-2 sm:h-11 sm:px-3"
            >
              {boxes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {personName(people, item.ownerId)
                    ? ` · ของ${personName(people, item.ownerId)}`
                    : ""}
                  {item.pinEnabled ? " · มีรหัส" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            แถว
            <select
              value={row}
              onChange={(event) => setRow(Number(event.target.value))}
              className="mt-1 h-10 w-full rounded-xl border-2 border-ink bg-white px-2 sm:h-11 sm:px-3"
            >
              {Array.from({ length: box?.rows ?? 1 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  แถว {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {box && box.pinEnabled && !canEditBox(box, unlockedBoxIds) && (
        <button
          type="button"
          onClick={() => requestUnlock(box.id, box.name)}
          className="text-sm font-extrabold underline"
        >
          ใส่รหัสกล่อง “{box.name}” ก่อนบันทึก
        </button>
      )}
    </>
  );

  const notesField = (
    <label className="hidden text-sm font-bold md:block">
      หมายเหตุ
      <input
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        className="mt-1 h-10 w-full rounded-xl border-2 border-ink bg-white px-3 sm:h-11"
      />
    </label>
  );

  function pickCard(
    item: SelectedItem,
    kind: "incoming" | "existing",
    layout: "chip" | "row",
  ) {
    const scanned = kind === "incoming" && item.fromScan;
    const onMinus = () =>
      kind === "incoming" ? bumpIncoming(item.card, -1) : bumpExisting(item.card, -1);
    const onPlus = () =>
      kind === "incoming" ? bumpIncoming(item.card, 1) : bumpExisting(item.card, 1);
    const onRemove = () =>
      kind === "incoming" ? removeIncoming(item.card) : removeExisting(item.card);
    const border =
      kind === "incoming"
        ? scanned
          ? "border-gold bg-gold/15"
          : "border-bot-red bg-white"
        : "border-ink/30 bg-white";

    if (layout === "chip") {
      return (
        <div
          key={`${kind}-${cardKey(item.card.print, item.card.rare)}`}
          className={`flex w-28 shrink-0 flex-col items-center gap-1 rounded-xl border-2 p-1 ${border}`}
        >
          <div className="relative w-12 overflow-hidden rounded-md border border-ink">
            <CardImage
              print={item.card.print}
              rare={item.card.rare}
              name={item.card.name}
            />
          </div>
          <p className="w-full truncate text-center text-[11px] font-extrabold">
            {item.card.name}
          </p>
          <span className="text-[10px] font-bold text-bot-red">
            {kind === "existing" ? "ในแถวแล้ว" : scanned ? "จากรูป" : "จะเพิ่ม"}
          </span>
          <QtyStepper value={item.quantity} onMinus={onMinus} onPlus={onPlus} />
          <button
            type="button"
            onClick={onRemove}
            className="text-[11px] font-bold text-muted underline"
          >
            เอาออก
          </button>
        </div>
      );
    }

    return (
      <div
        key={`${kind}-${cardKey(item.card.print, item.card.rare)}`}
        className={`flex items-center gap-2 rounded-xl border-2 p-2 ${border}`}
      >
        <div className="w-14 shrink-0 overflow-hidden rounded-md border border-ink">
          <CardImage
            print={item.card.print}
            rare={item.card.rare}
            name={item.card.name}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">{item.card.name}</p>
          <p className="text-xs text-muted">{item.card.print}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <RarityBadge rare={item.card.rare} compact />
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                kind === "existing"
                  ? "bg-ink/10 text-ink"
                  : scanned
                    ? "bg-gold text-ink"
                    : "bg-bot-red text-white"
              }`}
            >
              {kind === "existing" ? "ในแถวแล้ว" : scanned ? "จากรูป" : "จะเพิ่ม"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <QtyStepper value={item.quantity} onMinus={onMinus} onPlus={onPlus} />
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-bold text-muted underline hover:text-bot-red"
          >
            เอาออก
          </button>
        </div>
      </div>
    );
  }

  const selectedList = (
    <>
      <div className="space-y-2 md:hidden">
        {incoming.length > 0 && (
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-xs font-bold">
                จะเพิ่ม {incomingCount} ใบ
                {incoming.some((item) => item.fromScan) ? " · จากรูป" : ""}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIncoming([]);
                  setScanMessage(null);
                }}
                className="text-[11px] font-bold underline"
              >
                ล้าง
              </button>
            </div>
            <div
              ref={incomingListRef}
              className="flex min-w-0 w-full max-w-full flex-nowrap gap-2 overflow-x-auto overscroll-x-contain pb-1"
            >
              {incoming.map((item) => pickCard(item, "incoming", "chip"))}
            </div>
          </div>
        )}
        {existing.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-bold text-muted">
              ที่มีในแถวนี้แล้ว {existingCount} ใบ
            </p>
            <div className="flex min-w-0 w-full max-w-full flex-nowrap gap-2 overflow-x-auto overscroll-x-contain pb-1">
              {existing.map((item) => pickCard(item, "existing", "chip"))}
            </div>
          </div>
        )}
        {incoming.length === 0 && existing.length === 0 && (
          <p className="rounded-xl border-2 border-dashed border-ink/30 px-3 py-6 text-center text-xs font-medium text-muted">
            กดจากแคตตาล็อกหรือถ่ายรูปเพื่อเพิ่ม
          </p>
        )}
      </div>
      <div className="hidden min-h-0 flex-1 flex-col gap-3 overflow-y-auto md:flex">
        {incoming.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold">
                จะเพิ่ม {incoming.length} แบบ · {incomingCount} ใบ
              </p>
              <button
                type="button"
                onClick={() => {
                  setIncoming([]);
                  setScanMessage(null);
                }}
                className="text-xs font-bold underline"
              >
                ล้างที่จะเพิ่ม
              </button>
            </div>
            {incoming.map((item) => pickCard(item, "incoming", "row"))}
          </div>
        )}
        <div className="space-y-2">
          <p className="text-sm font-bold text-muted">
            {existing.length
              ? `ที่มีในแถวนี้แล้ว ${existing.length} แบบ · ${existingCount} ใบ`
              : "แถวนี้ยังไม่มีการ์ด"}
          </p>
          {existing.length === 0 && incoming.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-ink/30 px-3 py-8 text-center text-sm font-medium text-muted">
              กดจากแคตตาล็อกหรือถ่ายรูปเพื่อเพิ่ม
            </p>
          ) : (
            existing.map((item) => pickCard(item, "existing", "row"))
          )}
        </div>
      </div>
    </>
  );

  const saveLabel = saving
    ? "กำลังบันทึก..."
    : !existing.length && !incoming.length && originalCountRef.current > 0
      ? "ลบการ์ดทั้งหมดในแถวนี้"
      : incomingCount > 0
        ? `เพิ่ม ${incomingCount} ใบลงแถวนี้`
        : selectedCount > 0
          ? `บันทึกแถวนี้ · ${selectedCount} ใบ`
          : "บันทึกแถวนี้";

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink/70 md:items-center md:p-4">
      <div
        className="relative flex h-svh max-h-svh w-full max-w-6xl flex-col overflow-hidden border-4 border-ink bg-cream md:h-[min(90vh,52rem)] md:max-h-none md:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        {scanInputs}
        {scanning && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-cream/80 text-center">
            <p className="rounded-2xl border-4 border-ink bg-white px-5 py-4 text-lg font-black">
              กำลังอ่านการ์ดจากรูป...
            </p>
          </div>
        )}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b-4 border-ink px-3 py-2 sm:px-5 sm:py-3">
          <div>
            <h2 className="text-xl font-extrabold">ใส่การ์ดลงแถว</h2>
            {!lockedCard && (
              <p className="mt-0.5 hidden text-sm text-muted sm:block">
                แก้จำนวนในแถวนี้ได้เลย ถ่ายรูปให้ AI เติม แล้วตรวจก่อนบันทึก
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
            {locationFields}
            {scanButtons}
            {scanMessage && <p className="text-xs font-bold text-bot-red">{scanMessage}</p>}
            {selectedList}
            {notesField}
            {error && <p className="text-sm font-bold text-bot-red">{error}</p>}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || scanning || !dirty || !boxId}
              className="w-full rounded-full border-2 border-ink bg-ink py-3 font-extrabold text-cream disabled:opacity-50"
            >
              {saveLabel}
            </button>
          </div>
        ) : (
          <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden md:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.9fr)] md:grid-rows-1">
            <section className="flex min-h-0 min-w-0 flex-col overflow-hidden border-b-4 border-ink p-3 sm:p-4 md:border-r-4 md:border-b-0">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหาชื่อการ์ด หรือรหัสเช่น BT01-001"
                className="h-10 w-full shrink-0 rounded-xl border-2 border-ink bg-white px-3 outline-none focus:ring-2 focus:ring-ink/30 sm:h-11"
              />
              <div className="relative z-20 mt-2 shrink-0 space-y-2">
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <MultiFilter
                    label="ซีรีส์"
                    allLabel="ทุกซีรีส์"
                    options={seriesOptions}
                    selected={series}
                    onChange={setSeries}
                    searchable
                    compact
                  />
                  <MultiFilter
                    label="ประเภท"
                    allLabel="ทุกประเภท"
                    options={typeOptions}
                    selected={types}
                    onChange={setTypes}
                    compact
                  />
                  <MultiFilter
                    label="ความหายาก"
                    allLabel="ทุกความหายาก"
                    options={rareOptions}
                    selected={rares}
                    onChange={setRares}
                    compact
                    menuAlign="end"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-muted">
                    {query.trim() || hasFilters
                      ? `พบ ${results.length} ใบ`
                      : <>แสดง {results.length} ใบแรก<span className="hidden sm:inline"> · ค้นหรือกรองเพื่อหาใบอื่น</span></>}
                  </p>
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setSeries([]);
                        setTypes([]);
                        setRares([]);
                      }}
                      className="text-xs font-bold underline"
                    >
                      ล้างตัวกรอง
                    </button>
                  )}
                </div>
                {hasFilters && (
                  <div className="flex flex-wrap gap-1.5">
                    {series.map((code) => (
                      <button
                        type="button"
                        key={`s-${code}`}
                        onClick={() => setSeries(series.filter((item) => item !== code))}
                        className="rounded-full border-2 border-ink bg-white px-2 py-0.5 text-[11px] font-bold"
                      >
                        {seriesLabel(`${code}-000`)} ×
                      </button>
                    ))}
                    {types.map((item) => (
                      <button
                        type="button"
                        key={`t-${item}`}
                        onClick={() => setTypes(types.filter((value) => value !== item))}
                        className="rounded-full border-2 border-ink bg-white px-2 py-0.5 text-[11px] font-bold"
                      >
                        {typeLabel(item)} ×
                      </button>
                    ))}
                    {rares.map((item) => (
                      <button
                        type="button"
                        key={`r-${item}`}
                        onClick={() => setRares(rares.filter((value) => value !== item))}
                        className="rounded-full border-2 border-ink bg-white px-2 py-0.5 text-[11px] font-bold"
                      >
                        {displayRare(item)} ×
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {results.length === 0 && (
                  <p className="col-span-full py-8 text-center text-sm font-medium text-muted">
                    ไม่พบการ์ดตามตัวกรอง
                  </p>
                )}
                {results.map((card) => {
                  const qty = qtyOf(card);
                  return (
                    <button
                      type="button"
                      key={cardKey(card.print, card.rare)}
                      onClick={() => addCard(card)}
                      className={`relative min-w-0 overflow-hidden rounded-lg border-2 bg-white ${
                        qty > 0 ? "border-bot-red" : "border-ink/30 hover:border-ink"
                      }`}
                    >
                      {qty > 0 && (
                        <span className="absolute right-1 top-1 z-10 rounded bg-bot-red px-1.5 text-[11px] font-black text-white">
                          ×{qty}
                        </span>
                      )}
                      <CardImage
                        print={card.print}
                        rare={card.rare}
                        name={card.name}
                      />
                    </button>
                  );
                })}
                </div>
              </div>
            </section>

            <section className="flex min-w-0 shrink-0 flex-col gap-2 overflow-hidden p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-4 md:min-h-0 md:flex-1 md:gap-3 md:pb-4">
              <div className="shrink-0 space-y-2">
                {locationFields}
                {scanButtons}
              </div>
              {scanMessage && (
                <p className="shrink-0 text-xs font-bold text-bot-red">{scanMessage}</p>
              )}
              {selectedList}
              <div className="shrink-0 space-y-2 border-t-2 border-ink/15 pt-2 md:space-y-3 md:pt-3">
                {notesField}
                {error && <p className="text-sm font-bold text-bot-red">{error}</p>}
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || scanning || !dirty || !boxId}
                  className="w-full rounded-full border-2 border-ink bg-ink py-2.5 text-sm font-extrabold text-cream disabled:opacity-50 sm:py-3 sm:text-base"
                >
                  {saveLabel}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
