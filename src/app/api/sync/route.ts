import { NextResponse } from "next/server";
import { loadCatalog, saveCatalog } from "@/lib/catalog";
import { setCatalogMeta } from "@/lib/store";
import { syncCatalogFromBottcg } from "@/lib/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const previous = await loadCatalog();
    const { cards, result } = await syncCatalogFromBottcg(previous);
    await saveCatalog(cards);
    await setCatalogMeta({
      syncedAt: result.syncedAt,
      count: result.total,
      lastAdded: result.added,
      lastNewCards: result.newCards,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ซิงก์ไม่สำเร็จ";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
