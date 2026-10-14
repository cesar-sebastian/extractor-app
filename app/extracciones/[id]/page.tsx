import { LogoutForm } from "@/components/logout-form";
import { ExtraccionDetail } from "@/components/extraccion-detail";
import { requireUser } from "@/lib/auth/current-user";
import { findExtraccion } from "@/lib/db/extracciones";
import { extraccionIdSchema } from "@/lib/ids";

export default async function ExtraccionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const parsed = extraccionIdSchema.safeParse(id);
  const extraccion = parsed.success ? await findExtraccion(user.id, parsed.data) : null;

  return (
    <main className="page">
      <header className="bar">
        <div>
          <h1>Extracción</h1>
          <p>{user.email}</p>
        </div>
        <LogoutForm />
      </header>
      <p>
        <a href="/">Volver</a>
      </p>
      {extraccion ? (
        <ExtraccionDetail extraccion={extraccion} />
      ) : (
        <p className="error">No está esta extracción.</p>
      )}
    </main>
  );
}
