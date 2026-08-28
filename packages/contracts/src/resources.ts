import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const schoolDateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Expected an ISO 8601 calendar date (YYYY-MM-DD).',
  )
  .date('Expected a valid calendar date.')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, 'Expected a valid calendar date.');

export const strictBooleanSchema = z.custom<boolean>(
  (value) => typeof value === 'boolean',
  'Expected a boolean.',
);

export const attendanceStatusSchema = z.enum([
  'PRESENT',
  'LATE',
  'SICK',
  'EXCUSED_ABSENCE',
  'UNEXCUSED_ABSENCE',
]);
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;

export const collectionMetaSchema = z
  .object({ count: z.number().int().nonnegative() })
  .strict();

export const organizationSummarySchema = z
  .object({ id: uuidSchema, slug: z.string().min(1), name: z.string().min(1) })
  .strict();
export const organizationsResponseSchema = z
  .object({
    data: z.array(organizationSummarySchema),
    meta: collectionMetaSchema,
  })
  .strict();

export const ianaTimezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, 'Expected a valid IANA timezone identifier.');
export const organizationSettingsSchema = z
  .object({
    organizationId: uuidSchema,
    name: z.string().min(1),
    timezone: ianaTimezoneSchema,
  })
  .strict();
export const organizationSettingsResponseSchema = z
  .object({ data: organizationSettingsSchema })
  .strict();
export const organizationSettingsUpdateCommandSchema = z
  .object({ timezone: ianaTimezoneSchema })
  .strict();
export const organizationSchoolDateResponseSchema = z
  .object({
    data: z.object({
      organizationId: uuidSchema,
      timezone: ianaTimezoneSchema,
      schoolDate: schoolDateSchema,
    }),
  })
  .strict();

export const academicYearSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    name: z.string().min(1),
    startsOn: schoolDateSchema,
    endsOn: schoolDateSchema,
  })
  .strict();
export const academicYearsResponseSchema = z
  .object({ data: z.array(academicYearSchema), meta: collectionMetaSchema })
  .strict();

export const unitSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    code: z.string().min(1),
    name: z.string().min(1),
  })
  .strict();
export const unitsResponseSchema = z
  .object({ data: z.array(unitSchema), meta: collectionMetaSchema })
  .strict();

export const gradeSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    unitId: uuidSchema,
    code: z.string().min(1),
    name: z.string().min(1),
    position: z.number().int(),
  })
  .strict();
export const gradesResponseSchema = z
  .object({ data: z.array(gradeSchema), meta: collectionMetaSchema })
  .strict();

export const classSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    unitId: uuidSchema,
    gradeId: uuidSchema,
    code: z.string().min(1),
    name: z.string().min(1),
  })
  .strict();
export const classesResponseSchema = z
  .object({ data: z.array(classSchema), meta: collectionMetaSchema })
  .strict();

export const subjectSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    code: z.string().min(1),
    name: z.string().min(1),
  })
  .strict();
export const subjectsResponseSchema = z
  .object({ data: z.array(subjectSchema), meta: collectionMetaSchema })
  .strict();

export const staffMembershipRoleSchema = z.enum([
  'PRINCIPAL',
  'DIRECTOR',
  'GRADE_TEACHER',
  'SUBJECT_TEACHER',
  'SPECIAL_ED_COORDINATOR',
  'SPECIAL_ED_TEACHER',
  'SPECIALIST',
]);
export const accountStatusSchema = z.enum(['ACTIVE', 'DISABLED']);
export const genderSchema = z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']);

export const staffDirectoryItemSchema = z
  .object({
    membershipId: uuidSchema,
    userId: uuidSchema,
    organizationId: uuidSchema,
    displayName: z.string().min(1),
    avatarUrl: z.string().url().nullable(),
    role: staffMembershipRoleSchema,
    roleTitle: z.string().nullable(),
    status: z.literal('ACTIVE'),
  })
  .strict();
export const staffDirectoryResponseSchema = z
  .object({
    data: z.array(staffDirectoryItemSchema),
    meta: collectionMetaSchema,
  })
  .strict();

