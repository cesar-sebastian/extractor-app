import "dotenv/config";
import { loadConfig } from "../lib/config";
import { openDatabase } from "../lib/db/client";
import { RETENTION_DAYS } from "../lib/extraction/limits";
import { logRetention } from "../lib/log";
import { wipeExpiredText } from "../lib/retention/wipe-expired-text";

async function retain(): Promise<void> {
  const config = loadConfig();
  const { db, close } = openDatabase(config.databaseUrl);

  try {
    const wiped = await wipeExpiredText(db);
    logRetention(wiped, RETENTION_DAYS);
  } finally {
    await close();
  }
}

retain().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "retain failed";
  console.error(message);
  process.exit(1);
});
