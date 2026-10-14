import type { BuiltPrompt } from "./build-prompt";

export type SuccessfulInvocation = {
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  value: unknown;
};

export interface ModelProvider {
  readonly id: string;
  invoke(prompt: BuiltPrompt, signal: AbortSignal): Promise<SuccessfulInvocation>;
}
