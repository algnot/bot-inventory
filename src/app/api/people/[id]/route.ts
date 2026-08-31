import { NextResponse } from "next/server";
import { denyIfLocked } from "@/lib/lock";
import { deletePerson, updatePerson } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const denied = await denyIfLocked();
  if (denied) return denied;
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const store = await updatePerson(id, {
      name: body.name !== undefined ? String(body.name) : undefined,
      notes: body.notes !== undefined ? String(body.notes) : undefined,
    });
    return NextResponse.json({ people: store.people });
  } catch (error) {
    const message = error instanceof Error ? error.message : "แก้ชื่อไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const denied = await denyIfLocked();
  if (denied) return denied;
  try {
    const { id } = await ctx.params;
    const store = await deletePerson(id);
    return NextResponse.json({ people: store.people, boxes: store.boxes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ลบคนไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
