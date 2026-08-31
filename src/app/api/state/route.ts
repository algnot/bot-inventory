import { NextResponse } from "next/server";
import { loadCatalog } from "@/lib/catalog";
import { getLocatedCards } from "@/lib/inventory";
import { getLockStatus } from "@/lib/lock";
import { getStore } from "@/lib/store";
import { storageMode } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const [store, catalog] = await Promise.all([getStore(), loadCatalog()]);
    const located = await getLocatedCards(q, { store, cards: catalog });
    const lock = await getLockStatus(store.pinHash);
    return NextResponse.json({
      boxes: store.boxes,
      people: store.people,
      placements: store.placements,
      located,
      meta: { ...store.meta, count: store.meta.count || catalog.length },
      catalogCount: catalog.length,
      storage: storageMode(),
      lock,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
