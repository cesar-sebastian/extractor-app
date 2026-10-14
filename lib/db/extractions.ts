import { and, desc, eq } from "drizzle-orm";
import type { Extraction } from "../extraction/extraction";
import type { ExtractionId, UserId } from "../ids";
import { getDatabase } from "./client";
import { extractions } from "./schema";

export type ExtractionStatus = "completed" | "failed";

export type ExtractionSummary = {
  id: ExtractionId;
  status: ExtractionStatus;
  createdAt: Date;
};

export type ExtractionDetail = ExtractionSummary & {
  inputText: string | null;
  output: Extraction | null;
  errorSchema: string | null;
  promptVersion: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  parentId: ExtractionId | null;
};

export async function insertExtraction(input: {
  userId: UserId;
  inputText: string;
  status: ExtractionStatus;
  output: Extraction | null;
  errorSchema: string | null;
  promptVersion: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  parentId?: ExtractionId;
}): Promise<ExtractionId> {
  const rows = await getDatabase()
    .insert(extractions)
    .values(input)
    .returning({ id: extractions.id });

  const created = rows[0];
  if (!created) {
    throw new Error("the database did not return the extraction");
  }
  return created.id;
}

export async function listExtractions(userId: UserId): Promise<ExtractionSummary[]> {
  return getDatabase()
    .select({
      id: extractions.id,
      status: extractions.status,
      createdAt: extractions.createdAt,
    })
    .from(extractions)
    .where(eq(extractions.userId, userId))
    .orderBy(desc(extractions.createdAt));
}

export async function findExtraction(
  userId: UserId,
  id: ExtractionId,
): Promise<ExtractionDetail | null> {
  const rows = await getDatabase()
    .select({
      id: extractions.id,
      status: extractions.status,
      createdAt: extractions.createdAt,
      inputText: extractions.inputText,
      output: extractions.output,
      errorSchema: extractions.errorSchema,
      promptVersion: extractions.promptVersion,
      modelId: extractions.modelId,
      inputTokens: extractions.inputTokens,
      outputTokens: extractions.outputTokens,
      durationMs: extractions.durationMs,
      parentId: extractions.parentId,
    })
    .from(extractions)
    .where(and(eq(extractions.id, id), eq(extractions.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}
