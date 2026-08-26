import { z } from 'zod';
import {
  fedcObservationCompleteCommandSchema,
  fedcObservationCreateDraftCommandSchema,
  fedcObservationSaveDraftCommandSchema,
  sensoryProfileObservationCompleteCommandSchema,
  sensoryProfileObservationCreateDraftCommandSchema,
  sensoryProfileObservationSaveDraftCommandSchema,
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

export const sensoryProfileCreateDraftPayloadSchema =
  sensoryProfileObservationCreateDraftCommandSchema;
export const sensoryProfileSaveDraftPayloadSchema =
  sensoryProfileObservationSaveDraftCommandSchema;
export const sensoryProfileCompletePayloadSchema =
  sensoryProfileObservationCompleteCommandSchema;
export const sensoryProfilePayloadSchema = z.union([
  sensoryProfileSaveDraftPayloadSchema,
  sensoryProfileCompletePayloadSchema,
]);

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