export const organizationAccountSchema = z
  .object({
    membershipId: uuidSchema,
    organizationId: uuidSchema,
    userId: uuidSchema,
    email: z.string().email(),
    displayName: z.string().min(1),
    avatarUrl: z.string().url().nullable(),
    userStatus: accountStatusSchema,
    role: staffMembershipRoleSchema,
    roleTitle: z.string().nullable(),
    membershipStatus: accountStatusSchema,
    unitIds: z.array(uuidSchema),
    gradeIds: z.array(uuidSchema),
    subjectIds: z.array(uuidSchema),
    updatedAt: z.string().datetime(),
  })
  .strict();
export const organizationAccountsResponseSchema = z
  .object({
    data: z.array(organizationAccountSchema),
    meta: collectionMetaSchema,
  })
  .strict();

const membershipScopeCommandFields = {
  unitIds: z.array(uuidSchema).max(100).optional(),
  gradeIds: z.array(uuidSchema).max(100).optional(),
  subjectIds: z.array(uuidSchema).max(100).optional(),
};

export const organizationAccountCreateCommandSchema = z
  .object({
    email: z.string().trim().email().max(320),
    displayName: z.string().trim().min(1).max(256),
    avatarUrl: z.string().url().nullable().optional(),
    role: staffMembershipRoleSchema,
    roleTitle: nullableTrimmedText(128).optional(),
    ...membershipScopeCommandFields,
  })
  .strict();

export const organizationAccountUpdateCommandSchema = z
  .object({
    email: z.string().trim().email().max(320).optional(),
    displayName: z.string().trim().min(1).max(256).optional(),
    avatarUrl: z.string().url().nullable().optional(),
    userStatus: accountStatusSchema.optional(),
    role: staffMembershipRoleSchema.optional(),
    roleTitle: nullableTrimmedText(128).optional(),
    membershipStatus: accountStatusSchema.optional(),
    ...membershipScopeCommandFields,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one account field is required.',
  });
export const organizationAccountMutationResponseSchema = z
  .object({ data: organizationAccountSchema })
  .strict();

export const studentEnrollmentSummarySchema = z
  .object({
    id: uuidSchema,
    academicYearId: uuidSchema,
    classId: uuidSchema,
    className: z.string().min(1),
    unitId: uuidSchema,
    unitName: z.string().min(1),
    gradeId: uuidSchema,
    gradeName: z.string().min(1),
    startsOn: schoolDateSchema,
    endsOn: schoolDateSchema.nullable(),
  })
  .strict();

export const gpkStaffSummarySchema = z
  .object({
    membershipId: uuidSchema,
    userId: uuidSchema,
    displayName: z.string().min(1),
    avatarUrl: z.string().url().nullable(),
    roleTitle: z.string().nullable(),
  })
  .strict();

export const activeGpkAssignmentSummarySchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    studentId: uuidSchema,
    roleContext: z.literal('GPK'),
    startsOn: schoolDateSchema,
    endsOn: schoolDateSchema.nullable(),
    maxCaseload: z.number().int().positive(),
    staff: gpkStaffSummarySchema,
  })
  .strict();

export const studentSummarySchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    studentNumber: z.string().min(1),
    fullName: z.string().min(1),
    nickname: z.string().nullable(),
    avatarUrl: z.string().url().nullable(),
  })
  .strict();
export const studentListItemSchema = studentSummarySchema
  .extend({
    gender: genderSchema,
    dateOfBirth: schoolDateSchema,
    specialNeedsFlag: strictBooleanSchema,
    status: accountStatusSchema,
    primaryClassification: z.string().nullable(),
    currentPlacement: z.string().nullable(),
    enrollments: z.array(studentEnrollmentSummarySchema),
    activeEnrollment: studentEnrollmentSummarySchema.nullable(),
    activeGpkAssignment: activeGpkAssignmentSummarySchema.nullable(),
  })
  .strict();
