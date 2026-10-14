import type { AppConfig } from "../config";
import { AnthropicProvider } from "./anthropic-provider";
import { MockProvider } from "./mock-provider";
import type { ModelProvider } from "./provider";

export function createProvider(config: AppConfig): ModelProvider {
  if (config.llmProvider === "anthropic") {
    return new AnthropicProvider(config.llmModel);
  }
  return new MockProvider();
}
