import { NextResponse } from "next/server";
import { loadCatalog } from "@/lib/catalog";
import { getLocatedCards } from "@/lib/inventory";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const [store, catalog, located] = await Promise.all([
    getStore(),
    loadCatalog(),
    getLocatedCards(q),
  ]);
  return NextResponse.json({
    boxes: store.boxes,
    people: store.people,
    placements: store.placements,
    located,
    meta: { ...store.meta, count: store.meta.count || catalog.length },
    catalogCount: catalog.length,
  });
}
