import { NextResponse } from "next/server";
import { deleteBox, updateBox } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const store = await updateBox(id, {
      name: body.name,
      rows: body.rows,
      notes: body.notes,
      ownerId: body.ownerId,
    });
    return NextResponse.json({ boxes: store.boxes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "แก้กล่องไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const store = await deleteBox(id);
    return NextResponse.json({ boxes: store.boxes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ลบกล่องไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
