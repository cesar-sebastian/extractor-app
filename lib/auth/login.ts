import { z } from "zod";
import { dummyPasswordHash, verifyPassword } from "./password";
import { writeSession } from "./session";
import { findUserByEmail } from "./users";

export const loginBodySchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

export type LoginResult = { ok: true } | { ok: false; error: "invalid_credentials" };

export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await findUserByEmail(email);
  const matches = verifyPassword(password, user?.passwordHash ?? dummyPasswordHash);
  if (!user || !matches) {
    return { ok: false, error: "invalid_credentials" };
  }

  await writeSession(user.id);
  return { ok: true };
}
