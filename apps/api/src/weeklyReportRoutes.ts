import { Prisma, type MembershipRole, type PrismaClient } from '@prisma/client';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  weeklyReportCreateCommandSchema,
  weeklyReportDecisionCommandSchema,
  weeklyReportDetailResponseSchema,
  weeklyReportListQuerySchema,
  weeklyReportMutationResponseSchema,
  weeklyReportsResponseSchema,
  weeklyReportSubmitCommandSchema,
  weeklyReportUpdateCommandSchema,
  uuidSchema,
  type WeeklyReportCreateCommand,
} from '@learnspace/contracts';
import { createAuditRepository } from './audit.js';
import {
  requireOrganizationScope,
  requirePermission,
  AuthorizationDeniedError,
  type MembershipScope,
} from './authorization.js';
import {
  createCsrfProtection,
  createRequiredAuthentication,
  type AuthenticatedRequest,
} from './authRoutes.js';
import { HttpError, parseRequest } from './httpErrors.js';
import { activeAssignedStudentIds } from './iepRoutes.js';
import type { SessionService } from './sessionService.js';

const teacherRoles = new Set<MembershipRole>([
  'SPECIAL_ED_TEACHER',
  'SPECIALIST',
]);
const reportSelect = {
  id: true,
  organizationId: true,
  studentId: true,
  iepId: true,
  teacherId: true,
  year: true,
  weekNumber: true,
  weekStart: true,
  weekEnd: true,
  state: true,
  version: true,
  descriptiveObservation: true,
  homeConnection: true,
  createdAt: true,
  updatedAt: true,
  student: { select: { id: true, studentNumber: true, fullName: true } },
  teacher: {
    select: {
      id: true,
      displayName: true,
      memberships: {
        select: { organizationId: true, role: true, roleTitle: true },
      },
    },
  },
  goalProgress: {
    orderBy: { id: 'asc' as const },
    select: {
      id: true,
      goalId: true,
      addressedThisWeek: true,
      rating: true,
      notes: true,
      markedAchievedThisWeek: true,
      achievedDate: true,
      achievedNote: true,
    },
  },
} satisfies Prisma.WeeklyReportSelect;
type ReportRow = Prisma.WeeklyReportGetPayload<{ select: typeof reportSelect }>;
function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
function iso(value: Date) {
  return value.toISOString().slice(0, 10);
}
function deny(): never {
  throw new HttpError(403, 'AUTHORIZATION_DENIED', 'The request was denied.');
}
function unique(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
function auth(request: Request) {
  const value = (request as AuthenticatedRequest).auth;
  if (!value)
    throw new HttpError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication is required.',
    );
  return value;
}
function membership(request: Request, organizationId: string) {
  try {
    return requireOrganizationScope(auth(request).memberships, organizationId);
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) deny();
    throw error;
  }
}
function permission(
  scope: MembershipScope,
  value: 'special-ed:read' | 'special-ed:write' | 'special-ed:review',
) {
  try {
    requirePermission(scope, value);
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) deny();
    throw error;
  }
}
function scoped(scope: MembershipScope, studentId: string) {
  const ids = activeAssignedStudentIds(scope);
  if (ids !== undefined && !ids.includes(studentId)) deny();
}
async function events(
  prisma: PrismaClient | Prisma.TransactionClient,
  organizationId: string,
  ids: string[],
) {
  if (!ids.length) return [];
  return prisma.workflowEvent.findMany({
    where: {
      organizationId,
      aggregateType: 'WEEKLY_REPORT',
      aggregateId: { in: ids },
    },
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      aggregateId: true,
      fromState: true,
      toState: true,
      action: true,
      comment: true,
      occurredAt: true,
      actor: {
        select: {
          id: true,
          displayName: true,
          memberships: {
            where: { organizationId },
            take: 1,
            select: { role: true, roleTitle: true },
          },
        },
      },
    },
  });
}
function map(
  row: ReportRow,
  workflowEvents: Awaited<ReturnType<typeof events>>,
) {
  const { teacherId: _teacherId, teacher, ...report } = row;
  const teacherMembership = teacher.memberships.find(
    (membership) => membership.organizationId === row.organizationId,
  );
  return {
    ...report,
    teacher: {
      id: teacher.id,
      displayName: teacher.displayName,
      role: teacherMembership?.role ?? null,
      roleTitle: teacherMembership?.roleTitle ?? null,
    },
    weekStart: iso(row.weekStart),
    weekEnd: iso(row.weekEnd),
    goalProgress: row.goalProgress.map((p) => ({
      ...p,
      rating: p.rating ?? null,
      notes: p.notes ?? undefined,
      achievedDate: p.achievedDate ? iso(p.achievedDate) : undefined,
      achievedNote: p.achievedNote ?? undefined,
    })),
    workflowEvents: workflowEvents
      .filter((e) => e.aggregateId === row.id)
      .map((e) => ({
        id: e.id,
        fromState: e.fromState,
        toState: e.toState,
        action: e.action,
        comment: e.comment,
        occurredAt: e.occurredAt.toISOString(),
        actor: {
          id: e.actor.id,
          displayName: e.actor.displayName,
          role: e.actor.memberships[0]?.role ?? null,
          roleTitle: e.actor.memberships[0]?.roleTitle ?? null,
        },
      })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
async function verifyReferences(
  tx: Prisma.TransactionClient,
  organizationId: string,
  command: WeeklyReportCreateCommand,
) {
  const iep = await tx.iEP.findFirst({
    where: { id: command.iepId, organizationId, studentId: command.studentId },
    select: { id: true, state: true, startsOn: true, endsOn: true },
  });
  if (!iep || iep.state === 'ARCHIVED')
    throw new HttpError(
      400,
      'WEEKLY_REPORT_INVALID_IEP',
      'The selected IEP is not valid for this report.',
    );
  if (
    date(command.weekStart) < iep.startsOn ||
    date(command.weekEnd) > iep.endsOn
  )
    throw new HttpError(
      400,
      'WEEKLY_REPORT_DATE_OUT_OF_RANGE',
      'Report dates must fall within the selected IEP.',
    );
  const goals = await tx.iEPGoal.findMany({
    where: {
      iepId: command.iepId,
      id: { in: command.goalProgress.map((item) => item.goalId) },
    },
    select: { id: true },
  });
  if (goals.length !== command.goalProgress.length)
    throw new HttpError(
      400,
      'WEEKLY_REPORT_GOAL_IEP_MISMATCH',
      'Every progress item must reference a goal on the selected IEP.',
    );
}
function versionConflict() {
  return new HttpError(
    409,
    'WEEKLY_REPORT_VERSION_CONFLICT',
    'The weekly report was changed by another request.',
  );
}
async function read(
  tx: Prisma.TransactionClient | PrismaClient,
  organizationId: string,
  id: string,
) {
  const row = await tx.weeklyReport.findFirst({
    where: { id, organizationId },
    select: reportSelect,
  });
  if (!row) deny();
  return row;
}
export function createWeeklyReportRouter(
  prisma: PrismaClient,
  sessions: SessionService,
) {
  const router = Router();
  router.use(createRequiredAuthentication(sessions));
  router.get(
    '/organizations/:organizationId/weekly-reports',
    async (req, res, next) => {
      try {
        const path = parseRequest(
          z.object({ organizationId: uuidSchema }).strict(),
          req.params,
        );
        const query = parseRequest(weeklyReportListQuerySchema, req.query);
        const scope = membership(req, path.organizationId);
        permission(scope, 'special-ed:read');
        const ids = activeAssignedStudentIds(scope);
        const rows = await prisma.weeklyReport.findMany({
          where: {
            organizationId: path.organizationId,
            ...(ids ? { studentId: { in: ids } } : {}),
            ...(query.studentId ? { studentId: query.studentId } : {}),
            ...(query.weekNumber ? { weekNumber: query.weekNumber } : {}),
            ...(query.year ? { year: query.year } : {}),
          },
          orderBy: [{ weekStart: 'desc' }, { id: 'asc' }],
          select: reportSelect,
        });
        const history = await events(
          prisma,
          path.organizationId,
          rows.map((row) => row.id),
        );
        res.json(
          weeklyReportsResponseSchema.parse({
            data: rows.map((row) => map(row, history)),
            meta: { count: rows.length },
          }),
        );
      } catch (e) {
        next(e);
      }
    },
  );
  router.get(
    '/organizations/:organizationId/weekly-reports/:reportId',
    async (req, res, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, reportId: uuidSchema })
            .strict(),
          req.params,
        );
        const scope = membership(req, path.organizationId);
        permission(scope, 'special-ed:read');
        const row = await read(prisma, path.organizationId, path.reportId);
        scoped(scope, row.studentId);
        res.json(
          weeklyReportDetailResponseSchema.parse({
            data: map(row, await events(prisma, path.organizationId, [row.id])),
          }),
        );
      } catch (e) {
        next(e);
      }
    },
  );
  router.post(
    '/organizations/:organizationId/weekly-reports',
    createCsrfProtection(),
    async (req, res, next) => {
      try {
        const path = parseRequest(
          z.object({ organizationId: uuidSchema }).strict(),
          req.params,
        );
        const command = parseRequest(weeklyReportCreateCommandSchema, req.body);
        const session = auth(req);
        const scope = membership(req, path.organizationId);
        permission(scope, 'special-ed:write');
        if (!teacherRoles.has(scope.role)) deny();
        scoped(scope, command.studentId);
        const row = await prisma.$transaction(async (tx) => {
          await verifyReferences(tx, path.organizationId, command);
          const report = await tx.weeklyReport.create({
            data: {
              organizationId: path.organizationId,
              studentId: command.studentId,
              iepId: command.iepId,
              year: command.year,
              weekNumber: command.weekNumber,
              weekStart: date(command.weekStart),
              weekEnd: date(command.weekEnd),
              teacherId: session.userId,
              descriptiveObservation: command.descriptiveObservation,
              homeConnection: command.homeConnection,
              goalProgress: {
                create: command.goalProgress.map((p) => ({
                  ...p,
                  rating: p.rating ?? null,
                  notes: p.notes ?? null,
                  achievedDate: p.achievedDate ? date(p.achievedDate) : null,
                  achievedNote: p.achievedNote ?? null,
                })),
              },
            },
            select: { id: true },
          });
          await createAuditRepository(tx as PrismaClient).append({
            organizationId: path.organizationId,
            actorId: session.userId,
            action: 'weekly-report.create',
            targetType: 'WEEKLY_REPORT',
            targetId: report.id,
            requestId: String(res.locals.requestId),
            result: 'SUCCEEDED',
            metadata: { changedFields: Object.keys(command) },
          });
          return read(tx, path.organizationId, report.id);
        });
        res
          .status(201)
          .json(
            weeklyReportMutationResponseSchema.parse({ data: map(row, []) }),
          );
      } catch (e) {
        next(
          unique(e)
            ? new HttpError(
                409,
                'WEEKLY_REPORT_DUPLICATE_WEEK',
                'A weekly report already exists for this student and week.',
              )
            : e,
        );
      }
    },
  );
  router.put(
    '/organizations/:organizationId/weekly-reports/:reportId',
    createCsrfProtection(),
    async (req, res, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, reportId: uuidSchema })
            .strict(),
          req.params,
        );
        const command = parseRequest(weeklyReportUpdateCommandSchema, req.body);
        const session = auth(req);
        const scope = membership(req, path.organizationId);
        permission(scope, 'special-ed:write');
        const row = await prisma.$transaction(async (tx) => {
          const existing = await read(tx, path.organizationId, path.reportId);
          scoped(scope, existing.studentId);
          if (
            !teacherRoles.has(scope.role) ||
            existing.teacherId !== session.userId
          )
            deny();
          if (existing.state !== 'DRAFT')
            throw new HttpError(
              409,
              'WEEKLY_REPORT_NOT_EDITABLE',
              'Only draft reports may be edited.',
            );
          if (existing.version !== command.expectedVersion)
            throw versionConflict();
          if (
            existing.studentId !== command.studentId ||
            existing.iepId !== command.iepId
          )
            throw new HttpError(
              400,
              'WEEKLY_REPORT_IDENTITY_IMMUTABLE',
              'Student and IEP cannot be changed.',
            );
          await verifyReferences(tx, path.organizationId, command);
          const updated = await tx.weeklyReport.updateMany({
            where: {
              id: path.reportId,
              organizationId: path.organizationId,
              state: 'DRAFT',
              version: command.expectedVersion,
            },
            data: {
              year: command.year,
              weekNumber: command.weekNumber,
              weekStart: date(command.weekStart),
              weekEnd: date(command.weekEnd),
              descriptiveObservation: command.descriptiveObservation,
              homeConnection: command.homeConnection,
              version: { increment: 1 },
            },
          });
          if (updated.count !== 1) throw versionConflict();
          await tx.weeklyGoalProgress.deleteMany({
            where: { weeklyReportId: path.reportId },
          });
          await tx.weeklyGoalProgress.createMany({
            data: command.goalProgress.map((p) => ({
              weeklyReportId: path.reportId,
              iepId: command.iepId,
              goalId: p.goalId,
              addressedThisWeek: p.addressedThisWeek,
              rating: p.rating ?? null,
              notes: p.notes ?? null,
              markedAchievedThisWeek: p.markedAchievedThisWeek,
              achievedDate: p.achievedDate ? date(p.achievedDate) : null,
              achievedNote: p.achievedNote ?? null,
            })),
          });
          await createAuditRepository(tx as PrismaClient).append({
            organizationId: path.organizationId,
            actorId: session.userId,
            action: 'weekly-report.update',
            targetType: 'WEEKLY_REPORT',
            targetId: path.reportId,
            requestId: String(res.locals.requestId),
            result: 'SUCCEEDED',
            metadata: { changedFields: ['content', 'goalProgress', 'version'] },
          });
          return read(tx, path.organizationId, path.reportId);
        });
        res.json(
          weeklyReportMutationResponseSchema.parse({ data: map(row, []) }),
        );
      } catch (e) {
        next(
          unique(e)
            ? new HttpError(
                409,
                'WEEKLY_REPORT_DUPLICATE_WEEK',
                'A weekly report already exists for this student and week.',
              )
            : e,
        );
      }
    },
  );
  async function transition(
    req: Request,
    res: Response,
    kind: 'submit' | 'coordinator' | 'director',
  ) {
    const path = parseRequest(
      z.object({ organizationId: uuidSchema, reportId: uuidSchema }).strict(),
      req.params,
    );
    const command = parseRequest(
      kind === 'submit'
        ? weeklyReportSubmitCommandSchema
        : weeklyReportDecisionCommandSchema,
      req.body,
    );
    const session = auth(req);
    const scope = membership(req, path.organizationId);
    permission(
      scope,
      kind === 'submit' ? 'special-ed:write' : 'special-ed:review',
    );
    const decision =
      kind === 'submit'
        ? undefined
        : (command as unknown as { decision: 'APPROVE' | 'RETURN' }).decision;
    const expected = command.expectedVersion;
    const row = await prisma.$transaction(async (tx) => {
      const existing = await read(tx, path.organizationId, path.reportId);
      scoped(scope, existing.studentId);
      const teacher =
        kind === 'submit' &&
        teacherRoles.has(scope.role) &&
        existing.teacherId === session.userId;
      const coordinator =
        kind === 'coordinator' && scope.role === 'SPECIAL_ED_COORDINATOR';
      const director = kind === 'director' && scope.role === 'DIRECTOR';
      if (!teacher && !coordinator && !director) deny();
      const from =
        kind === 'submit'
          ? 'DRAFT'
          : kind === 'coordinator'
            ? 'COORDINATOR_REVIEW'
            : 'DIRECTOR_APPROVAL';
      const to =
        kind === 'submit'
          ? 'COORDINATOR_REVIEW'
          : kind === 'coordinator'
            ? decision === 'APPROVE'
              ? 'DIRECTOR_APPROVAL'
              : 'DRAFT'
            : decision === 'APPROVE'
              ? 'APPROVED'
              : 'COORDINATOR_REVIEW';
      if (existing.version !== expected) throw versionConflict();
      if (existing.state !== from)
        throw new HttpError(
          409,
          'WEEKLY_REPORT_INVALID_TRANSITION',
          'The weekly report is not in a valid state for this action.',
        );
      const updated = await tx.weeklyReport.updateMany({
        where: {
          id: existing.id,
          organizationId: path.organizationId,
          state: from,
          version: expected,
        },
        data: { state: to, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw versionConflict();
      await tx.workflowEvent.create({
        data: {
          organizationId: path.organizationId,
          aggregateType: 'WEEKLY_REPORT',
          aggregateId: existing.id,
          fromState: from,
          toState: to,
          action:
            decision === 'RETURN'
              ? 'RETURNED'
              : kind === 'submit'
                ? 'SUBMITTED'
                : 'APPROVED',
          actorId: session.userId,
          comment:
            kind === 'submit'
              ? null
              : ((command as { comment?: string }).comment ?? null),
        },
      });
      await createAuditRepository(tx as PrismaClient).append({
        organizationId: path.organizationId,
        actorId: session.userId,
        action: `weekly-report.${kind}${decision ? `-${decision.toLowerCase()}` : ''}`,
        targetType: 'WEEKLY_REPORT',
        targetId: existing.id,
        requestId: String(res.locals.requestId),
        result: 'SUCCEEDED',
        metadata: { changedFields: ['state', 'version'] },
      });
      return read(tx, path.organizationId, existing.id);
    });
    res.json(
      weeklyReportMutationResponseSchema.parse({
        data: map(row, await events(prisma, path.organizationId, [row.id])),
      }),
    );
  }
  router.post(
    '/organizations/:organizationId/weekly-reports/:reportId/submit',
    createCsrfProtection(),
    (req, res, next) => transition(req, res, 'submit').catch(next),
  );
  router.post(
    '/organizations/:organizationId/weekly-reports/:reportId/coordinator-decision',
    createCsrfProtection(),
    (req, res, next) => transition(req, res, 'coordinator').catch(next),
  );
  router.post(
    '/organizations/:organizationId/weekly-reports/:reportId/director-decision',
    createCsrfProtection(),
    (req, res, next) => transition(req, res, 'director').catch(next),
  );
  return router;
}
