import { z } from 'zod';

const membershipRoleSchema = z.enum([
  'PRINCIPAL',
  'DIRECTOR',
  'GRADE_TEACHER',
  'SUBJECT_TEACHER',
  'SPECIAL_ED_COORDINATOR',
  'SPECIAL_ED_TEACHER',
  'SPECIALIST',
]);

const workflowStateSchema = z.enum([
  'DRAFT',
  'PRINCIPAL_REVIEW',
  'COORDINATOR_REVIEW',
  'DIRECTOR_APPROVAL',
  'APPROVED',
  'ACTIVE',
  'ARCHIVED',
]);

export const aggregateSearchQuerySchema = z
  .object({
    q: z.string().trim().min(2).max(100),
    limit: z.coerce.number().int().min(1).max(20).default(10),
    offset: z.coerce.number().int().min(0).max(1000).default(0),
  })
  .strict();

export const aggregateSearchItemSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum([
    'STUDENT',
    'LEARNING_JOURNEY',
    'IEP',
    'IEP_GOAL',
    'WEEKLY_REPORT',
  ]),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  studentId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  state: workflowStateSchema.optional(),
  updatedAt: z.string().datetime(),
});

export const aggregateSearchResponseSchema = z.object({
  data: z.array(aggregateSearchItemSchema).max(20),
  meta: z.object({
    count: z.number().int().nonnegative(),
    limit: z.number().int().min(1).max(20),
    offset: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  }),
});

export const aggregateNotificationSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    'JOURNEY_REVIEW',
    'IEP_REVIEW',
    'WEEKLY_REPORT_REVIEW',
    'OBSERVATION_DUE',
    'WEEKLY_REPORT_DRAFT',
  ]),
  title: z.string().min(1),
  message: z.string().min(1),
  occurredAt: z.string().datetime(),
  dueAt: z.string().datetime().optional(),
  target: z.object({
    tab: z.enum([
      'LEARNING_JOURNEY_EDITOR',
      'SPECIAL_ED_IEP',
      'SPECIAL_ED_WEEKLY_REPORT',
      'SPECIAL_ED_OBSERVATION',
    ]),
    recordId: z.string().uuid().optional(),
    studentId: z.string().uuid().optional(),
    observationType: z.enum(['FEDC', 'SENSORY_PROFILE', 'SFA']).optional(),
  }),
});

export const aggregateNotificationsResponseSchema = z.object({
  data: z.array(aggregateNotificationSchema).max(10),
  meta: z.object({ count: z.number().int().nonnegative() }),
});

const journeySummarySchema = z.object({
  total: z.number().int().nonnegative(),
  approved: z.number().int().nonnegative(),
  inReview: z.number().int().nonnegative(),
  draft: z.number().int().nonnegative(),
});

const specialEducationSummarySchema = z.object({
  activeIeps: z.number().int().nonnegative(),
  activeGoals: z.number().int().nonnegative(),
  achievedGoals: z.number().int().nonnegative(),
  weeklyReportsDue: z.number().int().nonnegative(),
});

const attendanceSummarySchema = z.object({
  schoolDate: z.string().date(),
  totalStudents: z.number().int().nonnegative(),
  recorded: z.number().int().nonnegative(),
  present: z.number().int().nonnegative(),
  late: z.number().int().nonnegative(),
  absent: z.number().int().nonnegative(),
});

export const dashboardSummaryResponseSchema = z.object({
  data: z.object({
    generatedAt: z.string().datetime(),
    role: membershipRoleSchema,
    students: z.object({
      total: z.number().int().nonnegative(),
      specialSupport: z.number().int().nonnegative(),
    }),
    attendance: attendanceSummarySchema.optional(),
    journeys: journeySummarySchema.optional(),
    specialEducation: specialEducationSummarySchema.optional(),
    recentJourneys: z
      .array(
        z.object({
          id: z.string().uuid(),
          title: z.string().min(1),
          grade: z.string().min(1),
          subject: z.string().min(1),
          state: workflowStateSchema,
          updatedAt: z.string().datetime(),
        }),
      )
      .max(3),
  }),
});

export const reportingAggregateResponseSchema = z.object({
  data: z.object({
    generatedAt: z.string().datetime(),
    students: z.object({
      total: z.number().int().nonnegative(),
      specialSupport: z.number().int().nonnegative(),
    }),
    attendance: attendanceSummarySchema.optional(),
    journeys: journeySummarySchema.optional(),
    specialEducation: specialEducationSummarySchema.optional(),
    observations: z
      .object({
        pending: z.number().int().nonnegative(),
        inProgress: z.number().int().nonnegative(),
        completed: z.number().int().nonnegative(),
        completedByType: z.object({
          FEDC: z.number().int().nonnegative(),
          SENSORY_PROFILE: z.number().int().nonnegative(),
          SFA: z.number().int().nonnegative(),
        }),
      })
      .optional(),
  }),
});

export type AggregateSearchQuery = z.infer<typeof aggregateSearchQuerySchema>;
export type AggregateSearchResponse = z.infer<
  typeof aggregateSearchResponseSchema
>;
export type AggregateSearchItem = z.infer<typeof aggregateSearchItemSchema>;
export type AggregateNotificationsResponse = z.infer<
  typeof aggregateNotificationsResponseSchema
>;
export type AggregateNotification = z.infer<typeof aggregateNotificationSchema>;
export type DashboardSummaryResponse = z.infer<
  typeof dashboardSummaryResponseSchema
>;
export type ReportingAggregateResponse = z.infer<
  typeof reportingAggregateResponseSchema
>;
