import { and, isNotNull, lt, or } from "drizzle-orm";
import type { Database } from "../db/client";
import { extractions } from "../db/schema";
import { RETENTION_DAYS } from "../extraction/limits";

const DAY_MS = 24 * 60 * 60 * 1000;

// Clears the message and the model output. The row stays: id, user, version,
// tokens, duration, status, and the date. That is the cost and audit record.
export async function wipeExpiredText(db: Database, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * DAY_MS);
  const rows = await db
    .update(extractions)
    .set({ inputText: null, output: null })
    .where(
      and(
        lt(extractions.createdAt, cutoff),
        or(isNotNull(extractions.inputText), isNotNull(extractions.output)),
      ),
    )
    .returning({ id: extractions.id });

  return rows.length;
}
