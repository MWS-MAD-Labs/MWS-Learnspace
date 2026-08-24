import { z } from 'zod';

export const LEARNSPACE_EXPORT_FORMAT = 'learnspace-export' as const;
export const LEARNSPACE_EXPORT_VERSION = 1 as const;
export const LEARNSPACE_EXPORT_MAX_BYTES = 10 * 1024 * 1024;
export const LEARNSPACE_EXPORT_LIMITS = {
  recordsPerCollection: 10_000,
  sourceIdLength: 128,
  textLength: 20_000,
} as const;

const sourceIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(LEARNSPACE_EXPORT_LIMITS.sourceIdLength);
const textSchema = z.string().max(LEARNSPACE_EXPORT_LIMITS.textLength);
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD.');
const dateTimeSchema = z.string().datetime({ offset: true });
const sourceRecordSchema = z.object({ id: sourceIdSchema }).passthrough();
const collection = <T extends z.ZodTypeAny>(schema: T) =>
  z.array(schema).max(LEARNSPACE_EXPORT_LIMITS.recordsPerCollection);

export const learnspaceExportUserRecordSchema = sourceRecordSchema.extend({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  role: z.enum([
    'PRINCIPAL',
    'DIRECTOR',
    'GRADE_TEACHER',
    'SUBJECT_TEACHER',
    'SPECIAL_ED_COORDINATOR',
    'SPECIAL_ED_TEACHER',
    'SPECIALIST',
  ]),
  unitIds: collection(textSchema),
  gradeIds: collection(textSchema),
  subjectIds: collection(textSchema),
  permissions: collection(textSchema),
});

export const learnspaceExportStudentRecordSchema = sourceRecordSchema.extend({
  studentNumber: z.string().trim().min(1).max(100),
  fullName: z.string().trim().min(1).max(300),
  gender: z.enum(['Male', 'Female', 'Other', 'Unspecified']),
  dateOfBirth: dateSchema,
  grade: z.string().trim().min(1).max(200),
  className: z.string().trim().min(1).max(200),
  unit: z.string().trim().min(1).max(200),
  specialNeedsFlag: z.boolean(),
  active: z.boolean(),
});

export const learnspaceExportLearningJourneyRecordSchema =
  sourceRecordSchema.extend({
    academicYear: z.string().trim().min(1).max(100),
    semester: z.enum(['Semester 1', 'Semester 2']),
    ownerIds: collection(sourceIdSchema),
    createdBy: sourceIdSchema,
    updatedBy: sourceIdSchema,
    createdAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
  });

export const learnspaceExportObservationDefinitionRecordSchema =
  sourceRecordSchema.extend({
    type: z.enum(['FEDC', 'SENSORY_PROFILE', 'SFA']),
    updatedBy: sourceIdSchema,
    lastUpdated: z.union([dateSchema, dateTimeSchema]),
    isActive: z.boolean(),
  });

export const learnspaceExportObservationAssignmentRecordSchema =
  sourceRecordSchema.extend({
    studentId: sourceIdSchema,
    instrumentType: z.enum(['FEDC', 'SENSORY_PROFILE', 'SFA']),
    assignedToUserId: sourceIdSchema,
    assignedByUserId: sourceIdSchema.optional(),
    assignedByCoordinatorId: sourceIdSchema.optional(),
    dueDate: dateSchema,
    status: z.enum([
      'Pending',
      'In Progress',
      'Completed',
      'PENDING',
      'IN_PROGRESS',
      'COMPLETED',
    ]),
    recordId: sourceIdSchema.optional(),
  });

