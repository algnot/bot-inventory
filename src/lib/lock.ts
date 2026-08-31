import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getStore, setPinHash } from "@/lib/store";
import type { LockState } from "@/lib/types";

const COOKIE = "bot_edit";
const MAX_AGE = 60 * 60 * 24 * 7;
const ENV_SALT = "bot-inventory-pin-v1";

function envPin() {
  return process.env.INVENTORY_PIN?.trim() || "";
}

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

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function lockSecret(pinHash: string | null) {
  if (pinHash) return pinHash;
  const pin = envPin();
  if (!pin) return null;
  return `env:${hashWithSalt(pin, ENV_SALT)}`;
}

export function lockEnabled(pinHash: string | null) {
  return Boolean(lockSecret(pinHash));
}

function sign(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function makeToken(secret: string) {
  const exp = Date.now() + MAX_AGE * 1000;
  const payload = String(exp);
  return `${payload}.${sign(secret, payload)}`;
}

function tokenValid(token: string, secret: string) {
  const sep = token.lastIndexOf(".");
  if (sep < 1) return false;
  const payload = token.slice(0, sep);
  const sig = token.slice(sep + 1);
  const expected = sign(secret, payload);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  const exp = Number(payload);
  return Number.isFinite(exp) && exp > Date.now();
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

export async function getLockStatus(pinHash: string | null): Promise<LockState> {
  const secret = lockSecret(pinHash);
  if (!secret) return { enabled: false, unlocked: true };
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value ?? "";
  return { enabled: true, unlocked: tokenValid(token, secret) };
}

export async function denyIfLocked() {
  const store = await getStore();
  const status = await getLockStatus(store.pinHash);
  if (status.enabled && !status.unlocked) {
    return NextResponse.json(
      { error: "ต้องใส่รหัสก่อนแก้ไขกล่อง", code: "LOCKED" },
      { status: 403 },
    );
  }
  return null;
}

export async function unlockWithPin(pin: string) {
  const trimmed = pin.trim();
  if (!trimmed) throw new Error("ใส่รหัสก่อน");
  const store = await getStore();
  const ok = store.pinHash
    ? verifyStoredPin(trimmed, store.pinHash)
    : envPin()
      ? safeEqual(trimmed, envPin())
      : false;
  if (!ok) throw new Error("รหัสไม่ถูกต้อง");
  const secret = lockSecret(store.pinHash);
  if (!secret) throw new Error("ยังไม่ได้ตั้งรหัส");
  const jar = await cookies();
  jar.set(COOKIE, makeToken(secret), cookieOptions());
  return { enabled: true, unlocked: true } satisfies LockState;
}

export async function lockSession() {
  const jar = await cookies();
  jar.set(COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}

export async function setLockPin(pin: string, currentPin?: string) {
  const trimmed = pin.trim();
  if (trimmed.length < 4) throw new Error("รหัสอย่างน้อย 4 ตัว");
  if (trimmed.length > 64) throw new Error("รหัสยาวเกินไป");
  const store = await getStore();
  const enabled = lockEnabled(store.pinHash);
  if (enabled) {
    const status = await getLockStatus(store.pinHash);
    const current = (currentPin ?? "").trim();
    const currentOk = store.pinHash
      ? verifyStoredPin(current, store.pinHash)
      : envPin()
        ? safeEqual(current, envPin())
        : false;
    if (!status.unlocked && !currentOk) throw new Error("ใส่รหัสปัจจุบันก่อน");
  }
  const hash = hashPin(trimmed);
  await setPinHash(hash);
  const jar = await cookies();
  jar.set(COOKIE, makeToken(hash), cookieOptions());
  return { enabled: true, unlocked: true } satisfies LockState;
}

export async function clearLockPin(currentPin: string) {
  const store = await getStore();
  if (envPin() && !store.pinHash) {
    throw new Error("รหัสนี้อยู่ในเครื่องเซิร์ฟเวอร์ ลบ INVENTORY_PIN จาก .env เอง");
  }
  if (!store.pinHash) throw new Error("ยังไม่ได้ตั้งรหัส");
  if (!verifyStoredPin(currentPin.trim(), store.pinHash)) {
    throw new Error("รหัสไม่ถูกต้อง");
  }
  await setPinHash(null);
  await lockSession();
  return { enabled: lockEnabled(null), unlocked: !lockEnabled(null) } satisfies LockState;
}
