import { NextResponse } from "next/server";
import { loadCatalog } from "@/lib/catalog";
import { scanCardsWithOpenAi } from "@/lib/scan-cards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DATA_URL = /^data:image\/(jpeg|jpg|png|webp);base64,/i;
const MAX_IMAGE = 1_200_000;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { image?: string };
    const image = String(body.image ?? "");
    if (!DATA_URL.test(image)) {
      return NextResponse.json({ error: "ส่งรูป JPG หรือ PNG มา" }, { status: 400 });
    }
    if (image.length > MAX_IMAGE) {
      return NextResponse.json({ error: "รูปใหญ่เกินไป" }, { status: 400 });
    }

    const catalog = await loadCatalog();
    if (!catalog.length) {
      return NextResponse.json({ error: "ยังไม่มีแคตตาล็อกการ์ด" }, { status: 400 });
    }

    const { matched, unmatched } = await scanCardsWithOpenAi(image, catalog);
    return NextResponse.json({
      cards: matched,
      unmatched,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "อ่านรูปไม่สำเร็จ";
    const status = /OPENAI_API_KEY/.test(message) ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
