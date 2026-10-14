import { z } from "zod";

export const categorySchema = z.enum([
  "billing",
  "shipping",
  "product",
  "account",
  "other",
]);

export const urgencySchema = z.enum(["low", "medium", "high"]).brand("Urgency");
export const confidenceSchema = z.enum(["low", "medium", "high"]).brand("Confidence");

export const extractionSchema = z.object({
  summary: z.string(),
  category: categorySchema,
  urgency: urgencySchema,
  request: z.string().nullable(),
  orderNumber: z.string().nullable(),
  confidence: confidenceSchema,
  uncertainties: z.array(z.string()),
});

export type Category = z.infer<typeof categorySchema>;
export type Urgency = z.infer<typeof urgencySchema>;
export type Confidence = z.infer<typeof confidenceSchema>;
export type Extraction = z.infer<typeof extractionSchema>;