const observationRecordSchema = sourceRecordSchema.extend({
  studentId: sourceIdSchema,
  observerId: sourceIdSchema,
  status: z.enum(['Draft', 'Completed']),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const learnspaceExportFedcObservationRecordSchema =
  observationRecordSchema.extend({
    observationType: z.literal('FEDC'),
    observationDate: dateSchema,
    totalScore: z.number().int(),
    maxPossibleScore: z.number().int().nonnegative(),
  });
export const learnspaceExportSensoryProfileRecordSchema =
  observationRecordSchema.extend({
    observationType: z.literal('SENSORY_PROFILE'),
    observationDate: dateSchema,
    totalRawScore: z.number().int(),
  });
export const learnspaceExportSfaObservationRecordSchema =
  observationRecordSchema.extend({
    observationType: z.literal('SFA'),
    assessmentDate: dateSchema,
    observationDate: dateSchema.optional(),
    participationAverage: z.number().finite(),
  });

export const learnspaceExportIepRecordSchema = sourceRecordSchema.extend({
  studentId: sourceIdSchema,
  assignedTeacherId: sourceIdSchema.optional(),
  createdBy: sourceIdSchema,
  updatedBy: sourceIdSchema,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  goals: collection(sourceRecordSchema),
});

export const learnspaceExportWeeklyReportRecordSchema =
  sourceRecordSchema.extend({
    studentId: sourceIdSchema,
    iepId: sourceIdSchema,
    teacherId: sourceIdSchema,
    year: z.string().regex(/^\d{4}$/, 'Expected a four-digit year.'),
    weekNumber: z.number().int().min(1).max(53),
    weekStart: dateSchema,
    weekEnd: dateSchema,
    createdAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
    goalProgress: collection(
      z
        .object({
          goalId: sourceIdSchema,
          addressedThisWeek: z.boolean(),
          rating: z.number().int().min(1).max(5).optional(),
        })
        .passthrough(),
    ),
  });

export const learnspaceExportOrganizationMappingSchema = z
  .object({
    sourceKey: z.string().trim().min(1).max(200),
    targetOrganizationId: z.string().uuid().nullable(),
    academicYears: collection(textSchema),
    semesters: collection(textSchema),
    units: collection(textSchema),
    grades: collection(textSchema),
    classes: collection(textSchema),
    subjects: collection(textSchema),
  })
  .strict();

export const learnspaceExportRecordsSchema = z
  .object({
    users: collection(learnspaceExportUserRecordSchema),
    students: collection(learnspaceExportStudentRecordSchema),
    learningJourneys: collection(learnspaceExportLearningJourneyRecordSchema),
    observationDefinitions: collection(
      learnspaceExportObservationDefinitionRecordSchema,
    ),
    observationAssignments: collection(
      learnspaceExportObservationAssignmentRecordSchema,
    ),
    fedcObservations: collection(learnspaceExportFedcObservationRecordSchema),
    sensoryProfileObservations: collection(
      learnspaceExportSensoryProfileRecordSchema,
    ),
    sfaObservations: collection(learnspaceExportSfaObservationRecordSchema),
    ieps: collection(learnspaceExportIepRecordSchema),
    weeklyReports: collection(learnspaceExportWeeklyReportRecordSchema),
  })
  .strict();

const addDuplicateIssues = (
  values: readonly { id: string }[],
  collectionName: string,
  context: z.RefinementCtx,
) => {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['records', collectionName, index, 'id'],
        message: `Duplicate ${collectionName} source ID "${value.id}".`,
      });
    }
    seen.add(value.id);
  });
};

