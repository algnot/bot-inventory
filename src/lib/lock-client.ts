import type { LockState } from "@/lib/types";

export type { LockState };

export function canEdit(lock?: LockState | null) {
  return !lock?.enabled || Boolean(lock.unlocked);
}

export function requestUnlock() {
  window.dispatchEvent(new Event("bot-need-unlock"));
}

export function throwIfApiError(
  res: Response,
  data: { error?: string; code?: string } | null,
  fallback: string,
): void {
  if (res.ok) return;
  if (res.status === 403 && data?.code === "LOCKED") requestUnlock();
  throw new Error(data?.error || fallback);
}
