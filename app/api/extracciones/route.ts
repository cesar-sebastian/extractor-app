import { getCurrentUser } from "@/lib/auth/current-user";
import { crearExtraccion } from "@/lib/extraction/crear-extraccion";
import { mensajeUsuarioSchema } from "@/lib/extraction/mensaje";
import { tomarCupo } from "@/lib/extraction/rate-limit";

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const texto = body && typeof body === "object" && "texto" in body ? body.texto : undefined;
  const parsed = mensajeUsuarioSchema.safeParse(texto);
  if (!parsed.success) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!tomarCupo(user.id)) {
    return Response.json({ error: "rate_limit" }, { status: 429 });
  }

  const result = await crearExtraccion(user.id, parsed.data);
  if (!result.ok) {
    const status = result.error === "timeout" ? 504 : 502;
    return Response.json({ error: result.error }, { status });
  }

  return Response.json({ id: result.id });
}