export const studentsResponseSchema = z
  .object({ data: z.array(studentListItemSchema), meta: collectionMetaSchema })
  .strict();

export const guardianContactSchema = z
  .object({
    id: uuidSchema,
    name: z.string().min(1),
    relationship: z.string().min(1),
    phone: z.string().nullable(),
    email: z.string().email().nullable(),
    address: z.string().nullable(),
    isPrimary: strictBooleanSchema,
  })
  .strict();
export const studentDetailSchema = studentListItemSchema
  .extend({
    address: z.string().nullable(),
    guardians: z.array(guardianContactSchema),
  })
  .strict();
export const studentDetailResponseSchema = z
  .object({ data: studentDetailSchema })
  .strict();

function nullableTrimmedText(maximum: number) {
  return z.string().trim().min(1).max(maximum).nullable();
}

export const studentEnrollmentCommandSchema = z
  .object({
    academicYearId: uuidSchema,
    classId: uuidSchema,
    startsOn: schoolDateSchema,
    endsOn: schoolDateSchema.nullable().optional(),
  })
  .strict()
  .refine((value) => !value.endsOn || value.endsOn >= value.startsOn, {
    path: ['endsOn'],
    message: 'endsOn must be on or after startsOn.',
  });

export const studentCreateCommandSchema = z
  .object({
    studentNumber: z.string().trim().min(1).max(64),
    fullName: z.string().trim().min(1).max(256),
    nickname: nullableTrimmedText(128).optional(),
    gender: genderSchema,
    dateOfBirth: schoolDateSchema,
    address: nullableTrimmedText(1000).optional(),
    specialNeedsFlag: strictBooleanSchema.optional(),
    status: accountStatusSchema.optional(),
    avatarUrl: z.string().url().nullable().optional(),
    primaryClassification: nullableTrimmedText(256).optional(),
    currentPlacement: nullableTrimmedText(256).optional(),
    activeEnrollment: studentEnrollmentCommandSchema.optional(),
  })
  .strict();

export const studentUpdateCommandSchema = z
  .object({
    studentNumber: z.string().trim().min(1).max(64).optional(),
    fullName: z.string().trim().min(1).max(256).optional(),
    nickname: nullableTrimmedText(128).optional(),
    gender: genderSchema.optional(),
    dateOfBirth: schoolDateSchema.optional(),
    address: nullableTrimmedText(1000).optional(),
    specialNeedsFlag: strictBooleanSchema.optional(),
    status: accountStatusSchema.optional(),
    avatarUrl: z.string().url().nullable().optional(),
    primaryClassification: nullableTrimmedText(256).optional(),
    currentPlacement: nullableTrimmedText(256).optional(),
    activeEnrollment: studentEnrollmentCommandSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one student field is required.',
  });

export const studentMutationResponseSchema = z
  .object({ data: studentDetailSchema })
  .strict();

export const gpkAssignmentQuerySchema = z
  .object({
    schoolDate: schoolDateSchema.optional(),
    studentId: uuidSchema.optional(),
    membershipId: uuidSchema.optional(),
  })
  .strict();

export const gpkAssignmentSchema = activeGpkAssignmentSummarySchema
  .extend({
    student: studentSummarySchema,
  })
  .strict();
export const gpkAssignmentsResponseSchema = z
  .object({ data: z.array(gpkAssignmentSchema), meta: collectionMetaSchema })
  .strict();

export const gpkAssignmentUpsertCommandSchema = z
  .object({
    membershipId: uuidSchema,
    startsOn: schoolDateSchema,
    endsOn: schoolDateSchema.nullable().optional(),
  })
  .strict()
  .refine((value) => !value.endsOn || value.endsOn >= value.startsOn, {
    path: ['endsOn'],
    message: 'endsOn must be on or after startsOn.',
  });
export const gpkAssignmentEndCommandSchema = z
  .object({ endsOn: schoolDateSchema })
  .strict();
export const gpkAssignmentMutationResponseSchema = z
  .object({ data: gpkAssignmentSchema })
  .strict();

