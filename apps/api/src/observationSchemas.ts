import { z } from 'zod';
import {
  fedcObservationCompleteCommandSchema,
  fedcObservationCreateDraftCommandSchema,
  fedcObservationSaveDraftCommandSchema,
} from '@learnspace/contracts';

const completedObservationSchema = z
  .object({ status: z.enum(['IN_PROGRESS', 'COMPLETED']) })
  .strict();

export const fedcCreateDraftPayloadSchema =
  fedcObservationCreateDraftCommandSchema;
export const fedcSaveDraftPayloadSchema = fedcObservationSaveDraftCommandSchema;
export const fedcCompletePayloadSchema = fedcObservationCompleteCommandSchema;
export const fedcPayloadSchema = z.union([
  fedcSaveDraftPayloadSchema,
  fedcCompletePayloadSchema,
]);

export const sensoryProfilePayloadSchema = completedObservationSchema.extend({
  responses: z.record(z.number().int().min(0).max(5)),
  sectionScores: z.record(
    z.object({
      raw: z.number().int().nonnegative(),
      max: z.number().int().positive(),
    }),
  ),
  totalRawScore: z.number().int().nonnegative(),
});

export const sfaPayloadSchema = completedObservationSchema.extend({
  respondents: z.array(
    z.object({
      name: z.string().min(1),
      role: z.string().min(1),
      initials: z.string().min(1).max(8),
    }),
  ),
  participationScores: z.record(z.number().min(1).max(6)),
  settings: z
    .record(
      z.object({
        rating: z.number().min(1).max(6),
        notes: z.string().optional(),
      }),
    )
    .optional(),
  taskSupports: z.record(z.number().min(1).max(4)),
  activityPerformance: z.record(z.number().min(1).max(4)),
  adaptations: z.array(z.string().min(1)),
  participationAverage: z.number().min(1).max(6),
});
