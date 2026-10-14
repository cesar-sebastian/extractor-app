import { z } from "zod";

const postgresUrlSchema = z.string().refine(
  (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "postgres:" || url.protocol === "postgresql:";
    } catch {
      return false;
    }
  },
  { message: "debe ser una URL postgres://" },
);

const envSchema = z.object({
  DATABASE_URL: postgresUrlSchema,
  DATABASE_MIGRATION_URL: postgresUrlSchema,
  DEMO_EMAIL: z.email(),
  DEMO_PASSWORD: z.string().min(8),
  AUTH_SECRET: z.string().min(32),
  LLM_PROVIDER: z.enum(["mock", "anthropic"]).optional(),
  LLM_MODEL: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
});

export type LlmProviderName = "mock" | "anthropic";

export type AppConfig = {
  databaseUrl: string;
  databaseMigrationUrl: string;
  demoEmail: string;
  demoPassword: string;
  authSecret: string;
  llmProvider: LlmProviderName;
  llmModel: string;
  anthropicApiKey: string | null;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse({
    ...env,
    ANTHROPIC_API_KEY: blankToUndefined(env.ANTHROPIC_API_KEY),
    LLM_PROVIDER: blankToUndefined(env.LLM_PROVIDER),
    LLM_MODEL: blankToUndefined(env.LLM_MODEL),
  });
  if (!parsed.success) {
    const fields = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Configuración inválida: ${fields}`);
  }

  const anthropicApiKey = parsed.data.ANTHROPIC_API_KEY ?? null;
  const llmProvider = parsed.data.LLM_PROVIDER ?? (anthropicApiKey ? "anthropic" : "mock");
  if (llmProvider === "anthropic" && !anthropicApiKey) {
    throw new Error("Configuración inválida: ANTHROPIC_API_KEY");
  }

  return {
    databaseUrl: parsed.data.DATABASE_URL,
    databaseMigrationUrl: parsed.data.DATABASE_MIGRATION_URL,
    demoEmail: parsed.data.DEMO_EMAIL,
    demoPassword: parsed.data.DEMO_PASSWORD,
    authSecret: parsed.data.AUTH_SECRET,
    llmProvider,
    llmModel: parsed.data.LLM_MODEL ?? "claude-haiku-5-5",
    anthropicApiKey,
  };
}

function blankToUndefined(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }
  return value;
}
