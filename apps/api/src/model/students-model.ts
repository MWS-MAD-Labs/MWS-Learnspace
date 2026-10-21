import { Prisma } from '@prisma/client';
import { activeEnrollmentWhere } from '../utils/resource-access.js';
import { isoDate } from '../utils/resource-date.js';
import {
  activeGpkAssignmentSelect,
  mapGpkAssignment,
} from '../model/gpk-model.js';

function enrollmentSelect(
  schoolDate: Date,
  enrollmentFilter: Prisma.EnrollmentWhereInput = {},
) {
  return {
    where: { ...activeEnrollmentWhere(schoolDate), ...enrollmentFilter },
    orderBy: [{ startsOn: 'desc' as const }, { id: 'asc' as const }],
    select: {
      id: true,
      academicYearId: true,
      classId: true,
      startsOn: true,
      endsOn: true,
      schoolClass: {
        select: {
          name: true,
          unit: { select: { id: true, name: true } },
          grade: { select: { id: true, name: true } },
        },
      },
    },
  };
}

export function studentSelect(
  schoolDate: Date,
  enrollmentFilter: Prisma.EnrollmentWhereInput = {},
) {
  return {
    id: true,
    organizationId: true,
    studentNumber: true,
    fullName: true,
    nickname: true,
    gender: true,
    dateOfBirth: true,
    specialNeedsFlag: true,
    status: true,
    avatarUrl: true,
    primaryClassification: true,
    currentPlacement: true,
    enrollments: enrollmentSelect(schoolDate, enrollmentFilter),
    staffAssignments: activeGpkAssignmentSelect(schoolDate),
  } satisfies Prisma.StudentSelect;
}

export function studentMutationSelect(schoolDate: Date) {
  return {
    ...studentSelect(schoolDate),
    address: true,
    guardians: {
      orderBy: [{ isPrimary: 'desc' as const }, { name: 'asc' as const }],
      select: {
        id: true,
        name: true,
        relationship: true,
        phone: true,
        email: true,
        address: true,
        isPrimary: true,
      },
    },
  } satisfies Prisma.StudentSelect;
}

type SelectedStudent = Prisma.StudentGetPayload<{
  select: ReturnType<typeof studentSelect>;
}>;
type SelectedStudentDetail = Prisma.StudentGetPayload<{
  select: ReturnType<typeof studentMutationSelect>;
}>;

export function mapStudent(student: SelectedStudent) {
  const enrollments = student.enrollments.map((enrollment) => ({
    id: enrollment.id,
    academicYearId: enrollment.academicYearId,
    classId: enrollment.classId,
    className: enrollment.schoolClass.name,
    unitId: enrollment.schoolClass.unit.id,
    unitName: enrollment.schoolClass.unit.name,
    gradeId: enrollment.schoolClass.grade.id,
    gradeName: enrollment.schoolClass.grade.name,
    startsOn: isoDate(enrollment.startsOn),
    endsOn: enrollment.endsOn ? isoDate(enrollment.endsOn) : null,
  }));
  return {
    id: student.id,
    organizationId: student.organizationId,
    studentNumber: student.studentNumber,
    fullName: student.fullName,
    nickname: student.nickname,
    gender: student.gender,
    dateOfBirth: isoDate(student.dateOfBirth),
    specialNeedsFlag: student.specialNeedsFlag,
    status: student.status,
    avatarUrl: student.avatarUrl,
    primaryClassification: student.primaryClassification,
    currentPlacement: student.currentPlacement,
    enrollments,
    activeEnrollment: enrollments[0] ?? null,
    activeGpkAssignment: student.staffAssignments[0]
      ? mapGpkAssignment(student.staffAssignments[0])
      : null,
  };
}

export function mapStudentDetail(student: SelectedStudentDetail) {
  return {
    ...mapStudent(student),
    address: student.address,
    guardians: student.guardians,
  };
}
