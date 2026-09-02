"use client";

import { useEffect } from "react";
import type { Card } from "@/lib/types";
import type { LocatedCard } from "@/lib/types";
import { seriesLabel } from "@/lib/series";
import { typeLabel, locationLabel } from "@/lib/labels";
import { symbolImageUrl } from "@/lib/image";
import { CardImage } from "./card-image";
import { EffectText } from "./effect-text";
import { RarityBadge } from "./rarity-badge";

const COLOR_DOT: Record<string, string> = {
  แดง: "bg-bot-red",
  ฟ้า: "bg-sky-500",
  เขียว: "bg-emerald-600",
  ม่วง: "bg-violet-600",
  ไม่มีสี: "bg-zinc-400",
};

export function CardModal({
  card,
  locations = [],
  onClose,
  onPlace,
  onRemove,
  onMove,
}: {
  card: Card;
  locations?: LocatedCard[];
  onClose: () => void;
  onPlace?: (card: Card) => void;
  onRemove?: () => void;
  onMove?: (item: LocatedCard) => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const stats: Array<{ label: string; value: string }> = [];
  if (card.type === "Avatar" || card.type === "Construct") {
    if (card.cost !== undefined) stats.push({ label: "ค่าใช้", value: String(card.cost) });
    if (card.gem !== undefined) stats.push({ label: "เจม", value: String(card.gem) });
    if (card.power !== undefined) stats.push({ label: "พลัง", value: String(card.power) });
  } else if (card.type === "Magic" && card.cost !== undefined) {
    stats.push({ label: "เจม", value: String(card.cost) });
  }

  const symbolSrc = card.symbol ? symbolImageUrl(card.symbol) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 p-0 md:items-center md:p-6">
      <div
        className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border-4 border-ink bg-cream pb-[max(1rem,env(safe-area-inset-bottom))] md:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="grid gap-5 p-4 sm:gap-6 md:grid-cols-[280px_1fr] md:p-6">
          <div className="mx-auto w-full max-w-72 md:mx-0 md:max-w-none">
            <div className="overflow-hidden rounded-2xl border-2 border-ink bg-ink/5">
              <CardImage print={card.print} rare={card.rare} name={card.name} />
            </div>
          </div>
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold leading-tight sm:text-2xl">{card.name}</h2>
                <p className="mt-1 text-sm text-muted">
                  {card.print} · {seriesLabel(card.print)}
                  {card.creator ? ` · ${card.creator}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border-2 border-ink px-3 py-1 text-sm font-bold hover:bg-ink hover:text-cream"
              >
                ปิด
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <RarityBadge rare={card.rare} />
              <span className="rounded-full border-2 border-ink bg-ink px-2.5 py-0.5 text-xs font-bold text-cream">
                {typeLabel(card.type, card.subtype)}
              </span>
              <span className="rounded-full border-2 border-ink bg-white px-2.5 py-0.5 text-xs font-bold">
                ซอย {card.soi === 0 ? "อัดมั่ว" : card.soi}
              </span>
              {card.symbol && (
                <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-white px-2 py-0.5 text-xs font-bold">
                  {symbolSrc && (
                    <img src={symbolSrc} alt="" className="h-6 w-6 object-contain" />
                  )}
                  {card.symbol}
                </span>
              )}
              {card.color && card.color !== "ไม่มีสี" && (
                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-white px-2.5 py-0.5 text-xs font-bold">
                  <span
                    className={`h-2.5 w-2.5 rounded-full border border-ink ${COLOR_DOT[card.color] ?? "bg-ink"}`}
                  />
                  {card.color}
                </span>
              )}
              {card.ex && (
                <span className="rounded-full border-2 border-bot-red bg-bot-red px-2.5 py-0.5 text-xs font-bold text-white">
                  {card.ex}
                </span>
              )}
            </div>

            {stats.length > 0 && (
              <div
                className="mt-4 grid overflow-hidden rounded-xl border-2 border-ink bg-white"
                style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
              >
                {stats.map((stat) => (
                  <div key={stat.label} className="border-r-2 border-ink px-3 py-3 text-center last:border-r-0">
                    <p className="text-[11px] font-bold tracking-wide text-muted">{stat.label}</p>
                    <p className="text-2xl font-black">{stat.value}</p>
                  </div>
                ))}
              </div>
            )}

            {card.mainEffect && (
              <section className="mt-4 border-t-2 border-ink/15 pt-4">
                <h3 className="mb-2 text-xs font-bold tracking-wide text-muted">ความสามารถ / ผลหลัก</h3>
                <div className="rounded-xl border-2 border-ink bg-white p-3">
                  <EffectText text={card.mainEffect} hashtagText={card.hashtagText} />
                </div>
              </section>
            )}

            {card.favorText && (
              <section className="mt-4">
                <h3 className="mb-2 text-xs font-bold tracking-wide text-muted">ข้อความ</h3>
                <div className="rounded-xl border-2 border-ink bg-white p-3 italic leading-relaxed">
                  {card.favorText}
                </div>
              </section>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {card.dropRate && (
                <>
                  <dt className="text-muted">อัตราดรอป</dt>
                  <dd className="font-semibold">{card.dropRate}</dd>
                </>
              )}
              {card.customLimit !== undefined && (
                <>
                  <dt className="text-muted">ลิมิตพิเศษ</dt>
                  <dd className="font-semibold">{card.customLimit} ใบ</dd>
                </>
              )}
            </dl>

            {locations.length > 0 && (
              <section className="mt-4 border-t-2 border-ink/15 pt-4">
                <h3 className="mb-2 text-xs font-bold tracking-wide text-muted">อยู่ในกล่องของเรา</h3>
                <ul className="space-y-1">
                  {locations.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-lg border-2 border-ink bg-white px-3 py-2 text-sm font-semibold"
                    >
                      <span>
                        {locationLabel(item.box.name, item.row, item.ownerName)}
                        {item.quantity > 1 ? ` · ×${item.quantity}` : ""}
                      </span>
                      {onMove && locations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onMove(item)}
                          className="shrink-0 text-xs font-extrabold underline"
                        >
                          ย้าย
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {onPlace && (
              <button
                type="button"
                onClick={() => onPlace(card)}
                className="mt-5 w-full rounded-full border-2 border-ink bg-ink py-3 font-extrabold text-cream hover:bg-bot-red"
              >
                ใส่เข้ากล่อง
              </button>
            )}
            {onMove && locations.length === 1 && (
              <button
                type="button"
                onClick={() => onMove(locations[0])}
                className={`${onPlace ? "mt-3" : "mt-5"} w-full rounded-full border-2 border-ink bg-white py-3 font-extrabold hover:bg-gold`}
              >
                ย้ายไปกล่องอื่น
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="mt-3 w-full rounded-full border-2 border-ink bg-white py-3 font-extrabold hover:bg-bot-red hover:text-white"
              >
                เอาการ์ดนี้ออกจากแถว
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
