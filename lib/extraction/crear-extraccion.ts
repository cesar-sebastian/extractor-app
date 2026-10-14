import { loadConfig } from "../config";
import { insertExtraccion } from "../db/extracciones";
import type { UserId, ExtraccionId } from "../ids";
import { logLlamada } from "../log";
import { buildPrompt } from "./build-prompt";
import { crearProveedor } from "./crear-proveedor";
import { invokeModel } from "./invoke-model";
import { mensajeUsuarioSchema, type MensajeUsuario } from "./mensaje";
import { toExtraction } from "./to-extraction";

export type CrearExtraccionResult =
  | { ok: true; id: ExtraccionId }
  | { ok: false; error: "timeout" | "provider" };

export async function crearExtraccion(
  userId: UserId,
  mensaje: MensajeUsuario,
): Promise<CrearExtraccionResult> {
  return ejecutar(userId, mensaje, buildPrompt(mensaje));
}

export async function crearAclaracion(
  userId: UserId,
  parentId: ExtraccionId,
  mensaje: MensajeUsuario,
  aclaracion: MensajeUsuario,
): Promise<CrearExtraccionResult | { ok: false; error: "invalid_body" }> {
  const textoEntrada = mensajeUsuarioSchema.safeParse(`${mensaje}\n\nAclaración:\n${aclaracion}`);
  if (!textoEntrada.success) {
    return { ok: false, error: "invalid_body" };
  }
  return ejecutar(userId, textoEntrada.data, buildPrompt(mensaje, aclaracion), parentId);
}

async function ejecutar(
  userId: UserId,
  textoEntrada: MensajeUsuario,
  prompt: ReturnType<typeof buildPrompt>,
  parentId?: ExtraccionId,
): Promise<CrearExtraccionResult> {
  const provider = crearProveedor(loadConfig());
  const started = Date.now();
  const invocacion = await invokeModel(provider, prompt);
  const duracionMs = Date.now() - started;

  if (!invocacion.ok) {
    logLlamada({
      userId,
      extractionId: null,
      promptVersion: prompt.version,
      modelId: invocacion.modelId,
      tokensEntrada: 0,
      tokensSalida: 0,
      duracionMs,
      status: invocacion.error,
    });
    return { ok: false, error: invocacion.error };
  }

  const parsed = toExtraction(invocacion.objeto);
  const id = await insertExtraccion({
    userId,
    textoEntrada,
    estado: parsed.ok ? "completada" : "fallida",
    salida: parsed.ok ? parsed.extraccion : null,
    errorSchema: parsed.ok ? null : parsed.errorSchema,
    promptVersion: prompt.version,
    modelId: invocacion.modelId,
    tokensEntrada: invocacion.tokensEntrada,
    tokensSalida: invocacion.tokensSalida,
    duracionMs,
    parentId,
  });

  logLlamada({
    userId,
    extractionId: id,
    promptVersion: prompt.version,
    modelId: invocacion.modelId,
    tokensEntrada: invocacion.tokensEntrada,
    tokensSalida: invocacion.tokensSalida,
    duracionMs,
    status: parsed.ok ? "completada" : "fallida",
  });

  return { ok: true, id };
}
