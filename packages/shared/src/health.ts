import { z } from "zod";

export const HealthSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  database: z.enum(["up", "down"]),
  version: z.string().min(1),
});

export type Health = z.infer<typeof HealthSchema>;
