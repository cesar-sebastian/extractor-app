import { and, desc, eq } from "drizzle-orm";
import type { Extraccion } from "../extraction/extraccion";
import type { ExtraccionId, UserId } from "../ids";
import { getDatabase } from "./client";
import { extracciones } from "./schema";

export type EstadoExtraccion = "completada" | "fallida";

export type ExtraccionResumen = {
  id: ExtraccionId;
  estado: EstadoExtraccion;
  createdAt: Date;
};

export type ExtraccionDetalle = ExtraccionResumen & {
  textoEntrada: string | null;
  salida: Extraccion | null;
  errorSchema: string | null;
  promptVersion: string;
  modelId: string;
  tokensEntrada: number;
  tokensSalida: number;
  duracionMs: number;
  parentId: ExtraccionId | null;
};

export async function insertExtraccion(input: {
  userId: UserId;
  textoEntrada: string;
  estado: EstadoExtraccion;
  salida: Extraccion | null;
  errorSchema: string | null;
  promptVersion: string;
  modelId: string;
  tokensEntrada: number;
  tokensSalida: number;
  duracionMs: number;
}): Promise<ExtraccionId> {
  const rows = await getDatabase()
    .insert(extracciones)
    .values(input)
    .returning({ id: extracciones.id });

  const created = rows[0];
  if (!created) {
    throw new Error("la base no devolvió la extracción");
  }
  return created.id;
}

export async function listExtracciones(userId: UserId): Promise<ExtraccionResumen[]> {
  return getDatabase()
    .select({
      id: extracciones.id,
      estado: extracciones.estado,
      createdAt: extracciones.createdAt,
    })
    .from(extracciones)
    .where(eq(extracciones.userId, userId))
    .orderBy(desc(extracciones.createdAt));
}

export async function findExtraccion(
  userId: UserId,
  id: ExtraccionId,
): Promise<ExtraccionDetalle | null> {
  const rows = await getDatabase()
    .select({
      id: extracciones.id,
      estado: extracciones.estado,
      createdAt: extracciones.createdAt,
      textoEntrada: extracciones.textoEntrada,
      salida: extracciones.salida,
      errorSchema: extracciones.errorSchema,
      promptVersion: extracciones.promptVersion,
      modelId: extracciones.modelId,
      tokensEntrada: extracciones.tokensEntrada,
      tokensSalida: extracciones.tokensSalida,
      duracionMs: extracciones.duracionMs,
      parentId: extracciones.parentId,
    })
    .from(extracciones)
    .where(and(eq(extracciones.id, id), eq(extracciones.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}
