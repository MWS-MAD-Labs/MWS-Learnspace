import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const schoolDateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Expected an ISO 8601 calendar date (YYYY-MM-DD).',
  )
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, 'Expected a valid calendar date.');

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

export const studentEnrollmentSummarySchema = z
  .object({
    id: uuidSchema,
    academicYearId: uuidSchema,
    classId: uuidSchema,
    className: z.string().min(1),
    unitId: uuidSchema,
    gradeId: uuidSchema,
    startsOn: schoolDateSchema,
    endsOn: schoolDateSchema.nullable(),
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
    enrollments: z.array(studentEnrollmentSummarySchema),
  })
  .strict();
export const studentsResponseSchema = z
  .object({ data: z.array(studentListItemSchema), meta: collectionMetaSchema })
  .strict();
export const studentDetailResponseSchema = z
  .object({ data: studentListItemSchema })
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

export type OrganizationsResponse = z.infer<typeof organizationsResponseSchema>;
export type AcademicYearsResponse = z.infer<typeof academicYearsResponseSchema>;
export type UnitsResponse = z.infer<typeof unitsResponseSchema>;
export type GradesResponse = z.infer<typeof gradesResponseSchema>;
export type ClassesResponse = z.infer<typeof classesResponseSchema>;
export type SubjectsResponse = z.infer<typeof subjectsResponseSchema>;
export type StudentListQuery = z.infer<typeof studentListQuerySchema>;
export type StudentsResponse = z.infer<typeof studentsResponseSchema>;
export type StudentDetailResponse = z.infer<typeof studentDetailResponseSchema>;
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
