import { z } from "zod";

export const userIdSchema = z.uuid().brand("UserId");
export const extraccionIdSchema = z.uuid().brand("ExtraccionId");

export type UserId = z.infer<typeof userIdSchema>;
export type ExtraccionId = z.infer<typeof extraccionIdSchema>;
