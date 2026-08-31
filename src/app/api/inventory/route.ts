import { NextResponse } from "next/server";
import { addPlacement, addPlacements } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : null;
    const store = items
      ? await addPlacements({
          boxId: String(body.boxId ?? ""),
          row: Number(body.row),
          notes: String(body.notes ?? ""),
          items: items.map((item: { print?: string; rare?: string; quantity?: number }) => ({
            print: String(item.print ?? ""),
            rare: String(item.rare ?? ""),
            quantity: Number(item.quantity ?? 1),
          })),
        })
      : await addPlacement({
          boxId: String(body.boxId ?? ""),
          row: Number(body.row),
          print: String(body.print ?? ""),
          rare: String(body.rare ?? ""),
          quantity: Number(body.quantity ?? 1),
          notes: String(body.notes ?? ""),
        });
    return NextResponse.json({ placements: store.placements });
  } catch (error) {
    const message = error instanceof Error ? error.message : "เพิ่มการ์ดไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
