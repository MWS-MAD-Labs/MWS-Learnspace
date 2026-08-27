import { Prisma, type PrismaClient } from '@prisma/client';
import type { Request } from 'express';
import { Router as createRouter } from 'express';
import { z } from 'zod';
import {
  iepCreateCommandSchema,
  iepDetailResponseSchema,
  iepListQuerySchema,
  iepMutationResponseSchema,
  iepUpdateCommandSchema,
  iepsResponseSchema,
  uuidSchema,
  type IepCreateCommand,
} from '@learnspace/contracts';
import { createAuditRepository } from './audit.js';
import {
  AuthorizationDeniedError,
  requireOrganizationScope,
  requirePermission,
  type MembershipScope,
} from './authorization.js';
import {
  createCsrfProtection,
  createRequiredAuthentication,
  type AuthenticatedRequest,
} from './authRoutes.js';
import { HttpError, parseRequest } from './httpErrors.js';
import type { SessionService } from './sessionService.js';

const broadRoles = new Set(['DIRECTOR', 'PRINCIPAL', 'SPECIAL_ED_COORDINATOR']);
const assignedRoles = new Set(['SPECIAL_ED_TEACHER', 'SPECIALIST']);

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dateAtUtcMidnight(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function todayAtUtcMidnight(): Date {
  return dateAtUtcMidnight(new Date().toISOString().slice(0, 10));
}

function deny(): never {
  throw new HttpError(403, 'AUTHORIZATION_DENIED', 'The request was denied.');
}

function requireAuth(request: Request) {
  const auth = (request as AuthenticatedRequest).auth;
  if (!auth) {
    throw new HttpError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication is required.',
    );
  }
  return auth;
}

function membershipFor(request: Request, organizationId: string) {
  try {
    return requireOrganizationScope(
      requireAuth(request).memberships,
      organizationId,
    );
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) deny();
    throw error;
  }
}

function requireIepPermission(
  membership: MembershipScope,
  permission: 'special-ed:read' | 'special-ed:write',
) {
  try {
    requirePermission(membership, permission);
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) deny();
    throw error;
  }
}

export function activeAssignedStudentIds(
  membership: MembershipScope,
  onDate = todayAtUtcMidnight(),
): string[] | undefined {
  if (broadRoles.has(membership.role)) return undefined;
  if (!assignedRoles.has(membership.role)) return [];
  return [
    ...new Set(
      (membership.assignedStudentScopes ?? [])
        .filter(
          (scope) =>
            scope.startsOn <= onDate &&
            (scope.endsOn === null || scope.endsOn >= onDate),
        )
        .map((scope) => scope.studentId),
    ),
  ];
}

function assertStudentScope(membership: MembershipScope, studentId: string) {
  const scopedStudentIds = activeAssignedStudentIds(membership);
  if (scopedStudentIds === undefined || scopedStudentIds.includes(studentId)) {
    return;
  }
  deny();
}

const iepSelect = {
  id: true,
  organizationId: true,
  state: true,
  version: true,
  consideration: true,
  primaryClassification: true,
  currentPlacement: true,
  homePartnershipSupport: true,
  homePartnershipRecommendations: true,
  progressMeasurementMethods: true,
  parentCommunicationMethods: true,
  parentApproved: true,
  parentName: true,
  parentApprovalDate: true,
  startsOn: true,
  endsOn: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: { id: true, studentNumber: true, fullName: true },
  },
  academicYear: true,
  semester: true,
  createdBy: { select: { id: true, displayName: true } },
  updatedBy: { select: { id: true, displayName: true } },
  teamMembers: {
    orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
    select: {
      id: true,
      role: true,
      name: true,
      initials: true,
      confirmed: true,
      position: true,
    },
  },
  performanceAreas: {
    orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
    select: {
      id: true,
      name: true,
      category: true,
      strengths: true,
      needs: true,
      impactOfNeed: true,
      informationSource: true,
      assessmentProcess: true,
      assessmentDate: true,
      summaryOfResults: true,
      position: true,
    },
  },
  accommodations: {
    orderBy: [
      { category: 'asc' as const },
      { position: 'asc' as const },
      { id: 'asc' as const },
    ],
    select: {
      id: true,
      category: true,
      subject: true,
      code: true,
      description: true,
      position: true,
    },
  },
  goals: {
    orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
    select: {
      id: true,
      code: true,
      performanceArea: true,
      longTermGoal: true,
      shortTermGoal: true,
      measurableGoal: true,
      strategyActivity: true,
      learningExpectation: true,
      learningStrategy: true,
      evaluationMethod: true,
      schedule: true,
      targetDate: true,
      position: true,
    },
  },
  services: {
    orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
    select: {
      id: true,
      serviceName: true,
      type: true,
      duration: true,
      frequency: true,
      location: true,
      days: true,
      position: true,
    },
  },
} satisfies Prisma.IEPSelect;

