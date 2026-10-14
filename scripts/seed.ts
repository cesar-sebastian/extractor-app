import "dotenv/config";
import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/auth/password";
import { loadConfig } from "../lib/config";
import { openDatabase } from "../lib/db/client";
import { users } from "../lib/db/schema";

async function seed(): Promise<void> {
  const config = loadConfig();
  const { db, close } = openDatabase(config.databaseUrl);

  try {
    const email = config.demoEmail.toLowerCase();
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const alreadyThere = existing[0];
    if (alreadyThere) {
      console.log(`seed: el usuario demo ya existe (${alreadyThere.id})`);
      return;
    }

    const inserted = await db
      .insert(users)
      .values({
        email,
        passwordHash: await hashPassword(config.demoPassword),
      })
      .returning({ id: users.id });

    const created = inserted[0];
    if (!created) {
      throw new Error("seed: la base no devolvió el usuario insertado");
    }

    console.log(`seed: usuario demo creado (${created.id})`);
  } finally {
    await close();
  }
}

seed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "seed failed";
  console.error(message);
  process.exit(1);
});
