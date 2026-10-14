import { z } from "zod";
import { MAX_MESSAGE_CHARS } from "./limits";

export const userMessageSchema = z.string().trim().min(1).max(MAX_MESSAGE_CHARS).brand("UserMessage");

export type UserMessage = z.infer<typeof userMessageSchema>;

export function prepareMessage(
  text: unknown,
): { ok: true; message: UserMessage } | { ok: false; error: "invalid_body" } {
  const parsed = userMessageSchema.safeParse(text);
  if (!parsed.success) {
    return { ok: false, error: "invalid_body" };
  }
  return { ok: true, message: parsed.data };
}