export const studentListQuerySchema = z
  .object({
    schoolDate: schoolDateSchema.optional(),
    classId: uuidSchema.optional(),
    unitId: uuidSchema.optional(),
    gradeId: uuidSchema.optional(),
  })
  .strict();

export const attendanceQuerySchema = z
  .object({ schoolDate: schoolDateSchema })
  .strict();
export const attendanceRecordSchema = z
  .object({
    id: uuidSchema,
    status: attendanceStatusSchema,
    minutesLate: z.number().int().min(1).max(1440).nullable(),
    notes: z.string().max(1000).nullable(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export const attendanceRosterItemSchema = z
  .object({
    student: studentSummarySchema,
    enrollmentId: uuidSchema,
    attendance: attendanceRecordSchema.nullable(),
  })
  .strict();
export const attendanceRosterResponseSchema = z
  .object({
    data: z
      .object({
        organizationId: uuidSchema,
        class: classSchema,
        schoolDate: schoolDateSchema,
        version: z.string().min(1),
        roster: z.array(attendanceRosterItemSchema),
      })
      .strict(),
  })
  .strict();

export const attendanceSaveItemSchema = z
  .object({
    studentId: uuidSchema,
    status: attendanceStatusSchema,
    minutesLate: z.number().int().min(1).max(1440).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === 'LATE' && value.minutesLate == null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minutesLate'],
        message: 'minutesLate is required when status is LATE.',
      });
    }
    if (value.status !== 'LATE' && value.minutesLate != null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minutesLate'],
        message: 'minutesLate is only allowed when status is LATE.',
      });
    }
  });

export const attendanceBulkSaveCommandSchema = z
  .object({
    schoolDate: schoolDateSchema,
    expectedVersion: z.string().min(1).max(128),
    records: z.array(attendanceSaveItemSchema).min(1).max(500),
  })
  .strict()
  .superRefine((value, context) => {
    const seen = new Set<string>();
    value.records.forEach((record, index) => {
      if (seen.has(record.studentId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['records', index, 'studentId'],
          message: 'Duplicate studentId in attendance command.',
        });
      }
      seen.add(record.studentId);
    });
  });

export const attendanceBulkSaveResponseSchema = z
  .object({
    data: z
      .object({
        schoolDate: schoolDateSchema,
        version: z.string().min(1),
        savedCount: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export const observationTypeSchema = z.enum(['FEDC', 'SENSORY_PROFILE', 'SFA']);
export type ObservationType = z.infer<typeof observationTypeSchema>;

export const observationStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);
export type ObservationStatus = z.infer<typeof observationStatusSchema>;

const jsonPrimitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
type JsonValue =
  | z.infer<typeof jsonPrimitiveSchema>
  | JsonValue[]
  | { [key: string]: JsonValue };
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    jsonPrimitiveSchema,
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);
const observationDefinitionBodySchema = z.record(jsonValueSchema);

const observationDefinitionBodyFields = {
  title: z.string().trim().min(1).max(256),
  framework: nullableTrimmedText(256).optional(),
  description: nullableTrimmedText(10000).optional(),
  targetAges: nullableTrimmedText(256).optional(),
  defaultFrequency: nullableTrimmedText(256).optional(),
  body: observationDefinitionBodySchema,
  isActive: strictBooleanSchema.optional(),
};

export const observationDefinitionSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    definitionKey: z.string().min(1),
    version: z.number().int().positive(),
    type: observationTypeSchema,
    title: z.string().min(1),
    framework: z.string().nullable(),
    description: z.string().nullable(),
    targetAges: z.string().nullable(),
    defaultFrequency: z.string().nullable(),
    body: observationDefinitionBodySchema,
    isActive: strictBooleanSchema,
    publishedAt: z.string().datetime(),
    createdAt: z.string().datetime(),
  })
  .strict();
export const observationDefinitionsResponseSchema = z
  .object({
    data: z.array(observationDefinitionSchema),
    meta: collectionMetaSchema,
  })
  .strict();
