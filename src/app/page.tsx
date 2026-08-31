"use client";

import Link from "next/link";
import { useState } from "react";
import { CardImage } from "@/components/card-image";
import { CardModal } from "@/components/card-modal";
import { PlaceModal } from "@/components/place-modal";
import { RarityBadge } from "@/components/rarity-badge";
import { locationLabel } from "@/lib/labels";
import { useAppState } from "@/lib/use-app-state";
import { catalogVersion, loadCatalogClient } from "@/lib/catalog-client";
import type { Card, LocatedCard } from "@/lib/types";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const { state, loading, reload, error } = useAppState(query);
  const [detail, setDetail] = useState<LocatedCard | null>(null);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [placeCard, setPlaceCard] = useState<Card | null>(null);
  const [catalog, setCatalog] = useState<Card[]>([]);

  async function ensureCatalog() {
    if (catalog.length) return catalog;
    const cards = await loadCatalogClient(
      catalogVersion(state?.meta.syncedAt, state?.catalogCount),
    );
    setCatalog(cards);
    return cards;
  }

  async function openPlace(card: Card | null = null) {
    await ensureCatalog();
    setPlaceCard(card);
    setPlaceOpen(true);
  }

  const ownedCount =
    state?.placements.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-6">
      <div className="rounded-3xl border-4 border-ink bg-cream p-4 sm:p-5 md:p-7">
        <p className="text-xs font-bold tracking-wide text-bot-red">
          คลังการ์ด BOT ของต้นก้า
        </p>
        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="พิมพ์ชื่อการ์ด เช่น พระอิศวร หรือ BT01-001"
            className="w-full flex-1 rounded-full border-2 border-ink bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ink/20 sm:px-5 sm:text-lg"
          />
          <button
            type="button"
            onClick={() => void openPlace()}
            className="rounded-full border-2 border-ink bg-ink px-5 py-3 font-extrabold text-cream"
          >
            เพิ่มการ์ดลงกล่อง
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
          <span className="rounded-full border-2 border-ink bg-white px-3 py-1">
            ในคลัง {ownedCount} ใบ
          </span>
          <span className="rounded-full border-2 border-ink bg-white px-3 py-1">
            {state?.boxes.length ?? 0} กล่อง
          </span>
          <span className="rounded-full border-2 border-ink bg-white px-3 py-1">
            แคตตาล็อก {state?.catalogCount ?? 0} ใบ
          </span>
        </div>
      </div>

      {error && <p className="mt-6 font-bold text-bot-red">{error}</p>}

      {loading && !state && <p className="mt-6 text-muted">กำลังโหลด...</p>}

      {state && state.boxes.length === 0 && (
        <div className="mt-6 rounded-2xl border-4 border-dashed border-ink/40 p-6 text-center">
          <p className="font-bold">ยังไม่มีกล่องเก็บการ์ด</p>
          <Link
            href="/boxes"
            className="mt-3 inline-block font-extrabold underline"
          >
            สร้างกล่องแรก
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-3">
        {(state?.located ?? []).map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setDetail(item)}
            className="flex gap-3 rounded-2xl border-2 border-ink bg-cream p-3 text-left hover:bg-white"
          >
            <div className="w-16 shrink-0 overflow-hidden rounded-lg border-2 border-ink sm:w-20">
              <CardImage
                print={item.print}
                rare={item.rare}
                name={item.card.name}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-extrabold">
                  {item.card.name}
                </h2>
                <RarityBadge rare={item.rare} />
              </div>
              <p className="text-sm text-muted">{item.print}</p>
              <p className="mt-2 text-base font-black break-words text-bot-red">
                {locationLabel(item.box.name, item.row, item.ownerName)}
              </p>
              {item.quantity > 1 && (
                <p className="text-sm font-semibold">
                  จำนวน {item.quantity} ใบ
                </p>
              )}
              <Link
                href={`/boxes/${item.boxId}`}
                onClick={(event) => event.stopPropagation()}
                className="mt-2 inline-block text-sm font-bold underline"
              >
                เปิดกล่องนี้
              </Link>
            </div>
          </button>
        ))}
      </div>

      {state && query && state.located.length === 0 && (
        <p className="mt-6 text-center font-medium text-muted">
          ไม่พบการ์ดนี้ในกล่องของเรา —
          ลองค้นจากหน้าการ์ดทั้งหมดแล้วกดใส่เข้ากล่อง
        </p>
      )}

      {detail && (
        <CardModal
          card={detail.card}
          locations={[detail]}
          onClose={() => setDetail(null)}
          onPlace={(card) => {
            setDetail(null);
            void openPlace(card);
          }}
        />
      )}

      {placeOpen && (
        <PlaceModal
          boxes={state?.boxes ?? []}
          people={state?.people ?? []}
          unlockedBoxIds={state?.unlockedBoxIds ?? []}
          placements={state?.placements ?? []}
          cards={catalog}
          card={placeCard}
          onClose={() => {
            setPlaceOpen(false);
            setPlaceCard(null);
          }}
          onSaved={() => void reload()}
        />
      )}
    </div>
  );
}
