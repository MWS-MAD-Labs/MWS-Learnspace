import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import type { AppConfig } from '../../src/config.js';
import { SessionService } from '../../src/sessionService.js';

const databaseUrl = process.env.DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const csrf = 'organization-accounts-csrf';
const config: AppConfig = {
  nodeEnv: 'test',
  port: 4000,
  databaseUrl: databaseUrl ?? 'postgresql://localhost/learnspace',
  appUrl: 'http://localhost:3000',
  sessionSecret: 'a-secure-session-secret-with-32-characters',
  googleClientId: 'client',
  googleClientSecret: 'secret',
  googleAllowedDomains: [],
  googleRedirectUri: 'http://localhost:4000/api/v1/auth/callback',
  authAdmissionMode: 'DENY_UNKNOWN',
  sessionTtlHours: 24,
  logLevel: 'info',
};
const logger = {
  fatal() {},
  error() {},
  warn() {},
  info() {},
  debug() {},
  trace() {},
};

let prisma: PrismaClient;
let app: ReturnType<typeof createApp>;
let organizationId: string;
let otherOrganizationId: string;
let unitId: string;
let gradeId: string;
let directorMembershipId: string;
let sharedMembershipId: string;
let directorCookie: string;
let principalCookie: string;

async function authenticatedCookie(userId: string): Promise<string> {
  const sessions = new SessionService(
    prisma,
    config.sessionSecret,
    config.sessionTtlHours,
  );
  const session = await sessions.create(userId);
  return `learnspace_session=${session.token}`;
}

function get(path: string, cookie: string) {
  return request(app).get(path).set('cookie', cookie);
}

function post(path: string, body: unknown, cookie: string) {
  return request(app)
    .post(path)
    .set('cookie', `${cookie}; learnspace_csrf=${csrf}`)
    .set('x-csrf-token', csrf)
    .send(body);
}

function patch(path: string, body: unknown, cookie: string) {
  return request(app)
    .patch(path)
    .set('cookie', `${cookie}; learnspace_csrf=${csrf}`)
    .set('x-csrf-token', csrf)
    .send(body);
}