export const observationDefinitionMutationResponseSchema = z
  .object({ data: observationDefinitionSchema })
  .strict();
export const observationDefinitionCreateCommandSchema = z
  .object({
    definitionKey: z.string().trim().min(1).max(128),
    type: observationTypeSchema,
    ...observationDefinitionBodyFields,
  })
  .strict();
export const observationDefinitionVersionCreateCommandSchema = z
  .object(observationDefinitionBodyFields)
  .strict();

const observationPersonSummarySchema = z
  .object({ id: uuidSchema, displayName: z.string().min(1) })
  .strict();
const observationAssigneeSummarySchema = z
  .object({
    membershipId: uuidSchema,
    userId: uuidSchema,
    displayName: z.string().min(1),
    role: staffMembershipRoleSchema,
    roleTitle: z.string().nullable(),
  })
  .strict();
const observationDefinitionSummarySchema = z
  .object({
    id: uuidSchema,
    definitionKey: z.string().min(1),
    version: z.number().int().positive(),
    type: observationTypeSchema,
    title: z.string().min(1),
    body: observationDefinitionBodySchema,
    isActive: strictBooleanSchema,
    publishedAt: z.string().datetime(),
  })
  .strict();

export const observationAssignmentSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    status: observationStatusSchema,
    academicYear: z.string().min(1),
    dueDate: schoolDateSchema,
    priority: z.string().nullable(),
    notes: z.string().nullable(),
    assignedAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable(),
    cancelledAt: z.string().datetime().nullable(),
    cancellationReason: z.string().nullable(),
    student: studentSummarySchema,
    definition: observationDefinitionSummarySchema,
    assignedTo: observationAssigneeSummarySchema,
    assignedBy: observationPersonSummarySchema.nullable(),
    cancelledBy: observationPersonSummarySchema.nullable(),
    hasObservationRecord: strictBooleanSchema,
  })
  .strict();
export const observationAssignmentsResponseSchema = z
  .object({
    data: z.array(observationAssignmentSchema),
    meta: collectionMetaSchema,
  })
  .strict();

const observationAssignmentWriteFields = {
  definitionId: uuidSchema,
  assignedToMembershipId: uuidSchema,
  studentId: uuidSchema,
  academicYear: z.string().trim().min(1).max(64),
  dueDate: schoolDateSchema,
  priority: nullableTrimmedText(64).optional(),
  notes: nullableTrimmedText(4000).optional(),
};
export const observationAssignmentCreateCommandSchema = z
  .object(observationAssignmentWriteFields)
  .strict();
export const observationAssignmentUpdateCommandSchema = z
  .object({
    definitionId: uuidSchema.optional(),
    assignedToMembershipId: uuidSchema.optional(),
    studentId: uuidSchema.optional(),
    academicYear: z.string().trim().min(1).max(64).optional(),
    dueDate: schoolDateSchema.optional(),
    priority: nullableTrimmedText(64).optional(),
    notes: nullableTrimmedText(4000).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one assignment field is required.',
  });
export const observationAssignmentCancelCommandSchema = z
  .object({ reason: z.string().trim().min(1).max(1000) })
  .strict();
export const observationAssignmentMutationResponseSchema = z
  .object({ data: observationAssignmentSchema })
  .strict();

export type ObservationDefinition = z.infer<typeof observationDefinitionSchema>;
export type ObservationAssignment = z.infer<typeof observationAssignmentSchema>;
export type ObservationDefinitionCreateCommand = z.infer<
  typeof observationDefinitionCreateCommandSchema
>;
export type ObservationDefinitionVersionCreateCommand = z.infer<
  typeof observationDefinitionVersionCreateCommandSchema
>;
export type ObservationAssignmentCreateCommand = z.infer<
  typeof observationAssignmentCreateCommandSchema
>;
export type ObservationAssignmentUpdateCommand = z.infer<
  typeof observationAssignmentUpdateCommandSchema
>;
export type ObservationAssignmentCancelCommand = z.infer<
  typeof observationAssignmentCancelCommandSchema
