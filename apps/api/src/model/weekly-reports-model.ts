import type { WeeklyReportCreateCommand } from '@learnspace/contracts';
import {
  Prisma,
  type WorkflowAction,
  type WorkflowState,
} from '@prisma/client';
import type { MembershipRole } from '../utils/authorization.js';

export const weeklyReportSelect = {
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

export type WeeklyReportRow = Prisma.WeeklyReportGetPayload<{
  select: typeof weeklyReportSelect;
}>;
export type WeeklyReportWorkflowEvent = {
  id: string;
  aggregateId: string;
  fromState: WorkflowState;
  toState: WorkflowState;
  action: WorkflowAction;
  comment: string | null;
  occurredAt: Date;
  actor: {
    id: string;
    displayName: string;
    memberships: Array<{ role: MembershipRole; roleTitle: string | null }>;
  };
};

export function weeklyReportDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function weeklyReportGoalProgressData(
  command: WeeklyReportCreateCommand,
) {
  return command.goalProgress.map((progress) => ({
    ...progress,
    rating: progress.rating ?? null,
    notes: progress.notes ?? null,
    achievedDate: progress.achievedDate
      ? weeklyReportDate(progress.achievedDate)
      : null,
    achievedNote: progress.achievedNote ?? null,
  }));
}

export function weeklyReportIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function mapWeeklyReport(
  row: WeeklyReportRow,
  workflowEvents: readonly WeeklyReportWorkflowEvent[],
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
    weekStart: weeklyReportIsoDate(row.weekStart),
    weekEnd: weeklyReportIsoDate(row.weekEnd),
    goalProgress: row.goalProgress.map((progress) => ({
      ...progress,
      rating: progress.rating ?? null,
      notes: progress.notes ?? undefined,
      achievedDate: progress.achievedDate
        ? weeklyReportIsoDate(progress.achievedDate)
        : undefined,
      achievedNote: progress.achievedNote ?? undefined,
    })),
    workflowEvents: workflowEvents
      .filter((event) => event.aggregateId === row.id)
      .map((event) => ({
        id: event.id,
        fromState: event.fromState,
        toState: event.toState,
        action: event.action,
        comment: event.comment,
        occurredAt: event.occurredAt.toISOString(),
        actor: {
          id: event.actor.id,
          displayName: event.actor.displayName,
          role: event.actor.memberships[0]?.role ?? null,
          roleTitle: event.actor.memberships[0]?.roleTitle ?? null,
        },
      })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
