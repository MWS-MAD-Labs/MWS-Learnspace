import { z } from 'zod';

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: z.string().min(1),
    details: z.unknown().optional(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const healthResponseSchema = z.object({
  status: z.enum(['live', 'ready', 'unavailable']),
  dependencies: z.record(z.enum(['up', 'down'])).optional(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const versionResponseSchema = z.object({
  name: z.literal('learnspace-api'),
  version: z.string().min(1),
});

export type VersionResponse = z.infer<typeof versionResponseSchema>;
