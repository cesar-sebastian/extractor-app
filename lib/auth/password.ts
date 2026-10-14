import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

// scrypt is slow on purpose. The async version runs it on the libuv thread
// pool, so a login does not block every other request on the event loop.
function deriveKey(
  plain: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(plain, salt, keyLength, options, (error, derived) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derived);
    });
  });
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await deriveKey(plain, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [algorithm, nRaw, rRaw, pRaw, saltRaw, hashRaw] = stored.split("$");
  if (algorithm !== "scrypt" || saltRaw === undefined || hashRaw === undefined) {
    return false;
  }

  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  const salt = Buffer.from(saltRaw, "base64url");
  const expected = Buffer.from(hashRaw, "base64url");
  const derived = await deriveKey(plain, salt, expected.length, { N: n, r, p });
  if (derived.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(derived, expected);
}

// Hashed once, on first use. A login with an unknown email still pays one
// scrypt, so it takes as long as a wrong password for a real user.
let dummyPasswordHash: Promise<string> | undefined;

export function getDummyPasswordHash(): Promise<string> {
  dummyPasswordHash ??= hashPassword("dummy-password-not-used");
  return dummyPasswordHash;
}
