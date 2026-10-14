import { extraccionSchema, type Extraccion } from "./extraccion";

export type ExtraccionParseada =
  | { ok: true; extraccion: Extraccion }
  | { ok: false; errorSchema: string };

export function toExtraction(objeto: unknown): ExtraccionParseada {
  const parsed = extraccionSchema.safeParse(objeto);
  if (!parsed.success) {
    const fields = parsed.error.issues
      .map((issue) => issue.path.join(".") || "objeto")
      .join(", ");
    return { ok: false, errorSchema: `schema: ${fields}` };
  }
  return { ok: true, extraccion: parsed.data };
}
