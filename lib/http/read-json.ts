const MAX_BODY_BYTES = 16_384;

export async function readJson(
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false }> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return { ok: false };
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return { ok: false };
  }

  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

export function textoDelBody(value: unknown): unknown {
  if (value && typeof value === "object" && "texto" in value) {
    return value.texto;
  }
  return undefined;
}