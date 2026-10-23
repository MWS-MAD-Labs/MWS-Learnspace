import { z } from 'zod';
import {
  academicYearSchema,
  gradeSchema,
  semesterSchema,
  subjectSchema,
  unitSchema,
} from './academics.js';
import {
  collectionMetaSchema,
  schoolDateSchema,
  uuidSchema,
} from './common.js';
import { roleKeySchema } from './people.js';

export const workflowStateSchema = z.enum([
  'DRAFT',
  'PRINCIPAL_REVIEW',
  'COORDINATOR_REVIEW',
  'DIRECTOR_APPROVAL',
  'APPROVED',
  'ACTIVE',
  'ARCHIVED',
]);

export const learningJourneyOwnerSummarySchema = z
  .object({
    membershipId: uuidSchema,
    userId: uuidSchema,
    displayName: z.string().min(1),
    role: roleKeySchema,
    roleTitle: z.string().nullable(),
  })
  .strict();
export const learningJourneyGoalSchema = z
  .object({
    id: uuidSchema,
    description: z.string().min(1),
    position: z.number().int().nonnegative(),
  })
  .strict();
export const learningJourneyConnectionSchema = z
  .object({
    id: uuidSchema,
    subject: z.string().min(1),
    description: z.string().min(1),
    position: z.number().int().nonnegative(),
  })
  .strict();
export const learningJourneyWorkflowEventSchema = z
  .object({
    id: uuidSchema,
    fromState: workflowStateSchema,
    toState: workflowStateSchema,
    action: z.enum([
      'SUBMITTED',
      'APPROVED',
      'RETURNED',
      'UPDATED',
      'ACTIVATED',
      'ARCHIVED',
    ]),
    comment: z.string().nullable(),
    occurredAt: z.string().datetime(),
    actor: z
      .object({
        id: uuidSchema,
        displayName: z.string().min(1),
        role: roleKeySchema.nullable(),
        roleTitle: z.string().nullable(),
      })
      .strict(),
  })
  .strict();
export const learningJourneyProjectSchema = z
  .object({
    id: uuidSchema,
    title: z.string().min(1),
    description: z.string().min(1),
    startsOn: schoolDateSchema,
    endsOn: schoolDateSchema,
    color: z.string().nullable(),
    position: z.number().int().nonnegative(),
    goals: z.array(learningJourneyGoalSchema),
    connections: z.array(learningJourneyConnectionSchema),
  })
  .strict();

const learningJourneyBaseSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    title: z.string().min(1),
    academicYear: academicYearSchema,
    semester: semesterSchema,
    unit: unitSchema,
    grade: gradeSchema,
    subject: subjectSchema,
    state: workflowStateSchema,
    version: z.number().int().positive(),
    owners: z.array(learningJourneyOwnerSummarySchema),
    workflowEvents: z.array(learningJourneyWorkflowEventSchema),
    createdBy: z
      .object({ id: uuidSchema, displayName: z.string().min(1) })
      .strict(),
    updatedBy: z
      .object({ id: uuidSchema, displayName: z.string().min(1) })
      .strict(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export const learningJourneyCollectionItemSchema = learningJourneyBaseSchema
  .extend({ projects: z.array(learningJourneyProjectSchema) })
  .strict();
export const learningJourneyDetailSchema = learningJourneyCollectionItemSchema;
export const learningJourneysResponseSchema = z
  .object({
    data: z.array(learningJourneyCollectionItemSchema),
    meta: collectionMetaSchema,
  })
  .strict();
export const learningJourneyDetailResponseSchema = z
  .object({ data: learningJourneyDetailSchema })
  .strict();

export const learningJourneyListQuerySchema = z
  .object({
    academicYearId: uuidSchema.optional(),
    semesterId: uuidSchema.optional(),
    unitId: uuidSchema.optional(),
    gradeId: uuidSchema.optional(),
    subjectId: uuidSchema.optional(),
    state: workflowStateSchema.optional(),
    ownerMembershipId: uuidSchema.optional(),
    projectStartsOnOrAfter: schoolDateSchema.optional(),
    projectEndsOnOrBefore: schoolDateSchema.optional(),
    search: z.string().trim().min(1).max(200).optional(),
  })
  .strict()
  .refine(
    (value) =>
      !value.projectStartsOnOrAfter ||
      !value.projectEndsOnOrBefore ||
      value.projectEndsOnOrBefore >= value.projectStartsOnOrAfter,
    {
      path: ['projectEndsOnOrBefore'],
      message: 'Project date range is invalid.',
    },
  );

const positionedDescriptionCommandSchema = z
  .object({
    description: z.string().trim().min(1).max(4000),
    position: z.number().int().nonnegative(),
  })
  .strict();
const connectionCommandSchema = positionedDescriptionCommandSchema
  .extend({ subject: z.string().trim().min(1).max(256) })
  .strict();
const projectCommandSchema = z
  .object({
    title: z.string().trim().min(1).max(256),
    description: z.string().trim().min(1).max(10000),
    startsOn: schoolDateSchema,
    endsOn: schoolDateSchema,
    color: z.string().trim().max(64).nullable().optional(),
    position: z.number().int().nonnegative(),
    goals: z.array(positionedDescriptionCommandSchema).max(100),
    connections: z.array(connectionCommandSchema).max(100),
  })
  .strict()
  .refine((value) => value.endsOn >= value.startsOn, {
    path: ['endsOn'],
    message: 'endsOn must be on or after startsOn.',
  });

function addUniquePositionIssues(
  items: readonly { position: number }[],
  path: (string | number)[],
  context: z.RefinementCtx,
) {
  const seen = new Set<number>();
  items.forEach((item, index) => {
    if (seen.has(item.position)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, index, 'position'],
        message: 'Positions must be unique.',
      });
    }
    seen.add(item.position);
  });
}

