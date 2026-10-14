// Failed logins per email, in memory. Same limit as the extraction counter:
// with two processes each one keeps its own count.
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, number[]>();

function recent(email: string, now: number): number[] {
  const list = (failures.get(email) ?? []).filter((at) => now - at < WINDOW_MS);
  if (list.length === 0) {
    failures.delete(email);
  } else {
    failures.set(email, list);
  }
  return list;
}

export function loginBlocked(email: string, now = Date.now()): boolean {
  return recent(email, now).length >= MAX_FAILURES;
}

export function recordFailure(email: string, now = Date.now()): void {
  failures.set(email, [...recent(email, now), now]);
}

export function clearFailures(email: string): void {
  failures.delete(email);
}
