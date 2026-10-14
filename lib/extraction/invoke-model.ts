import type { BuiltPrompt } from "./build-prompt";
import { MODEL_TIMEOUT_MS } from "./limits";
import type { ModelProvider, SuccessfulInvocation } from "./provider";

export type Invocation =
  | ({ ok: true } & SuccessfulInvocation)
  | { ok: false; error: "timeout" | "provider"; modelId: string };

export async function invokeModel(provider: ModelProvider, prompt: BuiltPrompt): Promise<Invocation> {
  try {
    const result = await provider.invoke(prompt, AbortSignal.timeout(MODEL_TIMEOUT_MS));
    return { ok: true, ...result };
  } catch (error) {
    if (isTimeout(error)) {
      return { ok: false, error: "timeout", modelId: provider.id };
    }
    return { ok: false, error: "provider", modelId: provider.id };
  }
}

function isTimeout(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  if (error.name === "TimeoutError" || error.name === "AbortError") {
    return true;
  }
  return isTimeout(error.cause);
}
