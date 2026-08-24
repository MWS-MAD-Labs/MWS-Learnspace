import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  mapStaffDirectoryItemToUser,
  mapStudentListItemToStudent,
  studentAdministrationService,
} from './studentAdministrationService';

const organizationId = '11111111-1111-4111-8111-111111111111';
const studentId = '22222222-2222-4222-8222-222222222222';
const membershipId = '33333333-3333-4333-8333-333333333333';
const userId = '44444444-4444-4444-8444-444444444444';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('studentAdministrationService mapping', () => {
  it('maps API students to legacy display fields without inventing guardian data', () => {
    const mapped = mapStudentListItemToStudent({
      id: studentId,
      organizationId,
      studentNumber: 'STU-001',
      fullName: 'Ari Student',
      nickname: null,
      avatarUrl: null,
      gender: 'OTHER',
      dateOfBirth: '2018-05-10',
      specialNeedsFlag: true,
      status: 'ACTIVE',
      primaryClassification: 'Autism spectrum',
      currentPlacement: 'Inclusive Grade 2',
      enrollments: [],
      activeEnrollment: {
        id: '55555555-5555-4555-8555-555555555555',
        academicYearId: '66666666-6666-4666-8666-666666666666',
        classId: '77777777-7777-4777-8777-777777777777',
        className: 'Sequoia',
        unitId: '88888888-8888-4888-8888-888888888888',
        unitName: 'Elementary',
        gradeId: '99999999-9999-4999-8999-999999999999',
        gradeName: 'Grade 2',
        startsOn: '2026-07-01',
        endsOn: null,
      },
      activeGpkAssignment: {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        organizationId,
        studentId,
        roleContext: 'GPK',
        startsOn: '2026-08-24',
        endsOn: null,
        maxCaseload: 2,
        staff: {
          membershipId,
          userId,
          displayName: 'GPK Teacher',
          avatarUrl: null,
          roleTitle: 'Guru Pendamping Khusus',
        },
      },
    });

    expect(mapped).toMatchObject({
      fullName: 'Ari Student',
      name: 'Ari Student',
      gender: 'Other',
      grade: 'Grade 2',
      className: 'Sequoia',
      unit: 'Elementary',
      parentGuardianName: '',
      parentGuardianPhone: '',
      address: '',
      assignedGPKTeacherId: userId,
      assignedGPKMembershipId: membershipId,
      assignedGPKTeacherName: 'GPK Teacher',
      gpkMaxCaseload: 2,
    });
  });

  it('maps staff membership identity and role flags without an email', () => {
    expect(
      mapStaffDirectoryItemToUser({
        membershipId,
        userId,
        organizationId,
        displayName: 'GPK Teacher',
        avatarUrl: null,
        role: 'SPECIAL_ED_TEACHER',
        roleTitle: 'Guru Pendamping Khusus',
        status: 'ACTIVE',
      }),
    ).toMatchObject({
      id: userId,
      membershipId,
      name: 'GPK Teacher',
      email: '',
      role: 'SPECIAL_ED_TEACHER',
      isGPK: true,
      isSpecialEdCoordinator: false,
    });
  });
});

describe('studentAdministrationService GPK mutation', () => {
  it('sends membershipId and dates to the organization student route', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              organizationId,
              studentId,
              roleContext: 'GPK',
              startsOn: '2026-08-24',
              endsOn: null,
              maxCaseload: 2,
              staff: {
                membershipId,
                userId,
                displayName: 'GPK Teacher',
                avatarUrl: null,
                roleTitle: 'Guru Pendamping Khusus',
              },
              student: {
                id: studentId,
                organizationId,
                studentNumber: 'STU-001',
                fullName: 'Ari Student',
                nickname: null,
                avatarUrl: null,
              },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await studentAdministrationService.assignGpkTeacher(
      organizationId,
      studentId,
      { membershipId, startsOn: '2026-08-24', endsOn: null },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/organizations/${organizationId}/students/${studentId}/gpk-assignment`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          membershipId,
          startsOn: '2026-08-24',
          endsOn: null,
        }),
      }),
    );
  });

  it('preserves server capacity conflicts for actionable UI handling', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: {
                code: 'GPK_CASELOAD_CAPACITY',
                message: 'The GPK teacher has reached the configured limit.',
                requestId: 'request-123',
              },
            }),
            { status: 409, headers: { 'content-type': 'application/json' } },
          ),
      ),
    );

    await expect(
      studentAdministrationService.assignGpkTeacher(organizationId, studentId, {
        membershipId,
        startsOn: '2026-08-24',
      }),
    ).rejects.toMatchObject({
      category: 'conflict',
      code: 'GPK_CASELOAD_CAPACITY',
      status: 409,
    });
  });
});
