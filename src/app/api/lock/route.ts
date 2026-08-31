import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import {
  clearLockPin,
  getLockStatus,
  lockSession,
  setLockPin,
  unlockWithPin,
} from "@/lib/lock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const store = await getStore();
    const lock = await getLockStatus(store.pinHash);
    return NextResponse.json({ lock });
  } catch (error) {
    const message = error instanceof Error ? error.message : "โหลดสถานะล็อกไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action ?? "");
    if (action === "unlock") {
      const lock = await unlockWithPin(String(body.pin ?? ""));
      return NextResponse.json({ lock });
    }
    if (action === "lock") {
      await lockSession();
      const store = await getStore();
      const lock = await getLockStatus(store.pinHash);
      return NextResponse.json({ lock });
    }
    if (action === "set") {
      const lock = await setLockPin(String(body.pin ?? ""), body.currentPin ? String(body.currentPin) : "");
      return NextResponse.json({ lock });
    }
    if (action === "clear") {
      const lock = await clearLockPin(String(body.pin ?? ""));
      return NextResponse.json({ lock });
    }
    return NextResponse.json({ error: "ไม่รู้จักคำสั่งนี้" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ทำรายการไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
