import type {
  WeeklyReportCreateCommand,
  WeeklyReportUpdateCommand,
} from '@learnspace/contracts';
import { weeklyReportListQuerySchema } from '@learnspace/contracts';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { z } from 'zod';
import type { MembershipScope } from '../utils/authorization.js';
import { HttpError } from '../middleware/http-errors.js';
import {
  mapWeeklyReport,
  weeklyReportDate,
  weeklyReportGoalProgressData,
  weeklyReportIsoDate,
  weeklyReportSelect,
} from '../model/weekly-reports-model.js';
import {
  assertWeeklyReportStudentScope,
  denyWeeklyReportAccess,
  requireWeeklyReportEditor,
  requireWeeklyReportPermission,
  requireWeeklyReportTeacher,
  weeklyReportAssignedStudentIds,
  type WeeklyReportTransitionKind,
} from '../utils/weekly-reports.policy.js';
import {
  transitionWeeklyReport,
  weeklyReportVersionConflict,
} from '../utils/weekly-reports.workflow.js';
import { createAuditService } from './audit-service.js';
import {
  appendReportAchievementEvents,
  projectIepGoals,
} from '../model/iep-goal-projection-model.js';

type WeeklyReportPrisma = PrismaClient | Prisma.TransactionClient;

type WeeklyReportListQuery = z.infer<typeof weeklyReportListQuerySchema>;

function duplicateWeek() {
  return new HttpError(
    409,
    'WEEKLY_REPORT_DUPLICATE_WEEK',
    'A weekly report already exists for this student and week.',
  );
}

function isUniqueConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

async function findReportOrDeny(
  database: WeeklyReportPrisma,
  organizationId: string,
  reportId: string,
) {
  const row = await database.weeklyReport.findFirst({
    where: { id: reportId, organizationId },
    select: weeklyReportSelect,
  });
  if (!row) denyWeeklyReportAccess();
  return row;
}

async function verifyReferences(
  database: WeeklyReportPrisma,
  organizationId: string,
  command: WeeklyReportCreateCommand,
) {
  const iep = await database.iEP.findFirst({
    where: {
      id: command.iepId,
      organizationId,
      studentId: command.studentId,
    },
    select: { id: true, state: true, startsOn: true, endsOn: true },
  });
  if (!iep || iep.state === 'ARCHIVED') {
    throw new HttpError(
      400,
      'WEEKLY_REPORT_INVALID_IEP',
      'The selected IEP is not valid for this report.',
    );
  }
  if (
    weeklyReportDate(command.weekStart) < iep.startsOn ||
    weeklyReportDate(command.weekEnd) > iep.endsOn
  ) {
    throw new HttpError(
      400,
      'WEEKLY_REPORT_DATE_OUT_OF_RANGE',
      'Report dates must fall within the selected IEP.',
    );
  }
  const goals = await database.iEPGoal.findMany({
    where: {
      iepId: command.iepId,
      id: { in: command.goalProgress.map((item) => item.goalId) },
    },
    select: { id: true },
  });
  if (goals.length !== command.goalProgress.length) {
    throw new HttpError(
      400,
      'WEEKLY_REPORT_GOAL_IEP_MISMATCH',
      'Every progress item must reference a goal on the selected IEP.',
    );
  }
}

