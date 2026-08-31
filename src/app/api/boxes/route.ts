import { NextResponse } from "next/server";
import { createBox, getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const store = await getStore();
  return NextResponse.json({ boxes: store.boxes });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const store = await createBox({
      name: String(body.name ?? ""),
      rows: Number(body.rows ?? 4),
      notes: String(body.notes ?? ""),
      ownerId: body.ownerId ? String(body.ownerId) : null,
    });
    return NextResponse.json({ boxes: store.boxes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "สร้างกล่องไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
