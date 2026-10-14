import { type AnyPgColumn, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Extraction } from "../extraction/extraction";
import type { ExtractionId, UserId } from "../ids";

export const extractionStatus = pgEnum("extraction_status", ["completed", "failed"]);

export const users = pgTable("users", {
  id: uuid("id").$type<UserId>().primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const extractions = pgTable(
  "extractions",
  {
    id: uuid("id").$type<ExtractionId>().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    parentId: uuid("parent_id")
      .$type<ExtractionId | null>()
      .references((): AnyPgColumn => extractions.id, { onDelete: "restrict" }),
    // Null after the 30-day retention wipe. A new row must still send the text.
    inputText: text("input_text"),
    output: jsonb("output").$type<Extraction | null>(),
    status: extractionStatus("status").notNull(),
    errorSchema: text("error_schema"),
    promptVersion: text("prompt_version").notNull(),
    modelId: text("model_id").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    durationMs: integer("duration_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("extractions_user_id_created_at_idx").on(table.userId, table.createdAt)],
);
