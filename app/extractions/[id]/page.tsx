import { ExtractionDetail } from "@/components/extraction-detail";
import { LogoutForm } from "@/components/logout-form";
import { requireUser } from "@/lib/auth/current-user";
import { findExtraction } from "@/lib/db/extractions";
import { extractionIdSchema } from "@/lib/ids";

export default async function ExtractionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const parsed = extractionIdSchema.safeParse(id);
  const extraction = parsed.success ? await findExtraction(user.id, parsed.data) : null;

  return (
    <main className="page">
      <header className="bar">
        <div>
          <h1>Extraction</h1>
          <p>{user.email}</p>
        </div>
        <LogoutForm />
      </header>
      <p>
        <a href="/">Back</a>
      </p>
      {extraction ? (
        <ExtractionDetail extraction={extraction} />
      ) : (
        <p className="error">This extraction is not here.</p>
      )}
    </main>
  );
}
