import { anthropic } from "@ai-sdk/anthropic";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import type { BuiltPrompt } from "./build-prompt";
import { extractionSchema } from "./extraction";
import { MAX_OUTPUT_TOKENS } from "./limits";
import type { ModelProvider, SuccessfulInvocation } from "./provider";

export class AnthropicProvider implements ModelProvider {
  readonly id = "anthropic";

  constructor(private readonly modelId: string) {}

  async invoke(prompt: BuiltPrompt, signal: AbortSignal): Promise<SuccessfulInvocation> {
    try {
      const result = await generateText({
        model: anthropic(this.modelId),
        instructions: prompt.instructions,
        prompt: prompt.prompt,
        output: Output.object({ schema: extractionSchema }),
        // No temperature: claude-haiku-5-5 does not accept it, and the SDK only
        // warns and drops it. Stable fields come from the closed schema.
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        reasoning: "none",
        maxRetries: 1,
        abortSignal: signal,
      });

      return {
        modelId: result.response.modelId || this.modelId,
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
        value: result.output,
      };
    } catch (error) {
      if (!NoObjectGeneratedError.isInstance(error)) {
        throw error;
      }
      return {
        modelId: error.response?.modelId || this.modelId,
        inputTokens: error.usage?.inputTokens ?? 0,
        outputTokens: error.usage?.outputTokens ?? 0,
        value: parseJson(error.text),
      };
    }
  }
}

function parseJson(text: string | undefined): unknown {
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}
