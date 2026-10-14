import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { loadConfig } from "./lib/config";

const config = loadConfig();

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: config.databaseMigrationUrl,
  },
});
