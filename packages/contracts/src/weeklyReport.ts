import { z } from 'zod';
import {
  collectionMetaSchema,
  schoolDateSchema,
  staffMembershipRoleSchema,
  uuidSchema,
  workflowStateSchema,
} from './resources.js';

const text = (maximum: number) => z.string().trim().min(1).max(maximum);
const optionalText = (maximum: number) => text(maximum).optional();

const weeklyGoalProgressFields = {
  goalId: uuidSchema,
  addressedThisWeek: z.boolean(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  notes: optionalText(10_000),
  markedAchievedThisWeek: z.boolean(),
  achievedDate: schoolDateSchema.optional(),
  achievedNote: optionalText(10_000),
};
export const weeklyGoalProgressCommandSchema = z
  .object(weeklyGoalProgressFields)
  .strict()
  .superRefine((value, context) => {
    if (value.markedAchievedThisWeek && !value.achievedDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['achievedDate'],
        message: 'An achieved date is required when a goal is marked achieved.',
      });
    }
  });

const weeklyReportFields = {
  studentId: uuidSchema,
  iepId: uuidSchema,
  year: z.coerce.number().int().min(2000).max(2100),
  weekNumber: z.number().int().min(1).max(53),
  weekStart: schoolDateSchema,
  weekEnd: schoolDateSchema,
  descriptiveObservation: text(20_000),
  homeConnection: text(20_000),
  goalProgress: z.array(weeklyGoalProgressCommandSchema).max(500),
};

function validateWeeklyReport(
  value: z.infer<z.ZodObject<typeof weeklyReportFields>>,
  context: z.RefinementCtx,
) {
  if (value.weekEnd < value.weekStart) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['weekEnd'],
      message: 'weekEnd must be on or after weekStart.',
    });
  }
  const ids = new Set<string>();
  value.goalProgress.forEach((progress, index) => {
    if (ids.has(progress.goalId))
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['goalProgress', index, 'goalId'],
        message: 'Each goal may appear only once.',
      });
    ids.add(progress.goalId);
  });
}

export const weeklyReportCreateCommandSchema = z
  .object(weeklyReportFields)
  .strict()
  .superRefine(validateWeeklyReport);
export const weeklyReportUpdateCommandSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    ...weeklyReportFields,
  })
  .strict()
  .superRefine(validateWeeklyReport);
export const weeklyReportSubmitCommandSchema = z
  .object({ expectedVersion: z.number().int().positive() })
  .strict();
export const weeklyReportDecisionCommandSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    decision: z.enum(['APPROVE', 'RETURN']),
    comment: optionalText(4_000),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.decision === 'RETURN' && !value.comment)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['comment'],
        message: 'A comment is required when returning a weekly report.',
      });
  });
export const weeklyReportCoordinatorDecisionCommandSchema =
  weeklyReportDecisionCommandSchema;
export const weeklyReportDirectorDecisionCommandSchema =
  weeklyReportDecisionCommandSchema;

const actorSchema = z
  .object({
    id: uuidSchema,
    displayName: text(256),
    role: staffMembershipRoleSchema.nullable(),
    roleTitle: z.string().nullable(),
  })
  .strict();
export const weeklyReportWorkflowEventSchema = z
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
    actor: actorSchema,
  })
  .strict();
export const weeklyGoalProgressSchema = z
  .object({ id: uuidSchema, ...weeklyGoalProgressFields })
  .strict();
export const weeklyReportSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    studentId: uuidSchema,
    iepId: uuidSchema,
    year: z.number().int(),
    weekNumber: z.number().int(),
    weekStart: schoolDateSchema,
    weekEnd: schoolDateSchema,
    state: workflowStateSchema,
    version: z.number().int().positive(),
    descriptiveObservation: z.string(),
    homeConnection: z.string(),
    teacher: actorSchema,
    student: z
      .object({
        id: uuidSchema,
        studentNumber: z.string(),
        fullName: z.string(),
      })
      .strict(),
    goalProgress: z.array(weeklyGoalProgressSchema),
    workflowEvents: z.array(weeklyReportWorkflowEventSchema),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export const weeklyReportsResponseSchema = z
  .object({ data: z.array(weeklyReportSchema), meta: collectionMetaSchema })
  .strict();
export const weeklyReportDetailResponseSchema = z
  .object({ data: weeklyReportSchema })
  .strict();
export const weeklyReportMutationResponseSchema =
  weeklyReportDetailResponseSchema;
export const weeklyReportListQuerySchema = z
  .object({
    studentId: uuidSchema.optional(),
    weekNumber: z.coerce.number().int().min(1).max(53).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
  })
  .strict();

export type WeeklyReportCreateCommand = z.infer<
  typeof weeklyReportCreateCommandSchema
>;
export type WeeklyReportUpdateCommand = z.infer<
  typeof weeklyReportUpdateCommandSchema
>;
