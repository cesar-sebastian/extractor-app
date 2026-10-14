import type { BuiltPrompt } from "./build-prompt";
import type { ModelProvider, SuccessfulInvocation } from "./provider";

// Whole word on both ends: "order 1234" or "reorder 123" must not match,
// or the mock would report an order number the text does not contain.
const FIXED_ORDER = /\border\s+123\b/i;

export class MockProvider implements ModelProvider {
  readonly id = "mock";

  invoke(prompt: BuiltPrompt): Promise<SuccessfulInvocation> {
    const hasOrder = FIXED_ORDER.test(prompt.prompt);
    return Promise.resolve({
      modelId: this.id,
      inputTokens: 0,
      outputTokens: 0,
      value: {
        summary: hasOrder
          ? "The customer is asking about order 123."
          : "The customer wrote a support message.",
        category: hasOrder ? "shipping" : "other",
        urgency: "medium",
        request: hasOrder ? "Review order 123" : null,
        orderNumber: hasOrder ? "123" : null,
        confidence: hasOrder ? "high" : "low",
        uncertainties: hasOrder ? [] : ["No order number appears in the message"],
      },
    });
  }
}
