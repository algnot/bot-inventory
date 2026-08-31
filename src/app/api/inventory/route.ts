import { NextResponse } from "next/server";
import { addPlacement } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const store = await addPlacement({
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
