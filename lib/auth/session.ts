import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { loadConfig } from "../config";
import { userIdSchema, type UserId } from "../ids";

const SESSION_COOKIE = "session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function secretKey(): Uint8Array {
  return new TextEncoder().encode(loadConfig().authSecret);
}

function sessionCookieOptions(maxAge: number): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function signSessionToken(userId: UserId): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function readSessionUserId(): Promise<UserId | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const parsed = userIdSchema.safeParse(payload.sub);
    if (!parsed.success) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export async function writeSession(userId: UserId): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSessionToken(userId), sessionCookieOptions(MAX_AGE_SECONDS));
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", sessionCookieOptions(0));
}
