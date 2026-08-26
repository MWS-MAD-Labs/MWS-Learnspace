import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { PrismaClient, type WorkflowState } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import type { AppConfig } from '../../src/config.js';
import { SessionService } from '../../src/sessionService.js';

const databaseUrl = process.env.DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const csrf = 'journey-workflow-csrf-token';
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
let teacherId: string;
let principalId: string;
let directorId: string;
let teacherMembershipId: string;
let nonOwnerMembershipId: string;
let academicYearId: string;
let semesterId: string;
let unitId: string;
let gradeId: string;
let subjectId: string;
let teacherCookie: string;
let nonOwnerCookie: string;
let principalCookie: string;
let directorCookie: string;
let outsiderCookie: string;

async function authenticatedCookie(userId: string): Promise<string> {
  const sessions = new SessionService(
    prisma,
    config.sessionSecret,
    config.sessionTtlHours,
  );
  const session = await sessions.create(userId);
  return `learnspace_session=${session.token}`;
}

function post(path: string, body: unknown, cookie: string) {
  return request(app)
    .post(path)
    .set('cookie', `${cookie}; learnspace_csrf=${csrf}`)
    .set('x-csrf-token', csrf)
    .send(body);
}

async function createJourney(state: WorkflowState = 'DRAFT') {
  return prisma.learningJourney.create({
    data: {
      organizationId,
      title: `Workflow Journey ${randomUUID()}`,
      academicYearId,
      semesterId,
      unitId,
      gradeId,
      subjectId,
      state,
      createdById: teacherId,
      updatedById: teacherId,
      owners: { create: { membershipId: teacherMembershipId } },
    },
  });
}

function journeyPath(journeyId: string, command: string) {
  return `/api/v1/organizations/${organizationId}/learning-journeys/${journeyId}/${command}`;
}

