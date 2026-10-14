import { z } from "zod";

export const userIdSchema = z.uuid().brand("UserId");
export const extractionIdSchema = z.uuid().brand("ExtractionId");

export type UserId = z.infer<typeof userIdSchema>;
export type ExtractionId = z.infer<typeof extractionIdSchema>;
