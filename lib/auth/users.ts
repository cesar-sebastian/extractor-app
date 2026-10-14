import { eq } from "drizzle-orm";
import { getDatabase } from "../db/client";
import { users } from "../db/schema";
import type { UserId } from "../ids";

export type PublicUser = {
  id: UserId;
  email: string;
};

export type CredentialUser = PublicUser & {
  passwordHash: string;
};

export async function findUserByEmail(email: string): Promise<CredentialUser | null> {
  const rows = await getDatabase()
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return rows[0] ?? null;
}

export async function findUserById(id: UserId): Promise<PublicUser | null> {
  const rows = await getDatabase()
    .select({
      id: users.id,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return rows[0] ?? null;
}
