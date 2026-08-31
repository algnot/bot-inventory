import type { Box, LockState } from "@/lib/types";

export type { LockState };

export function canEditBox(
  box?: Pick<Box, "id" | "pinEnabled"> | null,
  unlockedBoxIds?: string[] | null,
) {
  if (!box?.pinEnabled) return true;
  return Boolean(unlockedBoxIds?.includes(box.id));
}

export function requestUnlock(boxId?: string, boxName?: string) {
  if (!boxId) return;
  window.dispatchEvent(
    new CustomEvent("bot-need-unlock", { detail: { boxId, boxName } }),
  );
}

export function throwIfApiError(
  res: Response,
  data: { error?: string; code?: string; boxId?: string; boxName?: string } | null,
  fallback: string,
): void {
  if (res.ok) return;
  if (res.status === 403 && data?.code === "LOCKED") {
    requestUnlock(data.boxId, data.boxName);
  }
  throw new Error(data?.error || fallback);
}
