import { z } from "zod";

export const ERROR_CODES = [
  "bad_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "unprocessable",
  "rate_limited",
  "internal",
  "unavailable",
] as const;

export const ApiErrorSchema = z.object({
  code: z.enum(ERROR_CODES),
  message: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ErrorCode = ApiError["code"];

export const apiError = (code: ErrorCode, message: string): ApiError => ({ code, message });
