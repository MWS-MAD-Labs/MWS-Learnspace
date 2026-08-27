import { z } from 'zod';
import {
  academicYearSchema,
  collectionMetaSchema,
  schoolDateSchema,
  staffMembershipRoleSchema,
  semesterSchema,
  uuidSchema,
  workflowStateSchema,
} from './resources.js';

const requiredText = (maximum: number) => z.string().trim().min(1).max(maximum);
const optionalText = (maximum: number) =>
  requiredText(maximum).nullable().optional();
const positioned = { position: z.number().int().nonnegative() };

export const iepAccommodationCategorySchema = z.enum([
  'ACADEMIC',
  'INSTRUCTIONAL',
  'ENVIRONMENTAL',
  'ASSESSMENT',
]);
export const iepServiceTypeSchema = z.enum([
  'INDIVIDUAL',
  'GROUP',
  'CONSULTATION',
]);

const teamMemberWriteSchema = z
  .object({
    role: requiredText(256),
    name: requiredText(256),
    initials: optionalText(32),
    confirmed: z.boolean(),
    ...positioned,
  })
  .strict();

const performanceAreaWriteSchema = z
  .object({
    name: requiredText(256),
    category: requiredText(256),
    strengths: requiredText(10_000),
    needs: requiredText(10_000),
    impactOfNeed: optionalText(10_000),
    informationSource: optionalText(4_000),
    assessmentProcess: optionalText(4_000),
    assessmentDate: schoolDateSchema.nullable().optional(),
    summaryOfResults: optionalText(10_000),
    ...positioned,
  })
  .strict();

const accommodationWriteSchema = z
  .object({
    category: iepAccommodationCategorySchema,
    subject: optionalText(256),
    code: optionalText(128),
    description: requiredText(4_000),
    ...positioned,
  })
  .strict();

const goalWriteSchema = z
  .object({
    code: requiredText(128),
    performanceArea: requiredText(256),
    longTermGoal: optionalText(10_000),
    shortTermGoal: optionalText(10_000),
    measurableGoal: requiredText(10_000),
    strategyActivity: optionalText(10_000),
    learningExpectation: optionalText(10_000),
    learningStrategy: optionalText(10_000),
    evaluationMethod: requiredText(4_000),
    schedule: requiredText(4_000),
    targetDate: schoolDateSchema.nullable().optional(),
    ...positioned,
  })
  .strict();

const serviceWriteSchema = z
  .object({
    serviceName: requiredText(256),
    type: iepServiceTypeSchema,
    duration: requiredText(256),
    frequency: optionalText(256),
    location: requiredText(256),
    days: optionalText(256),
    ...positioned,
  })
  .strict();

const iepWriteFields = {
  studentId: uuidSchema,
  academicYearId: uuidSchema,
  semesterId: uuidSchema.nullable(),
  consideration: requiredText(10_000),
  primaryClassification: requiredText(256),
  currentPlacement: requiredText(256),
  homePartnershipSupport: optionalText(10_000),
  homePartnershipRecommendations: optionalText(10_000),
  progressMeasurementMethods: z.array(requiredText(1_000)).max(100),
  parentCommunicationMethods: z.array(requiredText(1_000)).max(100),
  parentApproved: z.boolean(),
  parentName: optionalText(256),
  parentApprovalDate: schoolDateSchema.nullable(),
  startsOn: schoolDateSchema,
  endsOn: schoolDateSchema,
  teamMembers: z.array(teamMemberWriteSchema).max(100),
  performanceAreas: z.array(performanceAreaWriteSchema).max(100),
  accommodations: z.array(accommodationWriteSchema).max(500),
  goals: z.array(goalWriteSchema).max(500),
  services: z.array(serviceWriteSchema).max(100),
};

type IepWrite = z.infer<z.ZodObject<typeof iepWriteFields>>;

function addUniquePositions(
  items: readonly { position: number }[],
  path: string,
  context: z.RefinementCtx,
) {
  const seen = new Set<number>();
  items.forEach((item, index) => {
    if (seen.has(item.position)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [path, index, 'position'],
        message: 'Positions must be unique.',
      });
    }
    seen.add(item.position);
  });
}

