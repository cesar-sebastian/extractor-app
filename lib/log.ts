import pino from "pino";

const level = process.env.LOG_LEVEL?.trim() || "info";

const logger = pino({ level });

export type EstadoLlamada = "completada" | "fallida" | "timeout" | "provider";

// The only shape a model call is allowed to log. The message and the summary
// are not fields here, so they cannot be written by accident.
export type LogLlamada = {
  userId: string;
  extractionId: string | null;
  promptVersion: string;
  modelId: string;
  tokensEntrada: number;
  tokensSalida: number;
  duracionMs: number;
  status: EstadoLlamada;
};

export function logLlamada(event: LogLlamada): void {
  logger.info(
    {
      userId: event.userId,
      extractionId: event.extractionId,
      promptVersion: event.promptVersion,
      modelId: event.modelId,
      tokensEntrada: event.tokensEntrada,
      tokensSalida: event.tokensSalida,
      duracionMs: event.duracionMs,
      status: event.status,
    },
    "extraccion",
  );
}

export function logRetencion(borradas: number, retencionDias: number): void {
  logger.info({ borradas, retencionDias }, "retencion");
}
