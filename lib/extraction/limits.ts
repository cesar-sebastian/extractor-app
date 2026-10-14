export const PROMPT_VERSION = "extract-v3";
export const RETENTION_DAYS = 30;

// ECS sets the same name. Without the variable, the code constant is the version
// stored on the row. The instruction text still lives in build-prompt.ts.
export function promptVersion(env: NodeJS.ProcessEnv = process.env): string {
  const value = env.PROMPT_VERSION?.trim();
  return value ? value : PROMPT_VERSION;
}

export const MAX_MENSAJE_CARACTERES = 4_000;
export const MAX_OUTPUT_TOKENS = 512;
export const MODEL_TIMEOUT_MS = 10_000;
export const RATE_LIMIT_PER_HOUR = 10;
