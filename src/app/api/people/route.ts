import { NextResponse } from "next/server";
import { createPerson, getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const store = await getStore();
  return NextResponse.json({ people: store.people });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const store = await createPerson(String(body.name ?? ""));
    return NextResponse.json({ people: store.people });
  } catch (error) {
    const message = error instanceof Error ? error.message : "เพิ่มคนไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
