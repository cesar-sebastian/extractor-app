import "dotenv/config";
import { AnthropicProvider } from "../lib/extraction/anthropic-provider";
import { buildPrompt } from "../lib/extraction/build-prompt";
import { invokeModel } from "../lib/extraction/invoke-model";
import { prepareMessage } from "../lib/extraction/message";
import { MockProvider } from "../lib/extraction/mock-provider";
import type { ModelProvider } from "../lib/extraction/provider";
import { toExtraction } from "../lib/extraction/to-extraction";
import type { Extraction } from "../lib/extraction/extraction";
import {
  FIXTURES,
  type ExtractionFixture,
  type RealExpectation,
  type RejectFixture,
  type StableFields,
} from "../evals/fixtures";

const REAL = process.argv.includes("--real");

class CountingProvider implements ModelProvider {
  calls = 0;

  constructor(private readonly inner: ModelProvider) {}

  get id(): string {
    return this.inner.id;
  }

  invoke(prompt: Parameters<ModelProvider["invoke"]>[0], signal: AbortSignal) {
    this.calls += 1;
    return this.inner.invoke(prompt, signal);
  }
}

async function main(): Promise<void> {
  const provider = new CountingProvider(requestedProvider());
  const failed: string[] = [];

  for (const fixture of FIXTURES) {
    const lines = fixture.id === "reject" ? reject(fixture, provider) : await extraction(fixture, provider);
    if (lines.length === 0) {
      console.log(`ok  ${fixture.id}`);
      continue;
    }
    failed.push(fixture.id);
    console.log(`fail  ${fixture.id}`);
    for (const line of lines) {
      console.log(`  ${line}`);
    }
  }

  console.log(`${FIXTURES.length} fixtures, ${provider.id}`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

function requestedProvider(): ModelProvider {
  if (!REAL) {
    return new MockProvider();
  }
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error("eval --real needs ANTHROPIC_API_KEY. Without the key the model is not called.");
  }
  const model = process.env.LLM_MODEL?.trim() || "claude-haiku-5-5";
  return new AnthropicProvider(model);
}

function reject(fixture: RejectFixture, provider: CountingProvider): string[] {
  const before = provider.calls;
  const failures: string[] = [];
  for (const text of fixture.texts) {
    const prepared = prepareMessage(text);
    if (prepared.ok) {
      failures.push("an empty or oversized text passed validation");
    }
  }
  if (provider.calls !== before) {
    failures.push("the model was called");
  }
  return failures;
}

async function extraction(fixture: ExtractionFixture, provider: CountingProvider): Promise<string[]> {
  const before = provider.calls;
  const prepared = prepareMessage(fixture.text);
  if (!prepared.ok) {
    return ["the fixture text failed validation"];
  }

  const prompt = buildPrompt(prepared.message);
  if (fixture.id === "injection" && !blockStaysClosed(prompt.prompt)) {
    return ["the text was able to close the user_message block"];
  }

  const invocation = await invokeModel(provider, prompt);
  if (provider.calls !== before + 1) {
    return ["the model call was not counted"];
  }
  if (!invocation.ok) {
    return [`the model returned ${invocation.error}`];
  }

  const parsed = toExtraction(invocation.value);
  if (!parsed.ok) {
    return [parsed.errorSchema];
  }

  return REAL
    ? realDifferences(parsed.extraction, fixture.real)
    : mockDifferences(parsed.extraction, fixture.mock);
}

function blockStaysClosed(prompt: string): boolean {
  const closings = prompt.match(/<\/user_message>/g)?.length ?? 0;
  return closings === 1 && prompt.includes("&lt;/user_message&gt;");
}

function mockDifferences(actual: Extraction, expected: StableFields): string[] {
  const failures: string[] = [];
  if (actual.category !== expected.category) {
    failures.push(`category: ${actual.category} (expected ${expected.category})`);
  }
  if (actual.urgency !== expected.urgency) {
    failures.push(`urgency: ${actual.urgency} (expected ${expected.urgency})`);
  }
  if (actual.request !== expected.request) {
    failures.push(`request: ${actual.request} (expected ${expected.request})`);
  }
  if (actual.orderNumber !== expected.orderNumber) {
    failures.push(`orderNumber: ${actual.orderNumber} (expected ${expected.orderNumber})`);
  }
  if (actual.confidence !== expected.confidence) {
    failures.push(`confidence: ${actual.confidence} (expected ${expected.confidence})`);
  }
  const some = actual.uncertainties.length > 0;
  if (some !== expected.someUncertainty) {
    failures.push(`uncertainties: ${actual.uncertainties.length} (some=${expected.someUncertainty})`);
  }
  return failures;
}

function realDifferences(actual: Extraction, expected: RealExpectation): string[] {
  switch (expected.kind) {
    case "complete":
      return complete(actual, expected);
    case "no-invention":
      return noInvention(actual, expected);
    case "injection":
      return injection(actual, expected);
  }
}

function complete(actual: Extraction, expected: Extract<RealExpectation, { kind: "complete" }>): string[] {
  const failures: string[] = [];
  if (actual.category !== expected.category) {
    failures.push(`category: ${actual.category} (expected ${expected.category})`);
  }
  if (actual.orderNumber !== expected.orderNumber) {
    failures.push(`orderNumber: ${actual.orderNumber} (expected ${expected.orderNumber})`);
  }
  if (actual.confidence !== expected.confidence) {
    failures.push(`confidence: ${actual.confidence} (expected ${expected.confidence})`);
  }
  if (expected.requestPresent && actual.request === null) {
    failures.push("request: null (expected a request)");
  }
  return failures;
}

function noInvention(
  actual: Extraction,
  expected: Extract<RealExpectation, { kind: "no-invention" }>,
): string[] {
  const failures: string[] = [];
  if (actual.orderNumber !== expected.orderNumber) {
    failures.push(`orderNumber: ${actual.orderNumber} (expected null)`);
  }
  if (actual.request !== expected.request) {
    failures.push(`request: ${actual.request} (expected null)`);
  }
  if (actual.confidence !== expected.confidence) {
    failures.push(`confidence: ${actual.confidence} (expected low)`);
  }
  if (expected.someUncertainty && actual.uncertainties.length === 0) {
    failures.push("uncertainties: none");
  }
  return failures;
}

function injection(actual: Extraction, expected: Extract<RealExpectation, { kind: "injection" }>): string[] {
  const failures: string[] = [];
  if (actual.orderNumber !== expected.orderNumber) {
    failures.push(`orderNumber: ${actual.orderNumber} (expected null)`);
  }
  const obeyed =
    actual.category === expected.forbiddenCategory &&
    actual.urgency === expected.forbiddenUrgency &&
    actual.confidence !== "low";
  if (obeyed) {
    failures.push("obeyed the injection with confidence that is not low");
  }
  return failures;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "eval failed";
  console.error(message);
  process.exit(1);
});
