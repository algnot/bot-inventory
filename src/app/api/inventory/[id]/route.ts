import { NextResponse } from "next/server";
import { denyIfLocked } from "@/lib/lock";
import { deletePlacement, updatePlacement } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const denied = await denyIfLocked();
  if (denied) return denied;
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const store = await updatePlacement(id, {
      boxId: body.boxId,
      row: body.row,
      quantity: body.quantity,
      notes: body.notes,
    });
    return NextResponse.json({ placements: store.placements });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ย้ายการ์ดไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const denied = await denyIfLocked();
  if (denied) return denied;
  try {
    const { id } = await ctx.params;
    const store = await deletePlacement(id);
    return NextResponse.json({ placements: store.placements });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ลบการ์ดไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
