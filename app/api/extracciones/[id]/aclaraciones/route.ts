import { getCurrentUser } from "@/lib/auth/current-user";
import { findExtraccion } from "@/lib/db/extracciones";
import { crearAclaracion } from "@/lib/extraction/crear-extraccion";
import { prepararMensaje } from "@/lib/extraction/mensaje";
import { tomarCupo } from "@/lib/extraction/rate-limit";
import { readJson, textoDelBody } from "@/lib/http/read-json";
import { extraccionIdSchema } from "@/lib/ids";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  const parentId = extraccionIdSchema.safeParse(id);
  if (!parentId.success) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const parent = await findExtraccion(user.id, parentId.data);
  if (!parent) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const original = prepararMensaje(parent.textoEntrada);
  if (!original.ok) {
    return Response.json({ error: "sin_texto" }, { status: 409 });
  }

  const body = await readJson(request);
  if (!body.ok) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const aclaracion = prepararMensaje(textoDelBody(body.value));
  if (!aclaracion.ok) {
    return Response.json({ error: aclaracion.error }, { status: 400 });
  }

  const junto = prepararMensaje(`${original.mensaje}\n\nAclaración:\n${aclaracion.mensaje}`);
  if (!junto.ok) {
    return Response.json({ error: junto.error }, { status: 400 });
  }

  if (!tomarCupo(user.id)) {
    return Response.json({ error: "rate_limit" }, { status: 429 });
  }

  const result = await crearAclaracion(user.id, parent.id, original.mensaje, aclaracion.mensaje);
  if (!result.ok) {
    const status = result.error === "timeout" ? 504 : result.error === "invalid_body" ? 400 : 502;
    return Response.json({ error: result.error }, { status });
  }

  return Response.json({ id: result.id });
}