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

export const sfaDefinitionItemSchema = z
  .object({
    id: z.string().trim().min(1).max(128),
    label: z.string().trim().min(1).max(256),
    description: z.string().trim().min(1).max(4000).optional(),
  })
  .strict();
export const sfaDefinitionBodySchema = z
  .object({
    participationItems: z.array(sfaDefinitionItemSchema).min(1).max(200),
    taskSupportItems: z.array(sfaDefinitionItemSchema).min(1).max(200),
    activityPerformanceItems: z.array(sfaDefinitionItemSchema).min(1).max(200),
    adaptationOptions: z.array(sfaDefinitionItemSchema).max(200),
  })
  .strict()
  .superRefine((value, context) => {
    const itemIds = new Set<string>();
    const groups = [
      ['participationItems', value.participationItems],
      ['taskSupportItems', value.taskSupportItems],
      ['activityPerformanceItems', value.activityPerformanceItems],
      ['adaptationOptions', value.adaptationOptions],
    ] as const;
    for (const [groupName, items] of groups) {
      items.forEach((item, itemIndex) => {
        if (itemIds.has(item.id)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [groupName, itemIndex, 'id'],
            message:
              'SFA item IDs must be unique across all definition groups.',
          });
        }
        itemIds.add(item.id);
      });
    }
  });
export type SfaDefinitionBody = z.infer<typeof sfaDefinitionBodySchema>;

export const sfaRespondentSchema = z
  .object({
    name: z.string().trim().min(1).max(256),
    role: z.string().trim().min(1).max(256),
    initials: z.string().trim().min(1).max(8),
  })
  .strict();
export type SfaRespondent = z.infer<typeof sfaRespondentSchema>;

export const sfaParticipationRatingSchema = z.number().int().min(1).max(6);
export const sfaTaskSupportRatingSchema = z.number().int().min(1).max(4);
export const sfaActivityPerformanceRatingSchema = z
  .number()
  .int()
  .min(1)
  .max(4);
export type SfaParticipationRating = z.infer<
  typeof sfaParticipationRatingSchema
>;
export type SfaTaskSupportRating = z.infer<typeof sfaTaskSupportRatingSchema>;
export type SfaActivityPerformanceRating = z.infer<
  typeof sfaActivityPerformanceRatingSchema
>;

export const sfaParticipationScoresCommandSchema = z.record(
  z.string().min(1),
  sfaParticipationRatingSchema,
);
export const sfaTaskSupportsCommandSchema = z.record(
  z.string().min(1),
  sfaTaskSupportRatingSchema,
);
export const sfaActivityPerformanceCommandSchema = z.record(
  z.string().min(1),
  sfaActivityPerformanceRatingSchema,
);
export const sfaAdaptationsCommandSchema = z.array(
  z.string().trim().min(1).max(128),
);

const sfaObservationBaseWriteFields = {
  assessmentDate: schoolDateSchema,
  observationDate: schoolDateSchema.optional(),
  programRecommendation: z.string().trim().min(1).max(256),
  primaryLanguage: nullableTrimmedText(256).optional(),
  writingMethod: nullableTrimmedText(256).optional(),
  mobilityMethod: nullableTrimmedText(256).optional(),
  conditionsAffectingPerformance: nullableTrimmedText(1000).optional(),
  notes: nullableTrimmedText(4000).optional(),
};
const sfaObservationWriteFields = {
  ...sfaObservationBaseWriteFields,
  respondents: z.array(sfaRespondentSchema).max(100),
  participationScores: sfaParticipationScoresCommandSchema,
  taskSupports: sfaTaskSupportsCommandSchema,
  activityPerformance: sfaActivityPerformanceCommandSchema,
  adaptations: sfaAdaptationsCommandSchema,
};
const sfaObservationCreateDraftCommandBaseSchema = z
  .object({
    ...sfaObservationBaseWriteFields,
    respondents: z.array(sfaRespondentSchema).max(100).optional(),
    participationScores: sfaParticipationScoresCommandSchema.optional(),
    taskSupports: sfaTaskSupportsCommandSchema.optional(),
    activityPerformance: sfaActivityPerformanceCommandSchema.optional(),
    adaptations: sfaAdaptationsCommandSchema.optional(),
  })
  .strict();
