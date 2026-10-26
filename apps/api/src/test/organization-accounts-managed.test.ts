import { describe, expect, it, vi } from 'vitest';
import { createOrganizationAccountsController } from '../controller/organization-accounts-controller.js';
import { HttpError } from '../middleware/http-errors.js';

const organizationId = '11111111-1111-4111-8111-111111111111';
const membershipId = '33333333-3333-4333-8333-333333333333';

function fixture(managedByCentral: boolean, scopesManagedByCentral = false) {
  const service = {
    list: vi.fn(async () => []),
    create: vi.fn(async () => ({})),
    update: vi.fn(async () => ({})),
  };
  const controller = createOrganizationAccountsController(service as never, {
    managedByCentral,
    scopesManagedByCentral,
  });
  const run = async (
    handler: 'list' | 'create' | 'update',
    body: unknown = {},
  ) => {
    const next = vi.fn();
    const json = vi.fn();
    const response = {
      locals: { requestId: 'test' },
      status: vi.fn(() => response),
      json,
    };
    await controller[handler](
      {
        params: { organizationId, membershipId },
        body,
        auth: {
          userId: '22222222-2222-4222-8222-222222222222',
          memberships: [
            {
              organizationId,
              role: 'SUPER_ADMIN',
              permissions: ['organization:admin'],
              unitIds: [],
              gradeIds: [],
              subjectIds: [],
              staffAssignments: [],
              observationAssignments: [],
            },
          ],
        },
      } as never,
      response as never,
      next,
    );
    return { next, json };
  };
  return { service, run };
}

const create = {
  email: 'a@example.com',
  displayName: 'A',
  role: 'GRADE_TEACHER',
};

describe('accounts when Central manages them', () => {
  it('says so in the list and refuses to create an account', async () => {
    const { service, run } = fixture(true);
    const listed = await run('list');
    expect(listed.json.mock.calls[0][0].meta).toEqual({
      count: 0,
      managedByCentral: true,
      scopesManagedByCentral: false,
    });
    const refused = await run('create', create);
    const error = refused.next.mock.calls[0][0] as HttpError;
    expect(error).toMatchObject({ status: 409, code: 'MANAGED_BY_CENTRAL' });
    expect(service.create).not.toHaveBeenCalled();
  });

  it('refuses to change who a person is or the role, but keeps scopes, title and status', async () => {
    const { service, run } = fixture(true);
    for (const body of [
      { role: 'DIRECTOR' },
      { email: 'b@example.com' },
      { displayName: 'B' },
      { avatarUrl: null },
    ]) {
      const refused = await run('update', body);
      expect(refused.next.mock.calls[0][0]).toMatchObject({
        status: 409,
        code: 'MANAGED_BY_CENTRAL',
      });
    }
    expect(service.update).not.toHaveBeenCalled();
    // The fake service answers with nothing the response schema accepts, so only the call itself is checked.
    await run('update', {
      roleTitle: 'Head of Lab',
      membershipStatus: 'DISABLED',
      unitIds: [],
    });
    expect(service.update).toHaveBeenCalledOnce();
  });

  it('works as before when Central does not manage accounts', async () => {
    const { service, run } = fixture(false);
    expect(
      (await run('list')).json.mock.calls[0][0].meta.managedByCentral,
    ).toBe(false);
    await run('create', create);
    expect(service.create).toHaveBeenCalledOnce();
    await run('update', { role: 'DIRECTOR' });
    expect(service.update).toHaveBeenCalledOnce();
  });
});

describe('scopes when Central also decides the classes', () => {
  it('refuses scope fields, says so in the list, and keeps title and status', async () => {
    const { service, run } = fixture(true, true);
    expect(
      (await run('list')).json.mock.calls[0][0].meta.scopesManagedByCentral,
    ).toBe(true);
    for (const body of [
      { unitIds: [] },
      { gradeIds: [] },
      { subjectIds: [] },
    ]) {
      const refused = await run('update', body);
      expect(refused.next.mock.calls[0][0]).toMatchObject({
        status: 409,
        code: 'MANAGED_BY_CENTRAL',
      });
    }
    expect(service.update).not.toHaveBeenCalled();
    await run('update', { roleTitle: 'Lead', membershipStatus: 'DISABLED' });
    expect(service.update).toHaveBeenCalledOnce();
  });
});
