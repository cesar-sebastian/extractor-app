import type { PromptArmado } from "./build-prompt";

export type InvocacionExitosa = {
  modelId: string;
  tokensEntrada: number;
  tokensSalida: number;
  objeto: unknown;
};

export interface ModelProvider {
  readonly id: string;
  invoke(prompt: PromptArmado, signal: AbortSignal): Promise<InvocacionExitosa>;
}