function validateIepWrite(value: IepWrite, context: z.RefinementCtx) {
  if (value.endsOn < value.startsOn) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endsOn'],
      message: 'endsOn must be on or after startsOn.',
    });
  }
  if (
    value.parentApproved &&
    (!value.parentName || !value.parentApprovalDate)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['parentApproved'],
      message: 'Approved plans require parentName and parentApprovalDate.',
    });
  }
  if (!value.parentApproved && (value.parentName || value.parentApprovalDate)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['parentApproved'],
      message: 'Parent approval metadata requires parentApproved to be true.',
    });
  }
  addUniquePositions(value.teamMembers, 'teamMembers', context);
  addUniquePositions(value.performanceAreas, 'performanceAreas', context);
  addUniquePositions(value.services, 'services', context);
  addUniquePositions(value.goals, 'goals', context);
  const accommodationPositions = new Map<string, Set<number>>();
  value.accommodations.forEach((item, index) => {
    const positions =
      accommodationPositions.get(item.category) ?? new Set<number>();
    if (positions.has(item.position)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accommodations', index, 'position'],
        message: 'Positions must be unique within each category.',
      });
    }
    positions.add(item.position);
    accommodationPositions.set(item.category, positions);
  });
  const goalCodes = new Set<string>();
  value.goals.forEach((goal, index) => {
    if (goalCodes.has(goal.code)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['goals', index, 'code'],
        message: 'Goal codes must be unique.',
      });
    }
    goalCodes.add(goal.code);
  });
  for (const [path, date] of [
    ['parentApprovalDate', value.parentApprovalDate],
    ...value.performanceAreas.map(
      (item, index) =>
        [
          `performanceAreas.${index}.assessmentDate`,
          item.assessmentDate,
        ] as const,
    ),
    ...value.goals.map(
      (item, index) => [`goals.${index}.targetDate`, item.targetDate] as const,
    ),
  ] as const) {
    if (date && (date < value.startsOn || date > value.endsOn)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: path
          .split('.')
          .map((segment) =>
            /^\d+$/.test(segment) ? Number(segment) : segment,
          ),
        message: 'Date must fall within the IEP date range.',
      });
    }
  }
}

export const iepCreateCommandSchema = z
  .object(iepWriteFields)
  .strict()
  .superRefine(validateIepWrite);
export const iepUpdateCommandSchema = z
  .object({ expectedVersion: z.number().int().positive(), ...iepWriteFields })
  .strict()
  .superRefine(validateIepWrite);

export const iepWorkflowCommandSchema = z
  .object({ expectedVersion: z.number().int().positive() })
  .strict();

const iepReviewFields = {
  expectedVersion: z.number().int().positive(),
  decision: z.enum(['APPROVE', 'RETURN']),
  comment: requiredText(4_000).optional(),
};

export const iepReviewCommandSchema = z
  .object(iepReviewFields)
  .strict()
  .superRefine((value, context) => {
    if (value.decision === 'RETURN' && !value.comment) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['comment'],
        message: 'A comment is required when returning an IEP.',
      });
    }
  });

const withId = <T extends z.ZodRawShape>(shape: T) =>
  z.object({ id: uuidSchema, ...shape }).strict();

export const iepTeamMemberSchema = withId(teamMemberWriteSchema.shape);
export const iepPerformanceAreaSchema = withId(
  performanceAreaWriteSchema.shape,
);
export const iepAccommodationSchema = withId(accommodationWriteSchema.shape);
export const iepGoalSchema = withId(goalWriteSchema.shape);
export const iepServiceSchema = withId(serviceWriteSchema.shape);

const actorSchema = z
  .object({ id: uuidSchema, displayName: requiredText(256) })
  .strict();
const studentSchema = z
  .object({
    id: uuidSchema,
    studentNumber: requiredText(128),
    fullName: requiredText(256),
  })
  .strict();

export const iepWorkflowEventSchema = z
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
        displayName: requiredText(256),
        role: staffMembershipRoleSchema.nullable(),
        roleTitle: z.string().nullable(),
      })
      .strict(),
  })
  .strict();

export const iepSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    student: studentSchema,
    academicYear: academicYearSchema,
    semester: semesterSchema.nullable(),
    state: workflowStateSchema,
    version: z.number().int().positive(),
    consideration: requiredText(10_000),
    primaryClassification: requiredText(256),
    currentPlacement: requiredText(256),
    homePartnershipSupport: z.string().nullable(),
    homePartnershipRecommendations: z.string().nullable(),
    progressMeasurementMethods: z.array(z.string()),
    parentCommunicationMethods: z.array(z.string()),
    parentApproved: z.boolean(),
    parentName: z.string().nullable(),
    parentApprovalDate: schoolDateSchema.nullable(),
    startsOn: schoolDateSchema,
    endsOn: schoolDateSchema,
    teamMembers: z.array(iepTeamMemberSchema),
    performanceAreas: z.array(iepPerformanceAreaSchema),
    accommodations: z.array(iepAccommodationSchema),
    goals: z.array(iepGoalSchema),
    services: z.array(iepServiceSchema),
    workflowEvents: z.array(iepWorkflowEventSchema),
    createdBy: actorSchema,
    updatedBy: actorSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const iepsResponseSchema = z
  .object({ data: z.array(iepSchema), meta: collectionMetaSchema })
  .strict();
export const iepDetailResponseSchema = z.object({ data: iepSchema }).strict();
export const iepMutationResponseSchema = iepDetailResponseSchema;

export const iepListQuerySchema = z
  .object({
    studentId: uuidSchema.optional(),
    academicYearId: uuidSchema.optional(),
    semesterId: uuidSchema.optional(),
    state: workflowStateSchema.optional(),
  })
  .strict();

export type IepCreateCommand = z.infer<typeof iepCreateCommandSchema>;
export type IepUpdateCommand = z.infer<typeof iepUpdateCommandSchema>;
export type IepWorkflowCommand = z.infer<typeof iepWorkflowCommandSchema>;
export type IepReviewCommand = z.infer<typeof iepReviewCommandSchema>;
export type Iep = z.infer<typeof iepSchema>;
