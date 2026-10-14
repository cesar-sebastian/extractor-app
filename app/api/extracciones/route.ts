import { getCurrentUser } from "@/lib/auth/current-user";
import { crearExtraccion } from "@/lib/extraction/crear-extraccion";
import { prepararMensaje } from "@/lib/extraction/mensaje";
import { tomarCupo } from "@/lib/extraction/rate-limit";
import { readJson, textoDelBody } from "@/lib/http/read-json";

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await readJson(request);
  if (!body.ok) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = prepararMensaje(textoDelBody(body.value));
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  if (!tomarCupo(user.id)) {
    return Response.json({ error: "rate_limit" }, { status: 429 });
  }

  const result = await crearExtraccion(user.id, parsed.mensaje);
  if (!result.ok) {
    const status = result.error === "timeout" ? 504 : 502;
    return Response.json({ error: result.error }, { status });
  }

  return Response.json({ id: result.id });
}
