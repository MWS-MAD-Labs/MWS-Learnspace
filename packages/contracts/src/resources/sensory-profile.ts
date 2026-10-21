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

export const sensoryProfileSectionSchema = z.enum([
  'Auditory',
  'Visual',
  'Touch',
  'Movement',
  'Behavioral',
]);
export type SensoryProfileSection = z.infer<typeof sensoryProfileSectionSchema>;

export const sensoryProfileDefinitionItemSchema = z
  .object({
    id: z.string().trim().min(1).max(128),
    number: z.number().int().positive(),
    section: sensoryProfileSectionSchema,
    text: z.string().trim().min(1).max(4000),
    quadrant: z.enum(['SK', 'AV', 'SN', 'RG']).optional(),
    schoolFactor: z.string().trim().min(1).max(128).optional(),
    factorLabel: z.string().trim().min(1).max(256).optional(),
  })
  .strict();

export const sensoryProfileDefinitionBodySchema = z
  .object({
    items: z.array(sensoryProfileDefinitionItemSchema).min(1).max(200),
  })
  .strict()
  .superRefine((value, context) => {
    const itemIds = new Set<string>();
    const itemNumbers = new Set<number>();
    value.items.forEach((item, itemIndex) => {
      if (itemIds.has(item.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', itemIndex, 'id'],
          message: 'Sensory Profile item IDs must be unique.',
        });
      }
      itemIds.add(item.id);
      if (itemNumbers.has(item.number)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', itemIndex, 'number'],
          message: 'Sensory Profile item numbers must be unique.',
        });
      }
      itemNumbers.add(item.number);
    });
  });
export type SensoryProfileDefinitionBody = z.infer<
  typeof sensoryProfileDefinitionBodySchema
>;

export const sensoryProfileRatingSchema = z.number().int().min(0).max(5);
export type SensoryProfileRating = z.infer<typeof sensoryProfileRatingSchema>;
export const sensoryProfileResponsesCommandSchema = z.record(
  z.string().min(1),
  sensoryProfileRatingSchema,
);
export const sensoryProfileSectionScoreSchema = z
  .object({
    raw: z.number().int().nonnegative(),
    max: z.number().int().nonnegative(),
  })
  .strict();
export const sensoryProfileSectionScoresSchema = z
  .object({
    auditory: sensoryProfileSectionScoreSchema,
    visual: sensoryProfileSectionScoreSchema,
    touch: sensoryProfileSectionScoreSchema,
    movement: sensoryProfileSectionScoreSchema,
    behavioral: sensoryProfileSectionScoreSchema,
  })
  .strict();

const sensoryProfileDraftWriteFields = {
  observationDate: schoolDateSchema,
  teacherContactFrequency: nullableTrimmedText(256).optional(),
  teacherContactLength: nullableTrimmedText(256).optional(),
  responses: sensoryProfileResponsesCommandSchema,
  notes: nullableTrimmedText(4000).optional(),
};
export const sensoryProfileObservationCreateDraftCommandSchema = z
  .object({
    observationDate: schoolDateSchema,
    teacherContactFrequency: nullableTrimmedText(256).optional(),
    teacherContactLength: nullableTrimmedText(256).optional(),
    responses: sensoryProfileResponsesCommandSchema.optional(),
    notes: nullableTrimmedText(4000).optional(),
  })
  .strict();
export const sensoryProfileObservationSaveDraftCommandSchema = z
  .object(sensoryProfileDraftWriteFields)
  .strict();
export const sensoryProfileObservationCreateCommandSchema =
  sensoryProfileObservationCreateDraftCommandSchema;
export const sensoryProfileObservationDraftCommandSchema =
  sensoryProfileObservationSaveDraftCommandSchema;
export const sensoryProfileObservationCompleteCommandSchema = z
  .object(sensoryProfileDraftWriteFields)
  .strict();

export const sensoryProfileDefinitionProjectionSchema =
  observationDefinitionSchema
    .extend({
      type: z.literal('SENSORY_PROFILE'),
      body: sensoryProfileDefinitionBodySchema,
    })
    .strict();
export const sensoryProfileObservationSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    assignmentId: uuidSchema,
    studentId: uuidSchema,
    definitionId: uuidSchema,
    observerId: uuidSchema,
    observationDate: schoolDateSchema,
    status: z.enum(['IN_PROGRESS', 'COMPLETED']),
    teacherContactFrequency: z.string().nullable(),
    teacherContactLength: z.string().nullable(),
    responses: sensoryProfileResponsesCommandSchema,
    sectionScores: sensoryProfileSectionScoresSchema,
    totalRawScore: z.number().int().nonnegative(),
    notes: z.string().nullable(),
    completedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    student: studentSummarySchema,
    observer: observationPersonSummarySchema,
    definition: sensoryProfileDefinitionProjectionSchema,
  })
  .strict();
export const sensoryProfileObservationResponseSchema = z
  .object({ data: sensoryProfileObservationSchema })
  .strict();
export const sensoryProfileObservationMutationResponseSchema =
  sensoryProfileObservationResponseSchema;
export const sensoryProfileObservationHistoryResponseSchema = z
  .object({
    data: z.array(sensoryProfileObservationSchema),
    meta: collectionMetaSchema,
  })
  .strict();
export const sensoryProfileObservationsResponseSchema =
  sensoryProfileObservationHistoryResponseSchema;
export const sensoryProfileObservationReferenceResponseSchema = z
  .object({ data: sensoryProfileObservationSchema.nullable() })
  .strict();

export type SensoryProfileObservationCreateDraftCommand = z.infer<
  typeof sensoryProfileObservationCreateDraftCommandSchema
>;
export type SensoryProfileObservationSaveDraftCommand = z.infer<
  typeof sensoryProfileObservationSaveDraftCommandSchema
>;
export type SensoryProfileObservationCompleteCommand = z.infer<
  typeof sensoryProfileObservationCompleteCommandSchema
>;
export type SensoryProfileObservation = z.infer<
  typeof sensoryProfileObservationSchema
>;
export type SensoryProfileObservationResponse = z.infer<
  typeof sensoryProfileObservationResponseSchema
>;
export type SensoryProfileObservationHistoryResponse = z.infer<
  typeof sensoryProfileObservationHistoryResponseSchema
>;
export type SensoryProfileObservationReferenceResponse = z.infer<
  typeof sensoryProfileObservationReferenceResponseSchema
>;
