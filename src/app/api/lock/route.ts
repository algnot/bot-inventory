import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import {
  clearBoxPin,
  getLockForBox,
  lockBox,
  setBoxPin,
  unlockBox,
} from "@/lib/lock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const boxId = searchParams.get("boxId") ?? "";
    const store = await getStore();
    if (!boxId) {
      return NextResponse.json({ error: "ไม่พบกล่อง" }, { status: 400 });
    }
    const box = store.boxes.find((item) => item.id === boxId);
    if (!box) return NextResponse.json({ error: "ไม่พบกล่อง" }, { status: 400 });
    const lock = await getLockForBox(box);
    return NextResponse.json({
      lock,
      box: { id: box.id, name: box.name, pinEnabled: Boolean(box.pinHash) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "โหลดสถานะล็อกไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action ?? "");
    const boxId = String(body.boxId ?? "");
    if (!boxId) return NextResponse.json({ error: "ไม่พบกล่อง" }, { status: 400 });
    if (action === "unlock") {
      const lock = await unlockBox(boxId, String(body.pin ?? ""));
      return NextResponse.json({ lock, boxId });
    }
    if (action === "lock") {
      await lockBox(boxId);
      const store = await getStore();
      const box = store.boxes.find((item) => item.id === boxId);
      return NextResponse.json({
        lock: { enabled: Boolean(box?.pinHash), unlocked: !box?.pinHash },
        boxId,
      });
    }
    if (action === "set") {
      const lock = await setBoxPin(
        boxId,
        String(body.pin ?? ""),
        body.currentPin ? String(body.currentPin) : "",
      );
      return NextResponse.json({ lock, boxId });
    }
    if (action === "clear") {
      const lock = await clearBoxPin(boxId, String(body.pin ?? ""));
      return NextResponse.json({ lock, boxId });
    }
    return NextResponse.json({ error: "ไม่รู้จักคำสั่งนี้" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ทำรายการไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
