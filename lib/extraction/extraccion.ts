import { z } from "zod";

export const categoriaSchema = z.enum([
  "facturacion",
  "envio",
  "producto",
  "cuenta",
  "otro",
]);

export const urgenciaSchema = z.enum(["baja", "media", "alta"]).brand("Urgencia");
export const confianzaSchema = z.enum(["baja", "media", "alta"]).brand("Confianza");

export const extraccionSchema = z.object({
  resumen: z.string(),
  categoria: categoriaSchema,
  urgencia: urgenciaSchema,
  pedido: z.string().nullable(),
  numeroDeOrden: z.string().nullable(),
  confianza: confianzaSchema,
  incertidumbres: z.array(z.string()),
});

export type Categoria = z.infer<typeof categoriaSchema>;
export type Urgencia = z.infer<typeof urgenciaSchema>;
export type Confianza = z.infer<typeof confianzaSchema>;
export type Extraccion = z.infer<typeof extraccionSchema>;
