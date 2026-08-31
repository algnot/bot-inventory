import { NextResponse } from "next/server";
import { loadCatalog, searchCards } from "@/lib/catalog";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const cards = searchCards(await loadCatalog(), q);
  const store = await getStore();
  return NextResponse.json({
    cards,
    meta: store.meta,
    count: cards.length,
  });
}
