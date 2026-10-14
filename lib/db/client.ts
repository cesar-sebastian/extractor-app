import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadConfig } from "../config";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

export function openDatabase(databaseUrl: string): {
  db: Database;
  close: () => Promise<void>;
} {
  const sql = postgres(databaseUrl, { max: 1 });
  return {
    db: drizzle(sql, { schema }),
    close: () => sql.end({ timeout: 5 }),
  };
}

const databaseGlobal = globalThis as typeof globalThis & { extractorDatabase?: Database };

export function getDatabase(): Database {
  if (!databaseGlobal.extractorDatabase) {
    databaseGlobal.extractorDatabase = openDatabase(loadConfig().databaseUrl).db;
  }
  return databaseGlobal.extractorDatabase;
}
