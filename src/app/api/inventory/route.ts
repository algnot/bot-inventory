import { NextResponse } from "next/server";
import { denyIfLocked } from "@/lib/lock";
import { addPlacement, addPlacements, setRowPlacements } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const boxId = String(body.boxId ?? "");
    const denied = await denyIfLocked(boxId);
    if (denied) return denied;
    const items = Array.isArray(body.items) ? body.items : null;
    const store = items
      ? await addPlacements({
          boxId,
          row: Number(body.row),
          notes: String(body.notes ?? ""),
          items: items.map((item: { print?: string; rare?: string; quantity?: number }) => ({
            print: String(item.print ?? ""),
            rare: String(item.rare ?? ""),
            quantity: Number(item.quantity ?? 1),
          })),
        })
      : await addPlacement({
          boxId,
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

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const boxId = String(body.boxId ?? "");
    const denied = await denyIfLocked(boxId);
    if (denied) return denied;
    const items = Array.isArray(body.items) ? body.items : [];
    const store = await setRowPlacements({
      boxId,
      row: Number(body.row),
      notes: String(body.notes ?? ""),
      items: items.map((item: { print?: string; rare?: string; quantity?: number }) => ({
        print: String(item.print ?? ""),
        rare: String(item.rare ?? ""),
        quantity: Number(item.quantity ?? 1),
      })),
    });
    return NextResponse.json({ placements: store.placements });
  } catch (error) {
    const message = error instanceof Error ? error.message : "บันทึกแถวไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
