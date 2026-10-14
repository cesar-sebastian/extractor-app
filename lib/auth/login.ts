import { z } from "zod";
import { clearFailures, loginBlocked, recordFailure } from "./login-attempts";
import { getDummyPasswordHash, verifyPassword } from "./password";
import { writeSession } from "./session";
import { findUserByEmail } from "./users";

export const loginBodySchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

export type LoginResult =
  | { ok: true }
  | { ok: false; error: "invalid_credentials" | "too_many_attempts" };

export async function login(email: string, password: string): Promise<LoginResult> {
  // Checked before the lookup and counted for unknown emails too, so the
  // limit does not reveal which emails exist.
  if (loginBlocked(email)) {
    return { ok: false, error: "too_many_attempts" };
  }

  const user = await findUserByEmail(email);
  const matches = await verifyPassword(password, user?.passwordHash ?? (await getDummyPasswordHash()));
  if (!user || !matches) {
    recordFailure(email);
    return { ok: false, error: "invalid_credentials" };
  }

  clearFailures(email);
  await writeSession(user.id);
  return { ok: true };
}