const sfaObservationSaveDraftCommandBaseSchema = z
  .object(sfaObservationWriteFields)
  .strict();
type SfaRejectedLegacySettings = { settings?: never };

export const sfaObservationCreateDraftCommandSchema =
  sfaObservationCreateDraftCommandBaseSchema as z.ZodType<
    z.output<typeof sfaObservationCreateDraftCommandBaseSchema> &
      SfaRejectedLegacySettings,
    z.ZodTypeDef,
    z.input<typeof sfaObservationCreateDraftCommandBaseSchema>
  >;
export const sfaObservationSaveDraftCommandSchema =
  sfaObservationSaveDraftCommandBaseSchema as z.ZodType<
    z.output<typeof sfaObservationSaveDraftCommandBaseSchema> &
      SfaRejectedLegacySettings,
    z.ZodTypeDef,
    z.input<typeof sfaObservationSaveDraftCommandBaseSchema>
  >;
export const sfaObservationCreateCommandSchema =
  sfaObservationCreateDraftCommandSchema;
export const sfaObservationDraftCommandSchema =
  sfaObservationSaveDraftCommandSchema;
export const sfaObservationCompleteCommandSchema =
  sfaObservationSaveDraftCommandBaseSchema as z.ZodType<
    z.output<typeof sfaObservationSaveDraftCommandBaseSchema> &
      SfaRejectedLegacySettings,
    z.ZodTypeDef,
    z.input<typeof sfaObservationSaveDraftCommandBaseSchema>
  >;

export const sfaDefinitionProjectionSchema = observationDefinitionSchema
  .extend({ type: z.literal('SFA'), body: sfaDefinitionBodySchema })
  .strict();
export const sfaObservationSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    assignmentId: uuidSchema,
    studentId: uuidSchema,
    definitionId: uuidSchema,
    observerId: uuidSchema,
    assessmentDate: schoolDateSchema,
    observationDate: schoolDateSchema.nullable(),
    status: z.enum(['IN_PROGRESS', 'COMPLETED']),
    programRecommendation: z.string().min(1),
    primaryLanguage: z.string().nullable(),
    writingMethod: z.string().nullable(),
    mobilityMethod: z.string().nullable(),
    conditionsAffectingPerformance: z.string().nullable(),
    respondents: z.array(sfaRespondentSchema),
    participationScores: sfaParticipationScoresCommandSchema,
    taskSupports: sfaTaskSupportsCommandSchema,
    activityPerformance: sfaActivityPerformanceCommandSchema,
    adaptations: sfaAdaptationsCommandSchema,
    totalParticipationRawScore: z.number().int().nonnegative(),
    participationAverage: z.number().min(0).max(6),
    notes: z.string().nullable(),
    completedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    student: studentSummarySchema,
    observer: observationPersonSummarySchema,
    definition: sfaDefinitionProjectionSchema,
  })
  .strict();
export const sfaObservationResponseSchema = z
  .object({ data: sfaObservationSchema })
  .strict();
export const sfaObservationMutationResponseSchema =
  sfaObservationResponseSchema;
export const sfaObservationHistoryResponseSchema = z
  .object({ data: z.array(sfaObservationSchema), meta: collectionMetaSchema })
  .strict();
export const sfaObservationsResponseSchema =
  sfaObservationHistoryResponseSchema;
export const sfaObservationReferenceResponseSchema = z
  .object({ data: sfaObservationSchema.nullable() })
  .strict();

export type SfaObservationCreateDraftCommand = z.infer<
  typeof sfaObservationCreateDraftCommandSchema
>;
export type SfaObservationSaveDraftCommand = z.infer<
  typeof sfaObservationSaveDraftCommandSchema
>;
export type SfaObservationCompleteCommand = z.infer<
  typeof sfaObservationCompleteCommandSchema
>;
export type SfaObservation = z.infer<typeof sfaObservationSchema>;
export type SfaObservationResponse = z.infer<
  typeof sfaObservationResponseSchema
>;
export type SfaObservationHistoryResponse = z.infer<
  typeof sfaObservationHistoryResponseSchema
>;
export type SfaObservationReferenceResponse = z.infer<
  typeof sfaObservationReferenceResponseSchema
>;
