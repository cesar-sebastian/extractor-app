import "dotenv/config";
import { openDatabase } from "../lib/db/client";
import { loadConfig } from "../lib/config";
import { logRetencion } from "../lib/log";
import { borrarTextoVencido } from "../lib/retention/borrar-texto-vencido";
import { RETENTION_DAYS } from "../lib/extraction/limits";

async function retain(): Promise<void> {
  const config = loadConfig();
  const { db, close } = openDatabase(config.databaseUrl);

  try {
    const borradas = await borrarTextoVencido(db);
    logRetencion(borradas, RETENTION_DAYS);
  } finally {
    await close();
  }
}

retain().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "retain failed";
  console.error(message);
  process.exit(1);
});