integration('learning journey workflow endpoints', () => {
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
        data: { slug: `journey-workflow-${suffix}`, name: 'Workflow School' },
      }),
      prisma.organization.create({
        data: {
          slug: `journey-workflow-other-${suffix}`,
          name: 'Other Workflow School',
        },
      }),
    ]);
    organizationId = organization.id;
    otherOrganizationId = otherOrganization.id;

    const [teacher, nonOwner, principal, director, outsider] =
      await Promise.all([
        prisma.user.create({
          data: {
            email: `journey-teacher-${suffix}@example.test`,
            displayName: 'Journey Teacher',
          },
        }),
        prisma.user.create({
          data: {
            email: `journey-non-owner-${suffix}@example.test`,
            displayName: 'Non-owner Journey Teacher',
          },
        }),
        prisma.user.create({
          data: {
            email: `journey-principal-${suffix}@example.test`,
            displayName: 'Journey Principal',
          },
        }),
        prisma.user.create({
          data: {
            email: `journey-director-${suffix}@example.test`,
            displayName: 'Journey Director',
          },
        }),
        prisma.user.create({
          data: {
            email: `journey-outsider-${suffix}@example.test`,
            displayName: 'Other Tenant Principal',
          },
        }),
      ]);
    teacherId = teacher.id;
    principalId = principal.id;
    directorId = director.id;

    const [teacherMembership, nonOwnerMembership] = await Promise.all([
      prisma.membership.create({
        data: {
          organizationId,
          userId: teacher.id,
          role: 'GRADE_TEACHER',
        },
      }),
      prisma.membership.create({
        data: {
          organizationId,
          userId: nonOwner.id,
          role: 'GRADE_TEACHER',
        },
      }),
      prisma.membership.create({
        data: { organizationId, userId: principal.id, role: 'PRINCIPAL' },
      }),
      prisma.membership.create({
        data: { organizationId, userId: director.id, role: 'DIRECTOR' },
      }),
      prisma.membership.create({
        data: {
          organizationId: otherOrganizationId,
          userId: outsider.id,
          role: 'PRINCIPAL',
        },
      }),
    ]);
    teacherMembershipId = teacherMembership.id;
    nonOwnerMembershipId = nonOwnerMembership.id;

    const year = await prisma.academicYear.create({
      data: {
        organizationId,
        name: `2026-${suffix}`,
        startsOn: new Date('2026-07-01T00:00:00.000Z'),
        endsOn: new Date('2027-06-30T00:00:00.000Z'),
      },
    });
    academicYearId = year.id;
    const [semester, unit, subject] = await Promise.all([
      prisma.semester.create({
        data: {
          organizationId,
          academicYearId,
          name: 'Semester 1',
          position: 1,
          startsOn: new Date('2026-07-01T00:00:00.000Z'),
          endsOn: new Date('2026-12-31T00:00:00.000Z'),
        },
      }),
      prisma.unit.create({
        data: { organizationId, code: `U-${suffix}`, name: 'Elementary' },
      }),
      prisma.subject.create({
        data: { organizationId, code: `S-${suffix}`, name: 'Science' },
      }),
    ]);
    semesterId = semester.id;
    unitId = unit.id;
    subjectId = subject.id;
    const grade = await prisma.grade.create({
      data: {
        organizationId,
        unitId,
        code: `G-${suffix}`,
        name: 'Grade 1',
        position: 1,
      },
    });
    gradeId = grade.id;
    await Promise.all([
      prisma.membershipUnit.create({
        data: { membershipId: teacherMembershipId, unitId },
      }),
      prisma.membershipGrade.create({
        data: { membershipId: teacherMembershipId, gradeId },
      }),
      prisma.membershipUnit.create({
        data: { membershipId: nonOwnerMembershipId, unitId },
      }),
      prisma.membershipGrade.create({
        data: { membershipId: nonOwnerMembershipId, gradeId },
      }),
    ]);

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
    [
      teacherCookie,
      nonOwnerCookie,
      principalCookie,
      directorCookie,
      outsiderCookie,
    ] = await Promise.all([
      authenticatedCookie(teacher.id),
      authenticatedCookie(nonOwner.id),
      authenticatedCookie(principal.id),
      authenticatedCookie(director.id),
      authenticatedCookie(outsider.id),
    ]);
  }, 60_000);

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('persists the complete approval path with session actors and audit events', async () => {
    const journey = await createJourney();
    const submitted = await post(
      journeyPath(journey.id, 'submit'),
      { expectedVersion: 1 },
      teacherCookie,
    );
    expect(submitted.status).toBe(200);
    expect(submitted.body.data).toMatchObject({
      id: journey.id,
      state: 'PRINCIPAL_REVIEW',
      version: 2,
    });

    const principalApproved = await post(
      journeyPath(journey.id, 'principal-review'),
      { expectedVersion: 2, decision: 'APPROVE', comment: 'Ready to forward.' },
      principalCookie,
    );
    expect(principalApproved.status).toBe(200);
    expect(principalApproved.body.data).toMatchObject({
      state: 'DIRECTOR_APPROVAL',
      version: 3,
    });

    const directorApproved = await post(
      journeyPath(journey.id, 'director-review'),
      { expectedVersion: 3, decision: 'APPROVE' },
      directorCookie,
    );
    expect(directorApproved.status).toBe(200);
    expect(directorApproved.body.data).toMatchObject({
      state: 'APPROVED',
      version: 4,
    });

    const events = await prisma.workflowEvent.findMany({
      where: { aggregateType: 'LEARNING_JOURNEY', aggregateId: journey.id },
      orderBy: { occurredAt: 'asc' },
    });
    expect(
      events.map(({ fromState, toState, action, actorId }) => ({
        fromState,
        toState,
        action,
        actorId,
      })),
    ).toEqual([
      {
        fromState: 'DRAFT',
        toState: 'PRINCIPAL_REVIEW',
        action: 'SUBMITTED',
        actorId: teacherId,
      },
      {
        fromState: 'PRINCIPAL_REVIEW',
        toState: 'DIRECTOR_APPROVAL',
        action: 'APPROVED',
        actorId: principalId,
      },
      {
        fromState: 'DIRECTOR_APPROVAL',
        toState: 'APPROVED',
        action: 'APPROVED',
        actorId: directorId,
      },
    ]);
    expect(
      await prisma.auditEvent.count({
        where: {
          organizationId,
          targetId: journey.id,
          action: {
            in: [
              'learning-journey.submit',
              'learning-journey.principal-approve',
              'learning-journey.director-approve',
            ],
          },
        },
      }),
    ).toBe(3);
  });

  it('supports principal and director returns to draft with immutable comments', async () => {
    const principalJourney = await createJourney('PRINCIPAL_REVIEW');
    const principalReturn = await post(
      journeyPath(principalJourney.id, 'principal-review'),
      {
        expectedVersion: 1,
        decision: 'RETURN',
        comment: 'Add differentiated learning outcomes.',
      },
      principalCookie,
    );
    expect(principalReturn.status).toBe(200);
    expect(principalReturn.body.data).toMatchObject({
      state: 'DRAFT',
      version: 2,
      workflowEvents: [
        expect.objectContaining({
          fromState: 'PRINCIPAL_REVIEW',
          toState: 'DRAFT',
          action: 'RETURNED',
          comment: 'Add differentiated learning outcomes.',
          actor: expect.objectContaining({
            id: principalId,
            displayName: 'Journey Principal',
            role: 'PRINCIPAL',
          }),
        }),
      ],
    });

    const directorJourney = await createJourney('DIRECTOR_APPROVAL');
    const directorReturn = await post(
      journeyPath(directorJourney.id, 'director-review'),
      {
        expectedVersion: 1,
        decision: 'RETURN',
        comment: 'Clarify the final assessment evidence.',
      },
      directorCookie,
    );
    expect(directorReturn.status).toBe(200);
    expect(directorReturn.body.data).toMatchObject({
      state: 'DRAFT',
      version: 2,
      workflowEvents: [
        expect.objectContaining({
          fromState: 'DIRECTOR_APPROVAL',
          toState: 'DRAFT',
          action: 'RETURNED',
          comment: 'Clarify the final assessment evidence.',
          actor: expect.objectContaining({
            id: directorId,
            displayName: 'Journey Director',
            role: 'DIRECTOR',
          }),
        }),
      ],
    });

    const events = await prisma.workflowEvent.findMany({
      where: {
        aggregateType: 'LEARNING_JOURNEY',
        aggregateId: { in: [principalJourney.id, directorJourney.id] },
      },
      orderBy: { comment: 'asc' },
    });
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromState: 'PRINCIPAL_REVIEW',
          toState: 'DRAFT',
          action: 'RETURNED',
          actorId: principalId,
          comment: 'Add differentiated learning outcomes.',
        }),
        expect.objectContaining({
          fromState: 'DIRECTOR_APPROVAL',
          toState: 'DRAFT',
          action: 'RETURNED',
          actorId: directorId,
          comment: 'Clarify the final assessment evidence.',
        }),
      ]),
    );
  });

  it('rejects state and actor spoofing, invalid source states, and cross-tenant attempts', async () => {
    const journey = await createJourney();
    const spoofed = await post(
      journeyPath(journey.id, 'submit'),
      {
        expectedVersion: 1,
        actorId: directorId,
        organizationId,
        currentState: 'APPROVED',
        targetState: 'APPROVED',
      },
      teacherCookie,
    );
    expect(spoofed.status).toBe(400);

    const invalidState = await post(
      journeyPath(journey.id, 'principal-review'),
      { expectedVersion: 1, decision: 'APPROVE' },
      principalCookie,
    );
    expect(invalidState.status).toBe(409);
    expect(invalidState.body.error.code).toBe(
      'LEARNING_JOURNEY_INVALID_TRANSITION',
    );

    const crossTenant = await post(
      journeyPath(journey.id, 'principal-review'),
      { expectedVersion: 1, decision: 'APPROVE' },
      outsiderCookie,
    );
    expect(crossTenant.status).toBe(403);
    expect(crossTenant.body.error.code).toBe('AUTHORIZATION_DENIED');
    expect(
      await prisma.workflowEvent.count({
        where: { aggregateType: 'LEARNING_JOURNEY', aggregateId: journey.id },
      }),
    ).toBe(0);
  });

  it('denies a same-organization scoped teacher who does not own the draft', async () => {
    const journey = await createJourney();
    const response = await post(
      journeyPath(journey.id, 'submit'),
      { expectedVersion: 1 },
      nonOwnerCookie,
    );
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('AUTHORIZATION_DENIED');
    expect(
      await prisma.learningJourney.findUniqueOrThrow({
        where: { id: journey.id },
        select: { state: true, version: true },
      }),
    ).toEqual({ state: 'DRAFT', version: 1 });
    expect(
      await prisma.workflowEvent.count({
        where: { aggregateType: 'LEARNING_JOURNEY', aggregateId: journey.id },
      }),
    ).toBe(0);
  });

  it('rejects stale commands and permits only one simultaneous submission', async () => {
    const journey = await createJourney();
    const responses = await Promise.all([
      post(
        journeyPath(journey.id, 'submit'),
        { expectedVersion: 1 },
        teacherCookie,
      ),
      post(
        journeyPath(journey.id, 'submit'),
        { expectedVersion: 1 },
        teacherCookie,
      ),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    expect(
      await prisma.workflowEvent.count({
        where: { aggregateType: 'LEARNING_JOURNEY', aggregateId: journey.id },
      }),
    ).toBe(1);
    expect(
      await prisma.auditEvent.count({
        where: {
          organizationId,
          targetId: journey.id,
          action: 'learning-journey.submit',
        },
      }),
    ).toBe(1);

    const stale = await post(
      journeyPath(journey.id, 'principal-review'),
      { expectedVersion: 1, decision: 'APPROVE' },
      principalCookie,
    );
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('LEARNING_JOURNEY_VERSION_CONFLICT');
  });
});