type IepRow = Prisma.IEPGetPayload<{ select: typeof iepSelect }>;

function stringArray(value: Prisma.JsonValue): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === 'string')
  ) {
    throw new HttpError(
      500,
      'IEP_INVALID_STORED_CONTENT',
      'Stored IEP content is invalid.',
    );
  }
  return value;
}

function mapIep(row: IepRow) {
  return {
    ...row,
    progressMeasurementMethods: stringArray(row.progressMeasurementMethods),
    parentCommunicationMethods: stringArray(row.parentCommunicationMethods),
    parentApprovalDate: row.parentApprovalDate
      ? isoDate(row.parentApprovalDate)
      : null,
    startsOn: isoDate(row.startsOn),
    endsOn: isoDate(row.endsOn),
    academicYear: {
      ...row.academicYear,
      startsOn: isoDate(row.academicYear.startsOn),
      endsOn: isoDate(row.academicYear.endsOn),
    },
    semester: row.semester
      ? {
          ...row.semester,
          startsOn: isoDate(row.semester.startsOn),
          endsOn: isoDate(row.semester.endsOn),
        }
      : null,
    performanceAreas: row.performanceAreas.map((area) => ({
      ...area,
      assessmentDate: area.assessmentDate ? isoDate(area.assessmentDate) : null,
    })),
    goals: row.goals.map((goal) => ({
      ...goal,
      targetDate: goal.targetDate ? isoDate(goal.targetDate) : null,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function validateReferences(
  prisma: Prisma.TransactionClient,
  organizationId: string,
  command: IepCreateCommand,
) {
  const [student, academicYear, semester] = await Promise.all([
    prisma.student.findFirst({
      where: {
        id: command.studentId,
        organizationId,
        status: 'ACTIVE',
        specialNeedsFlag: true,
      },
      select: { id: true },
    }),
    prisma.academicYear.findFirst({
      where: { id: command.academicYearId, organizationId },
    }),
    command.semesterId
      ? prisma.semester.findFirst({
          where: {
            id: command.semesterId,
            organizationId,
            academicYearId: command.academicYearId,
          },
        })
      : Promise.resolve(null),
  ]);
  if (!student || !academicYear || (command.semesterId && !semester)) {
    throw new HttpError(
      400,
      'IEP_INVALID_REFERENCE',
      'One or more student or academic references are invalid.',
    );
  }
  const startsOn = dateAtUtcMidnight(command.startsOn);
  const endsOn = dateAtUtcMidnight(command.endsOn);
  if (startsOn < academicYear.startsOn || endsOn > academicYear.endsOn) {
    throw new HttpError(
      400,
      'IEP_DATE_OUT_OF_RANGE',
      'IEP dates must fall within the selected academic year.',
    );
  }
  if (semester && (startsOn < semester.startsOn || endsOn > semester.endsOn)) {
    throw new HttpError(
      400,
      'IEP_DATE_OUT_OF_RANGE',
      'IEP dates must fall within the selected semester.',
    );
  }
}

function nestedData(command: IepCreateCommand) {
  return {
    teamMembers: {
      create: command.teamMembers.map((item) => ({
        ...item,
        initials: item.initials ?? null,
      })),
    },
    performanceAreas: {
      create: command.performanceAreas.map((item) => ({
        ...item,
        impactOfNeed: item.impactOfNeed ?? null,
        informationSource: item.informationSource ?? null,
        assessmentProcess: item.assessmentProcess ?? null,
        assessmentDate: item.assessmentDate
          ? dateAtUtcMidnight(item.assessmentDate)
          : null,
        summaryOfResults: item.summaryOfResults ?? null,
      })),
    },
    accommodations: {
      create: command.accommodations.map((item) => ({
        ...item,
        subject: item.subject ?? null,
        code: item.code ?? null,
      })),
    },
    goals: {
      create: command.goals.map((item) => ({
        ...item,
        longTermGoal: item.longTermGoal ?? null,
        shortTermGoal: item.shortTermGoal ?? null,
        strategyActivity: item.strategyActivity ?? null,
        learningExpectation: item.learningExpectation ?? null,
        learningStrategy: item.learningStrategy ?? null,
        targetDate: item.targetDate ? dateAtUtcMidnight(item.targetDate) : null,
      })),
    },
    services: {
      create: command.services.map((item) => ({
        ...item,
        frequency: item.frequency ?? null,
        days: item.days ?? null,
      })),
    },
  };
}

function rootData(command: IepCreateCommand) {
  return {
    studentId: command.studentId,
    academicYearId: command.academicYearId,
    semesterId: command.semesterId,
    consideration: command.consideration,
    primaryClassification: command.primaryClassification,
    currentPlacement: command.currentPlacement,
    homePartnershipSupport: command.homePartnershipSupport ?? null,
    homePartnershipRecommendations:
      command.homePartnershipRecommendations ?? null,
    progressMeasurementMethods:
      command.progressMeasurementMethods as Prisma.InputJsonValue,
    parentCommunicationMethods:
      command.parentCommunicationMethods as Prisma.InputJsonValue,
    parentApproved: command.parentApproved,
    parentName: command.parentName ?? null,
    parentApprovalDate: command.parentApprovalDate
      ? dateAtUtcMidnight(command.parentApprovalDate)
      : null,
    startsOn: dateAtUtcMidnight(command.startsOn),
    endsOn: dateAtUtcMidnight(command.endsOn),
  };
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

function versionConflict() {
  return new HttpError(
    409,
    'IEP_VERSION_CONFLICT',
    'The IEP was changed by another request.',
  );
}

export function createIepRouter(
  prisma: PrismaClient,
  sessions: SessionService,
) {
  const router = createRouter();
  router.use(createRequiredAuthentication(sessions));

  router.get(
    '/organizations/:organizationId/ieps',
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z.object({ organizationId: uuidSchema }).strict(),
          request.params,
        );
        const query = parseRequest(iepListQuerySchema, request.query);
        const membership = membershipFor(request, path.organizationId);
        requireIepPermission(membership, 'special-ed:read');
        const scopedStudentIds = activeAssignedStudentIds(membership);
        if (scopedStudentIds?.length === 0) {
          response.json(
            iepsResponseSchema.parse({ data: [], meta: { count: 0 } }),
          );
          return;
        }
        const rows = await prisma.iEP.findMany({
          where: {
            organizationId: path.organizationId,
            ...(scopedStudentIds
              ? { studentId: { in: scopedStudentIds } }
              : {}),
            ...(query.studentId ? { studentId: query.studentId } : {}),
            ...(query.academicYearId
              ? { academicYearId: query.academicYearId }
              : {}),
            ...(query.semesterId ? { semesterId: query.semesterId } : {}),
            ...(query.state ? { state: query.state } : {}),
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
          select: iepSelect,
        });
        const data = rows.map(mapIep);
        response.json(
          iepsResponseSchema.parse({ data, meta: { count: data.length } }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/ieps/:iepId',
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z.object({ organizationId: uuidSchema, iepId: uuidSchema }).strict(),
          request.params,
        );
        const membership = membershipFor(request, path.organizationId);
        requireIepPermission(membership, 'special-ed:read');
        const scopedStudentIds = activeAssignedStudentIds(membership);
        const row = await prisma.iEP.findFirst({
          where: {
            id: path.iepId,
            organizationId: path.organizationId,
            ...(scopedStudentIds
              ? { studentId: { in: scopedStudentIds } }
              : {}),
          },
          select: iepSelect,
        });
        if (!row) deny();
        response.json(iepDetailResponseSchema.parse({ data: mapIep(row) }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/organizations/:organizationId/ieps',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z.object({ organizationId: uuidSchema }).strict(),
          request.params,
        );
        const command = parseRequest(iepCreateCommandSchema, request.body);
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireIepPermission(membership, 'special-ed:write');
        assertStudentScope(membership, command.studentId);
        const row = await prisma.$transaction(async (transaction) => {
          await validateReferences(transaction, path.organizationId, command);
          const iep = await transaction.iEP.create({
            data: {
              organizationId: path.organizationId,
              ...rootData(command),
              state: 'DRAFT',
              createdById: auth.userId,
              updatedById: auth.userId,
              ...nestedData(command),
            },
            select: { id: true },
          });
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: path.organizationId,
            actorId: auth.userId,
            action: 'iep.create',
            targetType: 'IEP',
            targetId: iep.id,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: { changedFields: Object.keys(command) },
          });
          return transaction.iEP.findFirstOrThrow({
            where: { id: iep.id, organizationId: path.organizationId },
            select: iepSelect,
          });
        });
        response
          .status(201)
          .json(iepMutationResponseSchema.parse({ data: mapIep(row) }));
      } catch (error) {
        next(
          isUniqueConflict(error)
            ? new HttpError(
                409,
                'IEP_CONTENT_CONFLICT',
                'IEP content conflicts with an existing record.',
              )
            : error,
        );
      }
    },
  );

  router.put(
    '/organizations/:organizationId/ieps/:iepId',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z.object({ organizationId: uuidSchema, iepId: uuidSchema }).strict(),
          request.params,
        );
        const command = parseRequest(iepUpdateCommandSchema, request.body);
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireIepPermission(membership, 'special-ed:write');
        assertStudentScope(membership, command.studentId);
        const row = await prisma.$transaction(async (transaction) => {
          const existing = await transaction.iEP.findFirst({
            where: {
              id: path.iepId,
              organizationId: path.organizationId,
              state: 'DRAFT',
            },
            select: { id: true, studentId: true, version: true },
          });
          if (!existing) deny();
          assertStudentScope(membership, existing.studentId);
          if (existing.version !== command.expectedVersion)
            throw versionConflict();
          await validateReferences(transaction, path.organizationId, command);
          const updated = await transaction.iEP.updateMany({
            where: {
              id: path.iepId,
              organizationId: path.organizationId,
              state: 'DRAFT',
              version: command.expectedVersion,
            },
            data: {
              ...rootData(command),
              updatedById: auth.userId,
              version: { increment: 1 },
            },
          });
          if (updated.count !== 1) throw versionConflict();
          await Promise.all([
            transaction.iEPTeamMember.deleteMany({
              where: { iepId: path.iepId },
            }),
            transaction.iEPPerformanceArea.deleteMany({
              where: { iepId: path.iepId },
            }),
            transaction.iEPAccommodation.deleteMany({
              where: { iepId: path.iepId },
            }),
            transaction.iEPGoal.deleteMany({ where: { iepId: path.iepId } }),
            transaction.iEPServiceSchedule.deleteMany({
              where: { iepId: path.iepId },
            }),
          ]);
          const nested = nestedData(command);
          for (const item of nested.teamMembers.create) {
            await transaction.iEPTeamMember.create({
              data: { iepId: path.iepId, ...item },
            });
          }
          for (const item of nested.performanceAreas.create) {
            await transaction.iEPPerformanceArea.create({
              data: { iepId: path.iepId, ...item },
            });
          }
          for (const item of nested.accommodations.create) {
            await transaction.iEPAccommodation.create({
              data: { iepId: path.iepId, ...item },
            });
          }
          for (const item of nested.goals.create) {
            await transaction.iEPGoal.create({
              data: { iepId: path.iepId, ...item },
            });
          }
          for (const item of nested.services.create) {
            await transaction.iEPServiceSchedule.create({
              data: { iepId: path.iepId, ...item },
            });
          }
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: path.organizationId,
            actorId: auth.userId,
            action: 'iep.update',
            targetType: 'IEP',
            targetId: path.iepId,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: { changedFields: Object.keys(command) },
          });
          return transaction.iEP.findFirstOrThrow({
            where: { id: path.iepId, organizationId: path.organizationId },
            select: iepSelect,
          });
        });
        response.json(iepMutationResponseSchema.parse({ data: mapIep(row) }));
      } catch (error) {
        next(
          isUniqueConflict(error)
            ? new HttpError(
                409,
                'IEP_CONTENT_CONFLICT',
                'IEP content conflicts with an existing record.',
              )
            : error,
        );
      }
    },
  );

  return router;
}
