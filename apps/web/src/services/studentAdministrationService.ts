import {
  gpkAssignmentMutationResponseSchema,
  staffDirectoryResponseSchema,
  studentsResponseSchema,
} from '@learnspace/contracts';
import type {
  GpkAssignmentMutationResponse,
  GpkAssignmentUpsertCommand,
  StaffDirectoryResponse,
  StudentsResponse,
} from '@learnspace/contracts';
import type { Student, User, UserRole } from '../types';
import { apiClient } from './apiClient';

function organizationPath(organizationId: string): string {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}`;
}

export function mapStaffDirectoryItemToUser(
  staff: StaffDirectoryResponse['data'][number],
): User {
  return {
    id: staff.userId,
    membershipId: staff.membershipId,
    name: staff.displayName,
    email: '',
    role: staff.role as UserRole,
    roleTitle: staff.roleTitle ?? staff.role.replaceAll('_', ' '),
    avatarUrl: staff.avatarUrl ?? undefined,
    unitIds: [],
    gradeIds: [],
    subjectIds: [],
    isGPK: staff.role === 'SPECIAL_ED_TEACHER',
    isSpecialEdCoordinator: staff.role === 'SPECIAL_ED_COORDINATOR',
    permissions: [],
  };
}

function mapGender(
  gender: StudentsResponse['data'][number]['gender'],
): Student['gender'] {
  switch (gender) {
    case 'MALE':
      return 'Male';
    case 'FEMALE':
      return 'Female';
    case 'OTHER':
      return 'Other';
    case 'UNSPECIFIED':
      return 'Unspecified';
  }
}

export function mapStudentListItemToStudent(
  student: StudentsResponse['data'][number],
): Student {
  const enrollment = student.activeEnrollment;
  const gpkAssignment = student.activeGpkAssignment;

  return {
    id: student.id,
    studentNumber: student.studentNumber,
    fullName: student.fullName,
    name: student.fullName,
    nickname: student.nickname ?? undefined,
    gender: mapGender(student.gender),
    dateOfBirth: student.dateOfBirth,
    grade: enrollment?.gradeName ?? '',
    className: enrollment?.className ?? '',
    unit: enrollment?.unitName ?? '',
    parentGuardianName: '',
    parentGuardianPhone: '',
    address: '',
    specialNeedsFlag: student.specialNeedsFlag,
    active: student.status === 'ACTIVE',
    avatarUrl: student.avatarUrl ?? undefined,
    primaryClassification: student.primaryClassification ?? undefined,
    primaryDiagnosis: student.primaryClassification ?? undefined,
    currentPlacement: student.currentPlacement ?? undefined,
    assignedGPKTeacherId: gpkAssignment?.staff.userId,
    assignedGPKMembershipId: gpkAssignment?.staff.membershipId,
    assignedGPKTeacherName: gpkAssignment?.staff.displayName,
    gpkMaxCaseload: gpkAssignment?.maxCaseload,
  };
}

export const studentAdministrationService = {
  getStaff(
    organizationId: string,
    signal?: AbortSignal,
  ): Promise<StaffDirectoryResponse> {
    return apiClient.request(`${organizationPath(organizationId)}/staff`, {
      schema: staffDirectoryResponseSchema,
      signal,
    });
  },

  getStudents(
    organizationId: string,
    signal?: AbortSignal,
  ): Promise<StudentsResponse> {
    return apiClient.request(`${organizationPath(organizationId)}/students`, {
      schema: studentsResponseSchema,
      signal,
    });
  },

  assignGpkTeacher(
    organizationId: string,
    studentId: string,
    command: GpkAssignmentUpsertCommand,
    signal?: AbortSignal,
  ): Promise<GpkAssignmentMutationResponse> {
    return apiClient.request(
      `${organizationPath(organizationId)}/students/${encodeURIComponent(studentId)}/gpk-assignment`,
      {
        method: 'PUT',
        body: command,
        schema: gpkAssignmentMutationResponseSchema,
        signal,
      },
    );
  },
};
