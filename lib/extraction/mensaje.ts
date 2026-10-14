import { z } from "zod";
import { MAX_MENSAJE_CARACTERES } from "./limits";

export const mensajeUsuarioSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_MENSAJE_CARACTERES)
  .brand("MensajeUsuario");

export type MensajeUsuario = z.infer<typeof mensajeUsuarioSchema>;
