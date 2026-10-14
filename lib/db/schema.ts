import { type AnyPgColumn, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Extraccion } from "../extraction/extraccion";
import type { ExtraccionId, UserId } from "../ids";

export const estadoExtraccion = pgEnum("estado_extraccion", ["completada", "fallida"]);

export const users = pgTable("users", {
  id: uuid("id").$type<UserId>().primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const extracciones = pgTable(
  "extracciones",
  {
    id: uuid("id").$type<ExtraccionId>().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    parentId: uuid("parent_id")
      .$type<ExtraccionId | null>()
      .references((): AnyPgColumn => extracciones.id, { onDelete: "restrict" }),
    // Null after the 30-day retention wipe. A new row must still send the text.
    textoEntrada: text("texto_entrada"),
    salida: jsonb("salida").$type<Extraccion | null>(),
    estado: estadoExtraccion("estado").notNull(),
    errorSchema: text("error_schema"),
    promptVersion: text("prompt_version").notNull(),
    modelId: text("model_id").notNull(),
    tokensEntrada: integer("tokens_entrada").notNull(),
    tokensSalida: integer("tokens_salida").notNull(),
    duracionMs: integer("duracion_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("extracciones_user_id_created_at_idx").on(table.userId, table.createdAt)],
);
