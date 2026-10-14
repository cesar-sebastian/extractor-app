import pino from "pino";

const level = process.env.LOG_LEVEL?.trim() || "info";

const logger = pino({ level });

export type CallStatus = "completed" | "failed" | "timeout" | "provider";

// The only shape a model call is allowed to log. The message and the summary
// are not fields here, so they cannot be written by accident.
export type CallLog = {
  userId: string;
  extractionId: string | null;
  promptVersion: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  status: CallStatus;
};

export function logCall(event: CallLog): void {
  logger.info(
    {
      userId: event.userId,
      extractionId: event.extractionId,
      promptVersion: event.promptVersion,
      modelId: event.modelId,
      inputTokens: event.inputTokens,
      outputTokens: event.outputTokens,
      durationMs: event.durationMs,
      status: event.status,
    },
    "extraction",
  );
}

export function logRetention(wiped: number, retentionDays: number): void {
  logger.info({ wiped, retentionDays }, "retention");
}
