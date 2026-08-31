import { NextResponse } from "next/server";
import { catalogFingerprint, loadCatalog, searchCards } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=86400";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const cards = searchCards(await loadCatalog(), q);
  const etag = catalogFingerprint(cards);

  if (!q && request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": CACHE_CONTROL,
      },
    });
  }

  return NextResponse.json(
    { cards, count: cards.length },
    {
      headers: {
        ETag: etag,
        "Cache-Control": q ? "no-store" : CACHE_CONTROL,
      },
    },
  );
}
