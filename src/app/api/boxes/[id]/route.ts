import { NextResponse } from "next/server";
import { deleteBox, updateBox } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const patch: {
      name?: string;
      rows?: number;
      notes?: string;
      ownerId?: string | null;
    } = {};
    if (body.name !== undefined) patch.name = String(body.name);
    if (body.rows !== undefined) patch.rows = Number(body.rows);
    if (body.notes !== undefined) patch.notes = String(body.notes);
    if (body.ownerId !== undefined) patch.ownerId = body.ownerId || null;
    const store = await updateBox(id, patch);
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
