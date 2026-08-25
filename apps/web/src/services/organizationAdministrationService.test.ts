import { afterEach, describe, expect, it, vi } from 'vitest';
import { organizationAdministrationService } from './organizationAdministrationService';

const organizationId = '11111111-1111-4111-8111-111111111111';
const membershipId = '22222222-2222-4222-8222-222222222222';
const userId = '33333333-3333-4333-8333-333333333333';

const account = {
  membershipId,
  organizationId,
  userId,
  email: 'teacher@example.test',
  displayName: 'Teacher One',
  avatarUrl: null,
  userStatus: 'ACTIVE' as const,
  role: 'GRADE_TEACHER' as const,
  roleTitle: 'Grade Teacher',
  membershipStatus: 'ACTIVE' as const,
  unitIds: ['44444444-4444-4444-8444-444444444444'],
  gradeIds: ['55555555-5555-4555-8555-555555555555'],
  subjectIds: [],
  updatedAt: '2026-08-24T00:00:00.000Z',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('organizationAdministrationService', () => {
  it('creates organization accounts with the strict membership payload', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: account }), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await organizationAdministrationService.createAccount(organizationId, {
      email: account.email,
      displayName: account.displayName,
      role: account.role,
      roleTitle: account.roleTitle,
      unitIds: account.unitIds,
      gradeIds: account.gradeIds,
      subjectIds: [],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/organizations/${organizationId}/accounts`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: account.email,
          displayName: account.displayName,
          role: account.role,
          roleTitle: account.roleTitle,
          unitIds: account.unitIds,
          gradeIds: account.gradeIds,
          subjectIds: [],
        }),
      }),
    );
  });

  it('updates the organization-scoped membership route', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ data: { ...account, role: 'SPECIALIST' } }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await organizationAdministrationService.updateAccount(
      organizationId,
      membershipId,
      { role: 'SPECIALIST', unitIds: [], gradeIds: [], subjectIds: [] },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/organizations/${organizationId}/accounts/${membershipId}`,
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