export function createWeeklyReportService(
  prisma: PrismaClient,
  schoolDate: (organizationId: string) => Promise<Date>,
) {
  function findWorkflowEvents(
    organizationId: string,
    reportIds: readonly string[],
  ) {
    if (!reportIds.length) return Promise.resolve([]);
    return prisma.workflowEvent.findMany({
      where: {
        organizationId,
        aggregateType: 'WEEKLY_REPORT',
        aggregateId: { in: [...reportIds] },
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
  async function workflow(input: {
    organizationId: string;
    reportId: string;
    expectedVersion: number;
    decision?: 'APPROVE' | 'RETURN';
    comment?: string;
    actorId: string;
    membership: MembershipScope;
    requestId: string;
    kind: WeeklyReportTransitionKind;
  }) {
    requireWeeklyReportPermission(
      input.membership,
      input.kind === 'submit' ? 'special-ed:write' : 'special-ed:review',
    );
    const onDate = await schoolDate(input.organizationId);
    const row = await prisma.$transaction((transaction) =>
      transitionWeeklyReport({ ...input, database: transaction, onDate }),
    );
    const events = await findWorkflowEvents(input.organizationId, [row.id]);
    return mapWeeklyReport(row, events);
  }

  return {
    async list(input: {
      organizationId: string;
      query: WeeklyReportListQuery;
      membership: MembershipScope;
    }) {
      requireWeeklyReportPermission(input.membership, 'special-ed:read');
      const studentIds = weeklyReportAssignedStudentIds(
        input.membership,
        await schoolDate(input.organizationId),
      );
      const rows = await prisma.weeklyReport.findMany({
        where: {
          organizationId: input.organizationId,
          ...(studentIds ? { studentId: { in: [...studentIds] } } : {}),
          ...(input.query.studentId
            ? { studentId: input.query.studentId }
            : {}),
          ...(input.query.weekNumber
            ? { weekNumber: input.query.weekNumber }
            : {}),
          ...(input.query.year ? { year: input.query.year } : {}),
        },
        orderBy: [{ weekStart: 'desc' }, { id: 'asc' }],
        select: weeklyReportSelect,
      });
      const events = await findWorkflowEvents(
        input.organizationId,
        rows.map((row) => row.id),
      );
      return rows.map((row) => mapWeeklyReport(row, events));
    },

    async get(input: {
      organizationId: string;
      reportId: string;
      membership: MembershipScope;
    }) {
      requireWeeklyReportPermission(input.membership, 'special-ed:read');
      const row = await findReportOrDeny(
        prisma,
        input.organizationId,
        input.reportId,
      );
      assertWeeklyReportStudentScope(
        input.membership,
        row.studentId,
        await schoolDate(input.organizationId),
      );
      const events = await findWorkflowEvents(input.organizationId, [row.id]);
      return mapWeeklyReport(row, events);
    },

    async create(input: {
      organizationId: string;
      command: WeeklyReportCreateCommand;
      membership: MembershipScope;
      actorId: string;
      requestId: string;
    }) {
      requireWeeklyReportPermission(input.membership, 'special-ed:write');
      requireWeeklyReportTeacher(input.membership);
      assertWeeklyReportStudentScope(
        input.membership,
        input.command.studentId,
        await schoolDate(input.organizationId),
      );
      try {
        const row = await prisma.$transaction(async (transaction) => {
          await verifyReferences(
            transaction,
            input.organizationId,
            input.command,
          );
          const report = await transaction.weeklyReport.create({
            data: {
              organizationId: input.organizationId,
              studentId: input.command.studentId,
              iepId: input.command.iepId,
              year: input.command.year,
              weekNumber: input.command.weekNumber,
              weekStart: weeklyReportDate(input.command.weekStart),
              weekEnd: weeklyReportDate(input.command.weekEnd),
              teacherId: input.actorId,
              descriptiveObservation: input.command.descriptiveObservation,
              homeConnection: input.command.homeConnection,
              goalProgress: {
                create: weeklyReportGoalProgressData(input.command),
              },
            },
            select: { id: true },
          });
          await appendReportAchievementEvents(transaction, {
            organizationId: input.organizationId,
            iepId: input.command.iepId,
            weeklyReportId: report.id,
            sourceReportVersion: 1,
            actorId: input.actorId,
            current: input.command.goalProgress,
          });
          await projectIepGoals(
            transaction,
            input.command.iepId,
            input.command.goalProgress.map((progress) => progress.goalId),
          );
          await createAuditService(transaction).append({
            organizationId: input.organizationId,
            actorId: input.actorId,
            action: 'weekly-report.create',
            targetType: 'WEEKLY_REPORT',
            targetId: report.id,
            requestId: input.requestId,
            result: 'SUCCEEDED',
            metadata: { changedFields: Object.keys(input.command) },
          });
          return findReportOrDeny(transaction, input.organizationId, report.id);
        });
        return mapWeeklyReport(row, []);
      } catch (error) {
        throw isUniqueConflict(error) ? duplicateWeek() : error;
      }
    },

    async update(input: {
      organizationId: string;
      reportId: string;
      command: WeeklyReportUpdateCommand;
      membership: MembershipScope;
      actorId: string;
      requestId: string;
    }) {
      requireWeeklyReportPermission(input.membership, 'special-ed:write');
      const onDate = await schoolDate(input.organizationId);
      try {
        const row = await prisma.$transaction(async (transaction) => {
          const existing = await findReportOrDeny(
            transaction,
            input.organizationId,
            input.reportId,
          );
          assertWeeklyReportStudentScope(
            input.membership,
            existing.studentId,
            onDate,
          );
          requireWeeklyReportEditor(
            input.membership,
            existing.teacherId,
            input.actorId,
          );
          if (existing.state !== 'DRAFT') {
            throw new HttpError(
              409,
              'WEEKLY_REPORT_NOT_EDITABLE',
              'Only draft reports may be edited.',
            );
          }
          if (existing.version !== input.command.expectedVersion) {
            throw weeklyReportVersionConflict();
          }
          if (
            existing.studentId !== input.command.studentId ||
            existing.iepId !== input.command.iepId
          ) {
            throw new HttpError(
              400,
              'WEEKLY_REPORT_IDENTITY_IMMUTABLE',
              'Student and IEP cannot be changed.',
            );
          }
          await verifyReferences(
            transaction,
            input.organizationId,
            input.command,
          );
          const updated = await transaction.weeklyReport.updateMany({
            where: {
              id: input.reportId,
              organizationId: input.organizationId,
              state: 'DRAFT',
              version: input.command.expectedVersion,
            },
            data: {
              year: input.command.year,
              weekNumber: input.command.weekNumber,
              weekStart: weeklyReportDate(input.command.weekStart),
              weekEnd: weeklyReportDate(input.command.weekEnd),
              descriptiveObservation: input.command.descriptiveObservation,
              homeConnection: input.command.homeConnection,
              version: { increment: 1 },
            },
          });
          if (updated.count !== 1) throw weeklyReportVersionConflict();
          await transaction.weeklyGoalProgress.deleteMany({
            where: { weeklyReportId: input.reportId },
          });
          await transaction.weeklyGoalProgress.createMany({
            data: weeklyReportGoalProgressData(input.command).map(
              (progress) => ({
                weeklyReportId: input.reportId,
                iepId: input.command.iepId,
                ...progress,
              }),
            ),
          });
          await appendReportAchievementEvents(transaction, {
            organizationId: input.organizationId,
            iepId: input.command.iepId,
            weeklyReportId: input.reportId,
            sourceReportVersion: input.command.expectedVersion + 1,
            actorId: input.actorId,
            previous: existing.goalProgress.map((progress) => ({
              goalId: progress.goalId,
              markedAchievedThisWeek: progress.markedAchievedThisWeek,
              achievedDate: progress.achievedDate
                ? weeklyReportIsoDate(progress.achievedDate)
                : null,
              achievedNote: progress.achievedNote,
            })),
            current: input.command.goalProgress,
          });
          await projectIepGoals(transaction, input.command.iepId, [
            ...existing.goalProgress.map((progress) => progress.goalId),
            ...input.command.goalProgress.map((progress) => progress.goalId),
          ]);
          await createAuditService(transaction).append({
            organizationId: input.organizationId,
            actorId: input.actorId,
            action: 'weekly-report.update',
            targetType: 'WEEKLY_REPORT',
            targetId: input.reportId,
            requestId: input.requestId,
            result: 'SUCCEEDED',
            metadata: {
              changedFields: ['content', 'goalProgress', 'version'],
            },
          });
          return findReportOrDeny(
            transaction,
            input.organizationId,
            input.reportId,
          );
        });
        return mapWeeklyReport(row, []);
      } catch (error) {
        throw isUniqueConflict(error) ? duplicateWeek() : error;
      }
    },

    submit(input: {
      organizationId: string;
      reportId: string;
      expectedVersion: number;
      membership: MembershipScope;
      actorId: string;
      requestId: string;
    }) {
      return workflow({ ...input, kind: 'submit' });
    },

    coordinatorDecision(input: {
      organizationId: string;
      reportId: string;
      expectedVersion: number;
      decision: 'APPROVE' | 'RETURN';
      comment?: string;
      membership: MembershipScope;
      actorId: string;
      requestId: string;
    }) {
      return workflow({ ...input, kind: 'coordinator' });
    },

    directorDecision(input: {
      organizationId: string;
      reportId: string;
      expectedVersion: number;
      decision: 'APPROVE' | 'RETURN';
      comment?: string;
      membership: MembershipScope;
      actorId: string;
      requestId: string;
    }) {
      return workflow({ ...input, kind: 'director' });
    },
  };
}

export type WeeklyReportService = ReturnType<typeof createWeeklyReportService>;
