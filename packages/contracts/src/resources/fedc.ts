import { z } from 'zod';
import {
  collectionMetaSchema,
  nullableTrimmedText,
  schoolDateSchema,
  uuidSchema,
} from './common.js';
import {
  observationDefinitionSchema,
  observationPersonSummarySchema,
} from './observation-management.js';
import { studentSummarySchema } from './people.js';

export const fedcRatingSchema = z.enum(['T', 'K', 'S', 'H']);
export type FedcRating = z.infer<typeof fedcRatingSchema>;

export const fedcDefinitionItemSchema = z
  .object({
    id: z.string().trim().min(1).max(128),
    number: z.string().trim().min(1).max(64),
    text: z.string().trim().min(1).max(4000),
    milestoneId: z.number().int().positive(),
  })
  .strict();

export const fedcDefinitionMilestoneSchema = z
  .object({
    id: z.number().int().positive(),
    title: z.string().trim().min(1).max(256),
    subtitle: z.string().trim().min(1).max(512).optional(),
    description: z.string().trim().min(1).max(4000).optional(),
    maxScore: z.number().int().positive(),
    items: z.array(fedcDefinitionItemSchema).min(1).max(200),
  })
  .strict();

export const fedcDefinitionBodySchema = z
  .object({
    milestones: z.array(fedcDefinitionMilestoneSchema).min(1).max(100),
  })
  .strict()
  .superRefine((value, context) => {
    const milestoneIds = new Set<number>();
    const itemIds = new Set<string>();
    value.milestones.forEach((milestone, milestoneIndex) => {
      if (milestoneIds.has(milestone.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['milestones', milestoneIndex, 'id'],
          message: 'FEDC milestone IDs must be unique.',
        });
      }
      milestoneIds.add(milestone.id);
      if (milestone.maxScore !== milestone.items.length * 3) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['milestones', milestoneIndex, 'maxScore'],
          message: 'FEDC milestone maxScore must equal three points per item.',
        });
      }
      milestone.items.forEach((item, itemIndex) => {
        if (itemIds.has(item.id)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['milestones', milestoneIndex, 'items', itemIndex, 'id'],
            message: 'FEDC item IDs must be unique.',
          });
        }
        itemIds.add(item.id);
        if (item.milestoneId !== milestone.id) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [
              'milestones',
              milestoneIndex,
              'items',
              itemIndex,
              'milestoneId',
            ],
            message:
              'FEDC item milestoneId must match its containing milestone.',
          });
        }
      });
    });
  });
export type FedcDefinitionBody = z.infer<typeof fedcDefinitionBodySchema>;

export const fedcResponseCommandSchema = z
  .object({
    itemId: z.string().trim().min(1).max(128),
    rating: fedcRatingSchema,
    masteredAge: z.string().trim().min(1).max(64).optional(),
  })
  .strict();
export const fedcResponsesCommandSchema = z.record(
  z.string().min(1),
  fedcResponseCommandSchema,
);
export const fedcScoredResponseSchema = fedcResponseCommandSchema
  .extend({ score: z.number().int().min(0).max(3) })
  .strict();
export const fedcScoredResponsesSchema = z.record(
  z.string().min(1),
  fedcScoredResponseSchema,
);
export const fedcMilestoneScoresSchema = z.record(
  z.string().regex(/^\d+$/),
  z.number().int().nonnegative(),
);

const fedcObservationWriteFields = {
  observationDate: schoolDateSchema,
  responses: fedcResponsesCommandSchema,
  notes: nullableTrimmedText(4000).optional(),
};
export const fedcObservationCreateDraftCommandSchema = z
  .object({
    observationDate: schoolDateSchema,
    responses: fedcResponsesCommandSchema.optional(),
    notes: nullableTrimmedText(4000).optional(),
  })
  .strict();
export const fedcObservationSaveDraftCommandSchema = z
  .object(fedcObservationWriteFields)
  .strict();
export const fedcObservationCreateCommandSchema =
  fedcObservationCreateDraftCommandSchema;
export const fedcObservationDraftCommandSchema =
  fedcObservationSaveDraftCommandSchema;
export const fedcObservationCompleteCommandSchema = z
  .object(fedcObservationWriteFields)
  .strict();

export const fedcDefinitionProjectionSchema = observationDefinitionSchema
  .extend({ type: z.literal('FEDC'), body: fedcDefinitionBodySchema })
  .strict();
export const fedcObservationSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    assignmentId: uuidSchema,
    studentId: uuidSchema,
    definitionId: uuidSchema,
    observerId: uuidSchema,
    observationDate: schoolDateSchema,
    status: z.enum(['IN_PROGRESS', 'COMPLETED']),
    responses: fedcScoredResponsesSchema,
    milestoneScores: fedcMilestoneScoresSchema,
    totalScore: z.number().int().nonnegative(),
    maxPossibleScore: z.number().int().positive(),
    notes: z.string().nullable(),
    completedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    student: studentSummarySchema,
    observer: observationPersonSummarySchema,
    definition: fedcDefinitionProjectionSchema,
  })
  .strict();
export const fedcObservationResponseSchema = z
  .object({ data: fedcObservationSchema })
  .strict();
export const fedcObservationMutationResponseSchema =
  fedcObservationResponseSchema;
export const fedcObservationHistoryResponseSchema = z
  .object({ data: z.array(fedcObservationSchema), meta: collectionMetaSchema })
  .strict();
export const fedcObservationsResponseSchema =
  fedcObservationHistoryResponseSchema;
export const fedcObservationReferenceResponseSchema = z
  .object({ data: fedcObservationSchema.nullable() })
  .strict();

export type FedcResponseCommand = z.infer<typeof fedcResponseCommandSchema>;
export type FedcScoredResponse = z.infer<typeof fedcScoredResponseSchema>;
export type FedcObservationCreateDraftCommand = z.infer<
  typeof fedcObservationCreateDraftCommandSchema
>;
export type FedcObservationSaveDraftCommand = z.infer<
  typeof fedcObservationSaveDraftCommandSchema
>;
export type FedcObservationCompleteCommand = z.infer<
  typeof fedcObservationCompleteCommandSchema
>;
export type FedcObservation = z.infer<typeof fedcObservationSchema>;
export type FedcObservationResponse = z.infer<
  typeof fedcObservationResponseSchema
>;
export type FedcObservationHistoryResponse = z.infer<
  typeof fedcObservationHistoryResponseSchema
>;
export type FedcObservationReferenceResponse = z.infer<
  typeof fedcObservationReferenceResponseSchema
>;