export const learnspaceExportV1Schema = z
  .object({
    format: z.literal(LEARNSPACE_EXPORT_FORMAT),
    version: z.literal(LEARNSPACE_EXPORT_VERSION),
    exportedAt: dateTimeSchema,
    source: z
      .object({
        application: z.literal('learnspace-web'),
        applicationVersion: z.string().trim().min(1).max(100),
        storageVersion: z.literal(2),
      })
      .strict(),
    organization: learnspaceExportOrganizationMappingSchema,
    records: learnspaceExportRecordsSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const collections = value.records;
    for (const [name, records] of Object.entries(collections)) {
      addDuplicateIssues(records, name, context);
    }

    const userIds = new Set(collections.users.map(({ id }) => id));
    const studentIds = new Set(collections.students.map(({ id }) => id));
    const ieps = new Map(collections.ieps.map((iep) => [iep.id, iep]));
    const observationIds = new Map<string, string>([
      ...collections.fedcObservations.map(({ id }) => [id, 'FEDC'] as const),
      ...collections.sensoryProfileObservations.map(
        ({ id }) => [id, 'SENSORY_PROFILE'] as const,
      ),
      ...collections.sfaObservations.map(({ id }) => [id, 'SFA'] as const),
    ]);

    const requireReference = (
      exists: boolean,
      path: (string | number)[],
      message: string,
    ) => {
      if (!exists) {
        context.addIssue({ code: z.ZodIssueCode.custom, path, message });
      }
    };

    collections.students.forEach((student, index) => {
      if (typeof student.assignedGPKTeacherId === 'string') {
        requireReference(
          userIds.has(student.assignedGPKTeacherId),
          ['records', 'students', index, 'assignedGPKTeacherId'],
          `Unknown user source ID "${student.assignedGPKTeacherId}".`,
        );
      }
    });
    collections.learningJourneys.forEach((journey, index) => {
      [...journey.ownerIds, journey.createdBy, journey.updatedBy].forEach(
        (userId) =>
          requireReference(
            userIds.has(userId),
            ['records', 'learningJourneys', index],
            `Unknown user source ID "${userId}".`,
          ),
      );
    });
    collections.observationAssignments.forEach((assignment, index) => {
      requireReference(
        studentIds.has(assignment.studentId),
        ['records', 'observationAssignments', index, 'studentId'],
        `Unknown student source ID "${assignment.studentId}".`,
      );
      requireReference(
        userIds.has(assignment.assignedToUserId),
        ['records', 'observationAssignments', index, 'assignedToUserId'],
        `Unknown user source ID "${assignment.assignedToUserId}".`,
      );
      if (assignment.recordId) {
        requireReference(
          observationIds.get(assignment.recordId) === assignment.instrumentType,
          ['records', 'observationAssignments', index, 'recordId'],
          `Observation record "${assignment.recordId}" is missing or has a different instrument type.`,
        );
      }
    });
    const observationCollections = [
      ['fedcObservations', collections.fedcObservations],
      ['sensoryProfileObservations', collections.sensoryProfileObservations],
      ['sfaObservations', collections.sfaObservations],
    ] as const;
    observationCollections.forEach(([name, records]) =>
      records.forEach((record, index) => {
        requireReference(
          studentIds.has(record.studentId),
          ['records', name, index, 'studentId'],
          `Unknown student source ID "${record.studentId}".`,
        );
        requireReference(
          userIds.has(record.observerId),
          ['records', name, index, 'observerId'],
          `Unknown user source ID "${record.observerId}".`,
        );
      }),
    );
    collections.ieps.forEach((iep, index) => {
      requireReference(
        studentIds.has(iep.studentId),
        ['records', 'ieps', index, 'studentId'],
        `Unknown student source ID "${iep.studentId}".`,
      );
      [iep.assignedTeacherId, iep.createdBy, iep.updatedBy]
        .filter((id): id is string => Boolean(id))
        .forEach((userId) =>
          requireReference(
            userIds.has(userId),
            ['records', 'ieps', index],
            `Unknown user source ID "${userId}".`,
          ),
        );
    });
    collections.weeklyReports.forEach((report, index) => {
      const iep = ieps.get(report.iepId);
      requireReference(
        studentIds.has(report.studentId),
        ['records', 'weeklyReports', index, 'studentId'],
        `Unknown student source ID "${report.studentId}".`,
      );
      requireReference(
        userIds.has(report.teacherId),
        ['records', 'weeklyReports', index, 'teacherId'],
        `Unknown user source ID "${report.teacherId}".`,
      );
      requireReference(
        Boolean(iep),
        ['records', 'weeklyReports', index, 'iepId'],
        `Unknown IEP source ID "${report.iepId}".`,
      );
      if (iep && iep.studentId !== report.studentId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['records', 'weeklyReports', index, 'studentId'],
          message: `Weekly report student does not match IEP "${report.iepId}".`,
        });
      }
      const goalIds = new Set(iep?.goals.map(({ id }) => id) ?? []);
      report.goalProgress.forEach((progress, progressIndex) =>
        requireReference(
          goalIds.has(progress.goalId),
          [
            'records',
            'weeklyReports',
            index,
            'goalProgress',
            progressIndex,
            'goalId',
          ],
          `Unknown goal source ID "${progress.goalId}" for IEP "${report.iepId}".`,
        ),
      );
    });
  });

export const learnspaceExportSchema = z
  .unknown()
  .superRefine((input, context) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expected a learnspace-export object.',
      });
      return;
    }
    const envelope = input as Record<string, unknown>;
    if (envelope.format !== LEARNSPACE_EXPORT_FORMAT) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['format'],
        message: `Expected format "${LEARNSPACE_EXPORT_FORMAT}".`,
      });
      return;
    }
    if (envelope.version !== LEARNSPACE_EXPORT_VERSION) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['version'],
        message: `Unsupported learnspace-export version ${String(envelope.version)}. Supported versions: ${LEARNSPACE_EXPORT_VERSION}.`,
      });
      return;
    }
    const result = learnspaceExportV1Schema.safeParse(input);
    if (!result.success) {
      result.error.issues.forEach((issue) => context.addIssue(issue));
    }
  })
  .transform((input) => input as LearnspaceExportV1);

export type LearnspaceExportUserRecord = z.infer<
  typeof learnspaceExportUserRecordSchema
>;
export type LearnspaceExportStudentRecord = z.infer<
  typeof learnspaceExportStudentRecordSchema
>;
export type LearnspaceExportRecords = z.infer<
  typeof learnspaceExportRecordsSchema
>;
export type LearnspaceExportV1 = z.infer<typeof learnspaceExportV1Schema>;
export type LearnspaceExport = z.infer<typeof learnspaceExportSchema>;
