import { z } from 'zod';
import { classSchema } from './academics.js';
import {
  collectionMetaSchema,
  nullableTrimmedText,
  schoolDateSchema,
  strictBooleanSchema,
  uuidSchema,
} from './common.js';

export const attendanceStatusSchema = z.enum([
  'PRESENT',
  'LATE',
  'SICK',
  'EXCUSED_ABSENCE',
  'UNEXCUSED_ABSENCE',
]);
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;

export const staffMembershipRoleSchema = z.enum([
  'PRINCIPAL',
  'DIRECTOR',
  'GRADE_TEACHER',
  'SUBJECT_TEACHER',
  'SPECIAL_ED_COORDINATOR',
  'SPECIAL_ED_TEACHER',
  'SPECIALIST',
]);
// A role is the key of a Central role, so what the API answers is any text. Only the account commands below still
// limit it to the built-in roles, until Central owns invitations.
export const roleKeySchema = z.string().min(1).max(128);
export const accountStatusSchema = z.enum(['ACTIVE', 'DISABLED']);
export const genderSchema = z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']);

export const staffDirectoryItemSchema = z
  .object({
    membershipId: uuidSchema,
    userId: uuidSchema,
    organizationId: uuidSchema,
    displayName: z.string().min(1),
    avatarUrl: z.string().url().nullable(),
    role: roleKeySchema,
    roleTitle: z.string().nullable(),
    // What the person may do, so a screen can tell a coordinator from a teacher without knowing role names.
    permissions: z.array(z.string()),
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
    role: roleKeySchema,
    roleTitle: z.string().nullable(),
    // What the role allows. It decides which scopes make sense: grade scopes, subject scopes or none.
    permissions: z.array(z.string()),
    // The role reaches rows by grade or by subject and nothing is assigned yet.
    needsScope: z.boolean(),
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
    // When Central manages accounts, a person is made and changed there. Only scopes, role title and status stay here.
    meta: collectionMetaSchema.extend({
      managedByCentral: z.boolean(),
      // The classes and subjects of a person come from Central too, so they are shown and not edited here.
      scopesManagedByCentral: z.boolean(),
    }),
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
  .extend({ student: studentSummarySchema })
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
