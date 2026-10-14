import { extractionSchema, type Extraction } from "./extraction";

export type ParsedExtraction =
  | { ok: true; extraction: Extraction }
  | { ok: false; errorSchema: string };

export function toExtraction(value: unknown): ParsedExtraction {
  const parsed = extractionSchema.safeParse(value);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".") || "object").join(", ");
    return { ok: false, errorSchema: `schema: ${fields}` };
  }
  return { ok: true, extraction: parsed.data };
}