const learningJourneyWriteFields = {
  title: z.string().trim().min(1).max(256),
  academicYearId: uuidSchema,
  semesterId: uuidSchema,
  unitId: uuidSchema,
  gradeId: uuidSchema,
  subjectId: uuidSchema,
  ownerMembershipIds: z.array(uuidSchema).min(1).max(100),
  projects: z.array(projectCommandSchema).min(1).max(100),
};
function validateLearningJourneyPositions(
  value: {
    ownerMembershipIds: string[];
    projects: z.infer<typeof projectCommandSchema>[];
  },
  context: z.RefinementCtx,
) {
  const ownerIds = new Set(value.ownerMembershipIds);
  if (ownerIds.size !== value.ownerMembershipIds.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ownerMembershipIds'],
      message: 'Owner membership IDs must be unique.',
    });
  }
  addUniquePositionIssues(value.projects, ['projects'], context);
  value.projects.forEach((project, projectIndex) => {
    addUniquePositionIssues(
      project.goals,
      ['projects', projectIndex, 'goals'],
      context,
    );
    addUniquePositionIssues(
      project.connections,
      ['projects', projectIndex, 'connections'],
      context,
    );
  });
}

export const learningJourneyCreateCommandSchema = z
  .object(learningJourneyWriteFields)
  .strict()
  .superRefine(validateLearningJourneyPositions);
export const learningJourneyUpdateCommandSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    ...learningJourneyWriteFields,
  })
  .strict()
  .superRefine(validateLearningJourneyPositions);
const learningJourneyExpectedVersionSchema = z
  .object({ expectedVersion: z.number().int().positive() })
  .strict();
const learningJourneyDecisionFields = {
  expectedVersion: z.number().int().positive(),
  decision: z.enum(['APPROVE', 'RETURN']),
  comment: z.string().trim().max(4000).optional(),
};
export const learningJourneySubmitCommandSchema =
  learningJourneyExpectedVersionSchema;
export const learningJourneyPrincipalReviewCommandSchema = z
  .object(learningJourneyDecisionFields)
  .strict()
  .superRefine((value, context) => {
    if (value.decision === 'RETURN' && !value.comment) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['comment'],
        message: 'A comment is required when returning a learning journey.',
      });
    }
  });
export const learningJourneyDirectorReviewCommandSchema =
  learningJourneyPrincipalReviewCommandSchema;
export const learningJourneyMutationResponseSchema = z
  .object({ data: learningJourneyDetailSchema })
  .strict();

export type WorkflowState = z.infer<typeof workflowStateSchema>;
export type LearningJourneyListQuery = z.infer<
  typeof learningJourneyListQuerySchema
>;
export type LearningJourneysResponse = z.infer<
  typeof learningJourneysResponseSchema
>;
export type LearningJourneyDetailResponse = z.infer<
  typeof learningJourneyDetailResponseSchema
>;
export type LearningJourneyCreateCommand = z.infer<
  typeof learningJourneyCreateCommandSchema
>;
export type LearningJourneyUpdateCommand = z.infer<
  typeof learningJourneyUpdateCommandSchema
>;
export type LearningJourneySubmitCommand = z.infer<
  typeof learningJourneySubmitCommandSchema
>;
export type LearningJourneyPrincipalReviewCommand = z.infer<
  typeof learningJourneyPrincipalReviewCommandSchema
>;
export type LearningJourneyDirectorReviewCommand = z.infer<
  typeof learningJourneyDirectorReviewCommandSchema
>;
export type LearningJourneyMutationResponse = z.infer<
  typeof learningJourneyMutationResponseSchema
>;