integration('organization user and membership administration', () => {
  beforeAll(async () => {
    execFileSync(
      'npx',
      ['prisma', 'migrate', 'deploy', '--schema', '../../prisma/schema.prisma'],
      { cwd: process.cwd(), env: process.env, stdio: 'inherit' },
    );
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    const suffix = randomUUID();
    const [organization, otherOrganization] = await Promise.all([
      prisma.organization.create({
        data: { slug: `account-admin-${suffix}`, name: 'Account Admin School' },
      }),
      prisma.organization.create({
        data: {
          slug: `account-admin-other-${suffix}`,
          name: 'Other Account Admin School',
        },
      }),
    ]);
    organizationId = organization.id;
    otherOrganizationId = otherOrganization.id;
    const [director, principal, sharedUser] = await Promise.all([
      prisma.user.create({
        data: {
          email: `director-account-${suffix}@example.test`,
          displayName: 'Director Account Admin',
        },
      }),
      prisma.user.create({
        data: {
          email: `principal-account-${suffix}@example.test`,
          displayName: 'Principal Account Reader',
        },
      }),
      prisma.user.create({
        data: {
          email: `shared-account-${suffix}@example.test`,
          displayName: 'Shared Organization User',
        },
      }),
    ]);
    const [directorMembership, , sharedMembership] = await Promise.all([
      prisma.membership.create({
        data: { organizationId, userId: director.id, role: 'DIRECTOR' },
      }),
      prisma.membership.create({
        data: { organizationId, userId: principal.id, role: 'PRINCIPAL' },
      }),
      prisma.membership.create({
        data: {
          organizationId,
          userId: sharedUser.id,
          role: 'SPECIALIST',
          roleTitle: 'Shared Specialist',
        },
      }),
      prisma.membership.create({
        data: {
          organizationId: otherOrganization.id,
          userId: sharedUser.id,
          role: 'SPECIALIST',
          roleTitle: 'Other Organization Specialist',
        },
      }),
    ]);
    directorMembershipId = directorMembership.id;
    sharedMembershipId = sharedMembership.id;
    const unit = await prisma.unit.create({
      data: { organizationId, code: `UNIT-${suffix}`, name: 'Elementary' },
    });
    unitId = unit.id;
    const grade = await prisma.grade.create({
      data: {
        organizationId,
        unitId,
        code: `GRADE-${suffix}`,
        name: 'Grade 1',
        position: 1,
      },
    });
    gradeId = grade.id;
    const sessions = new SessionService(
      prisma,
      config.sessionSecret,
      config.sessionTtlHours,
    );
    app = createApp({
      config,
      database: {
        client: prisma,
        check: async () => undefined,
        close: async () => undefined,
      },
      logger,
      auth: { sessions, oauth: {} as never },
    });
    [directorCookie, principalCookie] = await Promise.all([
      authenticatedCookie(director.id),
      authenticatedCookie(principal.id),
    ]);
  }, 60_000);

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('allows directors to create and update authoritative identities, roles, statuses, and scopes with audit provenance', async () => {
    const email = `new-grade-teacher-${randomUUID()}@example.test`;
    const created = await post(
      `/api/v1/organizations/${organizationId}/accounts`,
      {
        email,
        displayName: 'New Grade Teacher',
        role: 'GRADE_TEACHER',
        roleTitle: 'Grade 1 Homeroom Teacher',
        unitIds: [unitId],
        gradeIds: [gradeId],
        subjectIds: [],
      },
      directorCookie,
    );

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      email,
      displayName: 'New Grade Teacher',
      role: 'GRADE_TEACHER',
      unitIds: [unitId],
      gradeIds: [gradeId],
      subjectIds: [],
      userStatus: 'ACTIVE',
      membershipStatus: 'ACTIVE',
    });

    const membershipId = created.body.data.membershipId as string;
    const beforeScopeUpdatedAt = new Date(
      created.body.data.updatedAt as string,
    ).getTime();
    await new Promise((resolve) => setTimeout(resolve, 10));
    const scopeOnly = await patch(
      `/api/v1/organizations/${organizationId}/accounts/${membershipId}`,
      { unitIds: [unitId], gradeIds: [gradeId] },
      directorCookie,
    );
    expect(scopeOnly.status).toBe(200);
    expect(new Date(scopeOnly.body.data.updatedAt).getTime()).toBeGreaterThan(
      beforeScopeUpdatedAt,
    );

    const updated = await patch(
      `/api/v1/organizations/${organizationId}/accounts/${membershipId}`,
      {
        displayName: 'Updated Specialist',
        role: 'SPECIALIST',
        roleTitle: 'Occupational Therapist',
        unitIds: [],
        gradeIds: [],
        subjectIds: [],
        membershipStatus: 'DISABLED',
      },
      directorCookie,
    );

    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      displayName: 'Updated Specialist',
      role: 'SPECIALIST',
      roleTitle: 'Occupational Therapist',
      unitIds: [],
      gradeIds: [],
      membershipStatus: 'DISABLED',
    });

    const listed = await get(
      `/api/v1/organizations/${organizationId}/accounts`,
      directorCookie,
    );
    expect(listed.status).toBe(200);
    expect(listed.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ membershipId, email }),
      ]),
    );

    const audits = await prisma.auditEvent.findMany({
      where: { organizationId, targetId: membershipId },
      orderBy: { occurredAt: 'asc' },
      select: { action: true, result: true, metadata: true },
    });
    expect(audits).toEqual([
      {
        action: 'organization_account.create',
        result: 'SUCCEEDED',
        metadata: expect.objectContaining({
          changedFields: [
            'email',
            'displayName',
            'role',
            'roleTitle',
            'unitIds',
            'gradeIds',
            'subjectIds',
          ],
        }),
      },
      {
        action: 'organization_account.update',
        result: 'SUCCEEDED',
        metadata: expect.objectContaining({
          changedFields: ['unitIds', 'gradeIds'],
        }),
      },
      {
        action: 'organization_account.update',
        result: 'SUCCEEDED',
        metadata: expect.objectContaining({
          changedFields: [
            'displayName',
            'role',
            'roleTitle',
            'membershipStatus',
            'unitIds',
            'gradeIds',
            'subjectIds',
          ],
        }),
      },
    ]);
  });

  it('enforces organization-admin authorization, tenant scope, role-scope consistency, and self-lockout protection', async () => {
    const principalList = await get(
      `/api/v1/organizations/${organizationId}/accounts`,
      principalCookie,
    );
    expect(principalList.status).toBe(403);

    const crossTenant = await get(
      `/api/v1/organizations/${otherOrganizationId}/accounts`,
      directorCookie,
    );
    expect(crossTenant.status).toBe(403);

    const invalidScope = await post(
      `/api/v1/organizations/${organizationId}/accounts`,
      {
        email: `invalid-scope-${randomUUID()}@example.test`,
        displayName: 'Invalid Scope',
        role: 'SUBJECT_TEACHER',
        unitIds: [unitId],
        gradeIds: [],
        subjectIds: [],
      },
      directorCookie,
    );
    expect(invalidScope.status).toBe(400);
    expect(invalidScope.body.error.code).toBe('INVALID_MEMBERSHIP_SCOPES');

    const selfLockout = await patch(
      `/api/v1/organizations/${organizationId}/accounts/${directorMembershipId}`,
      { membershipStatus: 'DISABLED' },
      directorCookie,
    );
    expect(selfLockout.status).toBe(409);
    expect(selfLockout.body.error.code).toBe('SELF_ADMIN_LOCKOUT');

    const sharedIdentityChange = await patch(
      `/api/v1/organizations/${organizationId}/accounts/${sharedMembershipId}`,
      { displayName: 'Changed Across Organizations' },
      directorCookie,
    );
    expect(sharedIdentityChange.status).toBe(409);
    expect(sharedIdentityChange.body.error.code).toBe(
      'SHARED_USER_IDENTITY_CONFLICT',
    );
  });
});
