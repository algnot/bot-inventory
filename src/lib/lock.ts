import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getStore, setBoxPinHash } from "@/lib/store";
import type { Box, LockState } from "@/lib/types";

const COOKIE = "bot_box_edit";
const MAX_AGE = 60 * 60 * 24 * 7;

function hashWithSalt(pin: string, salt: string) {
  return scryptSync(pin, salt, 32).toString("hex");
}

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${hashWithSalt(pin, salt)}`;
}

function verifyStoredPin(pin: string, stored: string) {
  const sep = stored.indexOf(":");
  if (sep < 1) return false;
  const salt = stored.slice(0, sep);
  const hash = stored.slice(sep + 1);
  const check = hashWithSalt(pin, salt);
  const left = Buffer.from(hash, "hex");
  const right = Buffer.from(check, "hex");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function sign(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  };
}

type SessionToken = { id: string; exp: number; sig: string };

function parseCookie(value: string): SessionToken[] {
  if (!value) return [];
  return value.split("|").flatMap((part) => {
    const [id, expRaw, sig] = part.split(":");
    const exp = Number(expRaw);
    if (!id || !sig || !Number.isFinite(exp)) return [];
    return [{ id, exp, sig }];
  });
}

function serializeCookie(tokens: SessionToken[]) {
  return tokens.map((item) => `${item.id}:${item.exp}:${item.sig}`).join("|");
}

function tokenFor(boxId: string, pinHash: string): SessionToken {
  const exp = Date.now() + MAX_AGE * 1000;
  const payload = `${boxId}.${exp}`;
  return { id: boxId, exp, sig: sign(pinHash, payload) };
}

function tokenValid(token: SessionToken, pinHash: string) {
  if (token.exp <= Date.now()) return false;
  const expected = sign(pinHash, `${token.id}.${token.exp}`);
  const left = Buffer.from(token.sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

async function readTokens() {
  const jar = await cookies();
  return parseCookie(jar.get(COOKIE)?.value ?? "");
}

async function writeTokens(tokens: SessionToken[]) {
  const jar = await cookies();
  const alive = tokens.filter((item) => item.exp > Date.now());
  if (!alive.length) {
    jar.set(COOKIE, "", { ...cookieOptions(), maxAge: 0 });
    return;
  }
  jar.set(COOKIE, serializeCookie(alive), cookieOptions());
}

export function getBoxLockStatus(box: Box, tokens: SessionToken[]): LockState {
  if (!box.pinHash) return { enabled: false, unlocked: true };
  const token = tokens.find((item) => item.id === box.id);
  return {
    enabled: true,
    unlocked: Boolean(token && tokenValid(token, box.pinHash)),
  };
}

export async function getLockForBox(box: Box): Promise<LockState> {
  const tokens = await readTokens();
  return getBoxLockStatus(box, tokens);
}

export async function getUnlockedBoxIds(boxes: Box[]) {
  const tokens = await readTokens();
  return boxes
    .filter((box) => Boolean(box.pinHash) && getBoxLockStatus(box, tokens).unlocked)
    .map((box) => box.id);
}

export async function denyIfLocked(boxId: string) {
  const store = await getStore();
  const box = store.boxes.find((item) => item.id === boxId);
  if (!box) {
    return NextResponse.json({ error: "ไม่พบกล่อง" }, { status: 400 });
  }
  const tokens = await readTokens();
  const status = getBoxLockStatus(box, tokens);
  if (status.enabled && !status.unlocked) {
    return NextResponse.json(
      {
        error: `ต้องใส่รหัสกล่อง “${box.name}” ก่อนแก้ไข`,
        code: "LOCKED",
        boxId: box.id,
        boxName: box.name,
      },
      { status: 403 },
    );
  }
  return null;
}

export async function unlockBox(boxId: string, pin: string) {
  const trimmed = pin.trim();
  if (!trimmed) throw new Error("ใส่รหัสก่อน");
  const store = await getStore();
  const box = store.boxes.find((item) => item.id === boxId);
  if (!box) throw new Error("ไม่พบกล่อง");
  if (!box.pinHash) throw new Error("กล่องนี้ยังไม่ได้ตั้งรหัส");
  if (!verifyStoredPin(trimmed, box.pinHash)) throw new Error("รหัสไม่ถูกต้อง");
  const tokens = (await readTokens()).filter((item) => item.id !== box.id);
  tokens.push(tokenFor(box.id, box.pinHash));
  await writeTokens(tokens);
  return { enabled: true, unlocked: true } satisfies LockState;
}

export async function lockBox(boxId: string) {
  const tokens = (await readTokens()).filter((item) => item.id !== boxId);
  await writeTokens(tokens);
}

export async function setBoxPin(boxId: string, pin: string, currentPin = "") {
  const trimmed = pin.trim();
  if (trimmed.length < 4) throw new Error("รหัสอย่างน้อย 4 ตัว");
  if (trimmed.length > 64) throw new Error("รหัสยาวเกินไป");
  const store = await getStore();
  const box = store.boxes.find((item) => item.id === boxId);
  if (!box) throw new Error("ไม่พบกล่อง");
  if (box.pinHash) {
    const tokens = await readTokens();
    const unlocked = getBoxLockStatus(box, tokens).unlocked;
    const currentOk = verifyStoredPin(currentPin.trim(), box.pinHash);
    if (!unlocked && !currentOk) throw new Error("ใส่รหัสปัจจุบันของกล่องนี้ก่อน");
  }
  const hash = hashPin(trimmed);
  await setBoxPinHash(boxId, hash);
  const tokens = (await readTokens()).filter((item) => item.id !== boxId);
  tokens.push(tokenFor(boxId, hash));
  await writeTokens(tokens);
  return { enabled: true, unlocked: true } satisfies LockState;
}

export async function clearBoxPin(boxId: string, currentPin: string) {
  const store = await getStore();
  const box = store.boxes.find((item) => item.id === boxId);
  if (!box) throw new Error("ไม่พบกล่อง");
  if (!box.pinHash) throw new Error("กล่องนี้ยังไม่ได้ตั้งรหัส");
  if (!verifyStoredPin(currentPin.trim(), box.pinHash)) throw new Error("รหัสไม่ถูกต้อง");
  await setBoxPinHash(boxId, null);
  await lockBox(boxId);
  return { enabled: false, unlocked: true } satisfies LockState;
}
