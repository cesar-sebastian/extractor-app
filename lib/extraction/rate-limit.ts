import type { UserId } from "../ids";
import { RATE_LIMIT_PER_HOUR } from "./limits";

const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

export function takeSlot(userId: UserId, now = Date.now()): boolean {
  const recent = (hits.get(userId) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= RATE_LIMIT_PER_HOUR) {
    hits.set(userId, recent);
    return false;
  }
  recent.push(now);
  hits.set(userId, recent);
  return true;
}
