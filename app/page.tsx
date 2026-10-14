import { ExtractionDraftForm } from "@/components/extraction-draft-form";
import { LogoutForm } from "@/components/logout-form";
import { requireUser } from "@/lib/auth/current-user";
import { listExtracciones } from "@/lib/db/extracciones";

export default async function HomePage() {
  const user = await requireUser();
  const items = await listExtracciones(user.id);

  return (
    <main className="page">
      <header className="bar">
        <div>
          <h1>Extractor</h1>
          <p>{user.email}</p>
        </div>
        <LogoutForm />
      </header>
      <ExtractionDraftForm />
      <section className="stack">
        <h2>Extracciones</h2>
        {items.length === 0 ? (
          <p className="empty">Todavía no hay extracciones.</p>
        ) : (
          <ul className="list">
            {items.map((item) => (
              <li key={item.id}>
                <a href={`/extracciones/${item.id}`}>
                  {item.createdAt.toLocaleString("es")} · {item.estado}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
