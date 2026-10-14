import { randomBytes, scrypt } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Same encoding as lib/auth/password.ts. The standalone server does not
// include that module as a script, so boot repeats the format here.
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

const migrationUrl = required("DATABASE_MIGRATION_URL");
const databaseUrl = required("DATABASE_URL");
const email = required("DEMO_EMAIL").toLowerCase();
const password = required("DEMO_PASSWORD");

const migration = await connect(migrationUrl);
try {
  await migrate(drizzle(migration), { migrationsFolder: "/app/drizzle" });
  console.log("bootstrap: migrations applied");
} finally {
  await migration.end({ timeout: 5 });
}

const app = await connect(databaseUrl);
try {
  const hash = await hashPassword(password);
  const inserted = await app`
    insert into users (email, password_hash)
    select ${email}, ${hash}
    where not exists (select 1 from users where email = ${email})
    returning id
  `;
  console.log(inserted.length === 0 ? "bootstrap: demo user already exists" : "bootstrap: demo user created");
} finally {
  await app.end({ timeout: 5 });
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`bootstrap: missing ${name}`);
  }
  return value;
}

async function connect(url) {
  let last = new Error("bootstrap: database unavailable");
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const sql = postgres(url, { max: 1 });
    try {
      await sql`select 1`;
      return sql;
    } catch (error) {
      last = error instanceof Error ? error : last;
      await sql.end({ timeout: 1 }).catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw last;
}

function hashPassword(plain) {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) => {
    scrypt(plain, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }, (error, derived) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(["scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString("base64url"), derived.toString("base64url")].join("$"));
    });
  });
}
