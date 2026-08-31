import { NextResponse } from "next/server";
import { denyIfLocked } from "@/lib/lock";
import { deletePlacement, getStore, updatePlacement } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const store = await getStore();
    const current = store.placements.find((item) => item.id === id);
    if (!current) {
      return NextResponse.json({ error: "ไม่พบการ์ดในแถวนี้" }, { status: 400 });
    }
    const denied = await denyIfLocked(current.boxId);
    if (denied) return denied;
    const body = await request.json();
    if (body.boxId && String(body.boxId) !== current.boxId) {
      const destDenied = await denyIfLocked(String(body.boxId));
      if (destDenied) return destDenied;
    }
    const next = await updatePlacement(id, {
      boxId: body.boxId,
      row: body.row,
      quantity: body.quantity,
      notes: body.notes,
    });
    return NextResponse.json({ placements: next.placements });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ย้ายการ์ดไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const store = await getStore();
    const current = store.placements.find((item) => item.id === id);
    if (!current) {
      return NextResponse.json({ error: "ไม่พบการ์ดในแถวนี้" }, { status: 400 });
    }
    const denied = await denyIfLocked(current.boxId);
    if (denied) return denied;
    const next = await deletePlacement(id);
    return NextResponse.json({ placements: next.placements });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ลบการ์ดไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
