import { loadConfig } from "../config";
import { insertExtraction } from "../db/extractions";
import type { ExtractionId, UserId } from "../ids";
import { logCall } from "@/lib/log";
import { buildPrompt, type BuiltPrompt } from "./build-prompt";
import { createProvider } from "./create-provider";
import { invokeModel } from "./invoke-model";
import { userMessageSchema, type UserMessage } from "./message";
import { toExtraction } from "./to-extraction";

export type CreateExtractionResult =
  | { ok: true; id: ExtractionId }
  | { ok: false; error: "timeout" | "provider" };

export async function createExtraction(
  userId: UserId,
  message: UserMessage,
): Promise<CreateExtractionResult> {
  return run(userId, message, buildPrompt(message));
}

export async function createClarification(
  userId: UserId,
  parentId: ExtractionId,
  message: UserMessage,
  clarification: UserMessage,
): Promise<CreateExtractionResult | { ok: false; error: "invalid_body" }> {
  const stored = userMessageSchema.safeParse(`${message}\n\nClarification:\n${clarification}`);
  if (!stored.success) {
    return { ok: false, error: "invalid_body" };
  }
  return run(userId, stored.data, buildPrompt(message, clarification), parentId);
}

async function run(
  userId: UserId,
  inputText: UserMessage,
  prompt: BuiltPrompt,
  parentId?: ExtractionId,
): Promise<CreateExtractionResult> {
  const provider = createProvider(loadConfig());
  const started = Date.now();
  const invocation = await invokeModel(provider, prompt);
  const durationMs = Date.now() - started;

  if (!invocation.ok) {
    logCall({
      userId,
      extractionId: null,
      promptVersion: prompt.version,
      modelId: invocation.modelId,
      inputTokens: 0,
      outputTokens: 0,
      durationMs,
      status: invocation.error,
    });
    return { ok: false, error: invocation.error };
  }

  const parsed = toExtraction(invocation.value);
  const id = await insertExtraction({
    userId,
    inputText,
    status: parsed.ok ? "completed" : "failed",
    output: parsed.ok ? parsed.extraction : null,
    errorSchema: parsed.ok ? null : parsed.errorSchema,
    promptVersion: prompt.version,
    modelId: invocation.modelId,
    inputTokens: invocation.inputTokens,
    outputTokens: invocation.outputTokens,
    durationMs,
    parentId,
  });

  logCall({
    userId,
    extractionId: id,
    promptVersion: prompt.version,
    modelId: invocation.modelId,
    inputTokens: invocation.inputTokens,
    outputTokens: invocation.outputTokens,
    durationMs,
    status: parsed.ok ? "completed" : "failed",
  });

  return { ok: true, id };
}
