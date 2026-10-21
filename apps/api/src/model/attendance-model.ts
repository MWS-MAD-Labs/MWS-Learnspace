import type { AttendanceRosterResponse } from '@learnspace/contracts';
import type { Prisma } from '@prisma/client';

export const attendanceClassSelect = {
  id: true,
  organizationId: true,
  unitId: true,
  gradeId: true,
  code: true,
  name: true,
} satisfies Prisma.SchoolClassSelect;

export const attendanceRosterSelect = {
  id: true,
  student: {
    select: {
      id: true,
      organizationId: true,
      studentNumber: true,
      fullName: true,
      nickname: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.EnrollmentSelect;

export type AttendanceClass = Prisma.SchoolClassGetPayload<{
  select: typeof attendanceClassSelect;
}>;
export type AttendanceRoster = Prisma.EnrollmentGetPayload<{
  select: typeof attendanceRosterSelect;
}>[];
export type AttendanceRecords = Prisma.AttendanceRecordGetPayload<object>[];

export function attendanceVersion(
  records: readonly { updatedAt: Date }[],
): string {
  const latest = records.reduce(
    (maximum, record) => Math.max(maximum, record.updatedAt.getTime()),
    0,
  );
  return `${records.length}:${latest ? new Date(latest).toISOString() : 'none'}`;
}

export function mapAttendanceRoster(input: {
  organizationId: string;
  schoolDate: string;
  schoolClass: AttendanceClass;
  roster: AttendanceRoster;
  attendance: AttendanceRecords;
}): AttendanceRosterResponse['data'] {
  const byStudent = new Map(
    input.attendance.map((record) => [record.studentId, record]),
  );
  return {
    organizationId: input.organizationId,
    class: input.schoolClass,
    schoolDate: input.schoolDate,
    version: attendanceVersion(input.attendance),
    roster: input.roster.map((enrollment) => {
      const record = byStudent.get(enrollment.student.id);
      return {
        student: enrollment.student,
        enrollmentId: enrollment.id,
        attendance: record
          ? {
              id: record.id,
              status: record.status,
              minutesLate: record.minutesLate,
              notes: record.notes,
              updatedAt: record.updatedAt.toISOString(),
            }
          : null,
      };
    }),
  };
}
