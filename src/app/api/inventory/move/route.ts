import { NextResponse } from "next/server";
import { denyIfLocked } from "@/lib/lock";
import { getStore, movePlacements } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const destBoxId = String(body.boxId ?? "");
    const items = Array.isArray(body.items)
      ? body.items.map((item: { id?: string; quantity?: number }) => ({
          id: String(item.id ?? ""),
          quantity: item.quantity === undefined ? undefined : Number(item.quantity),
        }))
      : [];
    const ids = items.map((item: { id: string }) => item.id).filter(Boolean);
    if (!ids.length) {
      return NextResponse.json({ error: "เลือกการ์ดก่อน" }, { status: 400 });
    }

    const store = await getStore();
    const sourceBoxIds = new Set<string>();
    for (const id of ids) {
      const current = store.placements.find((item) => item.id === id);
      if (!current) {
        return NextResponse.json({ error: "ไม่พบการ์ดในแถวนี้" }, { status: 400 });
      }
      sourceBoxIds.add(current.boxId);
    }

    for (const boxId of sourceBoxIds) {
      const denied = await denyIfLocked(boxId);
      if (denied) return denied;
    }
    const destDenied = await denyIfLocked(destBoxId);
    if (destDenied) return destDenied;

    const next = await movePlacements({
      boxId: destBoxId,
      row: Number(body.row),
      items,
    });
    return NextResponse.json({ placements: next.placements });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ย้ายการ์ดไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