>;

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

export const workflowStateSchema = z.enum([
  'DRAFT',
  'PRINCIPAL_REVIEW',
  'COORDINATOR_REVIEW',
  'DIRECTOR_APPROVAL',
  'APPROVED',
  'ACTIVE',
  'ARCHIVED',
]);

export const semesterSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    academicYearId: uuidSchema,
    name: z.string().min(1),
    position: z.number().int(),
    startsOn: schoolDateSchema,
    endsOn: schoolDateSchema,
  })
  .strict();
export const semestersResponseSchema = z
  .object({ data: z.array(semesterSchema), meta: collectionMetaSchema })
  .strict();

export const learningJourneyOwnerSummarySchema = z
  .object({
    membershipId: uuidSchema,
    userId: uuidSchema,
    displayName: z.string().min(1),
    role: staffMembershipRoleSchema,
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
        role: staffMembershipRoleSchema.nullable(),
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
  .extend({
    projects: z.array(learningJourneyProjectSchema),
  })
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

export type OrganizationsResponse = z.infer<typeof organizationsResponseSchema>;
export type OrganizationSettingsResponse = z.infer<
  typeof organizationSettingsResponseSchema
>;
export type OrganizationSettingsUpdateCommand = z.infer<
  typeof organizationSettingsUpdateCommandSchema
>;
export type OrganizationSchoolDateResponse = z.infer<
  typeof organizationSchoolDateResponseSchema
>;
export type AcademicYearsResponse = z.infer<typeof academicYearsResponseSchema>;
export type SemestersResponse = z.infer<typeof semestersResponseSchema>;
export type UnitsResponse = z.infer<typeof unitsResponseSchema>;
export type GradesResponse = z.infer<typeof gradesResponseSchema>;
export type ClassesResponse = z.infer<typeof classesResponseSchema>;
export type SubjectsResponse = z.infer<typeof subjectsResponseSchema>;
export type StaffDirectoryResponse = z.infer<
  typeof staffDirectoryResponseSchema
>;
export type OrganizationAccountsResponse = z.infer<
  typeof organizationAccountsResponseSchema
>;
export type OrganizationAccountCreateCommand = z.infer<
  typeof organizationAccountCreateCommandSchema
>;
export type OrganizationAccountUpdateCommand = z.infer<
  typeof organizationAccountUpdateCommandSchema
>;
export type OrganizationAccountMutationResponse = z.infer<
  typeof organizationAccountMutationResponseSchema
>;
export type StudentListQuery = z.infer<typeof studentListQuerySchema>;
export type StudentsResponse = z.infer<typeof studentsResponseSchema>;
export type StudentDetailResponse = z.infer<typeof studentDetailResponseSchema>;
export type StudentCreateCommand = z.infer<typeof studentCreateCommandSchema>;
export type StudentUpdateCommand = z.infer<typeof studentUpdateCommandSchema>;
export type StudentMutationResponse = z.infer<
  typeof studentMutationResponseSchema
>;
export type GpkAssignmentQuery = z.infer<typeof gpkAssignmentQuerySchema>;
export type GpkAssignmentsResponse = z.infer<
  typeof gpkAssignmentsResponseSchema
>;
export type GpkAssignmentUpsertCommand = z.infer<
  typeof gpkAssignmentUpsertCommandSchema
>;
export type GpkAssignmentEndCommand = z.infer<
  typeof gpkAssignmentEndCommandSchema
>;
export type GpkAssignmentMutationResponse = z.infer<
  typeof gpkAssignmentMutationResponseSchema
>;
export type AttendanceQuery = z.infer<typeof attendanceQuerySchema>;
export type AttendanceRosterResponse = z.infer<
  typeof attendanceRosterResponseSchema
>;
export type AttendanceBulkSaveCommand = z.infer<
  typeof attendanceBulkSaveCommandSchema
>;
export type AttendanceBulkSaveResponse = z.infer<
  typeof attendanceBulkSaveResponseSchema
>;
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
