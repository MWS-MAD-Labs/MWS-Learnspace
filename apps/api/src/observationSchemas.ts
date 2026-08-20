import { z } from 'zod';

const completedObservationSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'COMPLETED']),
});

export const fedcPayloadSchema = completedObservationSchema.extend({
  responses: z.record(
    z.object({
      itemId: z.string().min(1),
      rating: z.enum(['T', 'K', 'S', 'H']).optional(),
      score: z.number().int().min(0).optional(),
      masteredAge: z.string().max(64).optional(),
    }),
  ),
  milestoneScores: z.record(z.coerce.number().int().nonnegative()),
  totalScore: z.number().int().nonnegative(),
  maxPossibleScore: z.number().int().positive(),
});

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
