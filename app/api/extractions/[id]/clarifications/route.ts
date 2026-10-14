import { getCurrentUser } from "@/lib/auth/current-user";
import { findExtraction } from "@/lib/db/extractions";
import { createClarification } from "@/lib/extraction/create-extraction";
import { prepareMessage } from "@/lib/extraction/message";
import { takeSlot } from "@/lib/extraction/rate-limit";
import { readJson, textFromBody } from "@/lib/http/read-json";
import { extractionIdSchema } from "@/lib/ids";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  const parentId = extractionIdSchema.safeParse(id);
  if (!parentId.success) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const parent = await findExtraction(user.id, parentId.data);
  if (!parent) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const original = prepareMessage(parent.inputText);
  if (!original.ok) {
    return Response.json({ error: "missing_text" }, { status: 409 });
  }

  const body = await readJson(request);
  if (!body.ok) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const clarification = prepareMessage(textFromBody(body.value));
  if (!clarification.ok) {
    return Response.json({ error: clarification.error }, { status: 400 });
  }

  const combined = prepareMessage(`${original.message}\n\nClarification:\n${clarification.message}`);
  if (!combined.ok) {
    return Response.json({ error: combined.error }, { status: 400 });
  }

  if (!takeSlot(user.id)) {
    return Response.json({ error: "rate_limit" }, { status: 429 });
  }

  const result = await createClarification(
    user.id,
    parent.id,
    original.message,
    clarification.message,
  );
  if (!result.ok) {
    const status = result.error === "timeout" ? 504 : result.error === "invalid_body" ? 400 : 502;
    return Response.json({ error: result.error }, { status });
  }

  return Response.json({ id: result.id });
}
