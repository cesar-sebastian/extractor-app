import { z } from "zod";
import { MAX_MENSAJE_CARACTERES } from "./limits";

export const mensajeUsuarioSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_MENSAJE_CARACTERES)
  .brand("MensajeUsuario");

export type MensajeUsuario = z.infer<typeof mensajeUsuarioSchema>;

export function prepararMensaje(
  texto: unknown,
): { ok: true; mensaje: MensajeUsuario } | { ok: false; error: "invalid_body" } {
  const parsed = mensajeUsuarioSchema.safeParse(texto);
  if (!parsed.success) {
    return { ok: false, error: "invalid_body" };
  }
  return { ok: true, mensaje: parsed.data };
}
