import { login, loginBodySchema } from "@/lib/auth/login";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = loginBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await login(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    const status = result.error === "too_many_attempts" ? 429 : 401;
    return Response.json({ error: result.error }, { status });
  }

  return Response.json({ ok: true });
}
