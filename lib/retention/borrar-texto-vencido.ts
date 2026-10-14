import { and, isNotNull, lt, or } from "drizzle-orm";
import type { Database } from "../db/client";
import { extracciones } from "../db/schema";
import { RETENTION_DAYS } from "../extraction/limits";

const DAY_MS = 24 * 60 * 60 * 1000;

// Clears the message and the model output. The row stays: id, user, version,
// tokens, duration, status, and the date. That is the cost and audit record.
export async function borrarTextoVencido(db: Database, now = new Date()): Promise<number> {
  const limite = new Date(now.getTime() - RETENTION_DAYS * DAY_MS);
  const rows = await db
    .update(extracciones)
    .set({ textoEntrada: null, salida: null })
    .where(
      and(
        lt(extracciones.createdAt, limite),
        or(isNotNull(extracciones.textoEntrada), isNotNull(extracciones.salida)),
      ),
    )
    .returning({ id: extracciones.id });

  return rows.length;
}
