import { redirect } from "next/navigation";
import { readSessionUserId } from "./session";
import { findUserById, type PublicUser } from "./users";

export async function getCurrentUser(): Promise<PublicUser | null> {
  const userId = await readSessionUserId();
  if (!userId) {
    return null;
  }
  return findUserById(userId);
}

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
