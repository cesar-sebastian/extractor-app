import { loadConfig } from "../config";
import { insertExtraccion } from "../db/extracciones";
import type { UserId, ExtraccionId } from "../ids";
import { buildPrompt } from "./build-prompt";
import { crearProveedor } from "./crear-proveedor";
import { invokeModel } from "./invoke-model";
import type { MensajeUsuario } from "./mensaje";
import { toExtraction } from "./to-extraction";

export type CrearExtraccionResult =
  | { ok: true; id: ExtraccionId }
  | { ok: false; error: "timeout" | "provider" };

export async function crearExtraccion(
  userId: UserId,
  mensaje: MensajeUsuario,
): Promise<CrearExtraccionResult> {
  const prompt = buildPrompt(mensaje);
  const provider = crearProveedor(loadConfig());
  const started = Date.now();
  const invocacion = await invokeModel(provider, prompt);
  const duracionMs = Date.now() - started;

  if (!invocacion.ok) {
    return { ok: false, error: invocacion.error };
  }

  const parsed = toExtraction(invocacion.objeto);
  const id = await insertExtraccion({
    userId,
    textoEntrada: mensaje,
    estado: parsed.ok ? "completada" : "fallida",
    salida: parsed.ok ? parsed.extraccion : null,
    errorSchema: parsed.ok ? null : parsed.errorSchema,
    promptVersion: prompt.version,
    modelId: invocacion.modelId,
    tokensEntrada: invocacion.tokensEntrada,
    tokensSalida: invocacion.tokensSalida,
    duracionMs,
  });

  return { ok: true, id };
}
