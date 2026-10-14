import { ExtractionDraftForm } from "@/components/extraction-draft-form";
import { LogoutForm } from "@/components/logout-form";
import { requireUser } from "@/lib/auth/current-user";
import { listExtractions } from "@/lib/db/extractions";

export default async function HomePage() {
  const user = await requireUser();
  const items = await listExtractions(user.id);

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
        <h2>Extractions</h2>
        {items.length === 0 ? (
          <p className="empty">No extractions yet.</p>
        ) : (
          <ul className="list">
            {items.map((item) => (
              <li key={item.id}>
                <a href={`/extractions/${item.id}`}>
                  {item.createdAt.toLocaleString("en")} · {item.status}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
