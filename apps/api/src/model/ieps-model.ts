import type { IepCreateCommand } from '@learnspace/contracts';
import {
  Prisma,
  type MembershipRole,
  type WorkflowAction,
  type WorkflowState,
} from '@prisma/client';
import { HttpError } from '../middleware/http-errors.js';

export const iepSelect = {
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
  student: { select: { id: true, studentNumber: true, fullName: true } },
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
      achieved: true,
      achievedDate: true,
      achievedNote: true,
      achievedInReportId: true,
      achievedEventId: true,
      lastAddressedDate: true,
      lastAddressedWeek: true,
      lastAddressedRating: true,
      timesAddressed: true,
      position: true,
      weeklyProgress: {
        where: { addressedThisWeek: true },
        orderBy: [
          { weeklyReport: { weekEnd: 'desc' as const } },
          { weeklyReportId: 'desc' as const },
        ],
        select: {
          weeklyReportId: true,
          rating: true,
          notes: true,
          markedAchievedThisWeek: true,
          weeklyReport: { select: { weekNumber: true, weekEnd: true } },
        },
      },
      achievementEvents: {
        orderBy: [{ occurredAt: 'desc' as const }, { id: 'desc' as const }],
        select: {
          id: true,
          weeklyReportId: true,
          achieved: true,
          achievedDate: true,
          note: true,
          sourceReportVersion: true,
          occurredAt: true,
          actor: { select: { id: true, displayName: true } },
        },
      },
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

export const iepListSelect = {
  ...iepSelect,
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
      achieved: true,
      achievedDate: true,
      achievedNote: true,
      achievedInReportId: true,
      achievedEventId: true,
      lastAddressedDate: true,
      lastAddressedWeek: true,
      lastAddressedRating: true,
      timesAddressed: true,
      position: true,
    },
  },
} satisfies Prisma.IEPSelect;

export type IepRow = Prisma.IEPGetPayload<{ select: typeof iepSelect }>;
export type IepListRow = Prisma.IEPGetPayload<{ select: typeof iepListSelect }>;
export type IepWorkflowEvent = {
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

export function iepDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function rootIepData(command: IepCreateCommand) {
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
      ? iepDate(command.parentApprovalDate)
      : null,
    startsOn: iepDate(command.startsOn),
    endsOn: iepDate(command.endsOn),
  };
}

export function nestedIepData(command: IepCreateCommand) {
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
          ? iepDate(item.assessmentDate)
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
        targetDate: item.targetDate ? iepDate(item.targetDate) : null,
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

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

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

function mapIepCommon(
  row: IepRow | IepListRow,
  goals: unknown[],
  workflowEvents: readonly IepWorkflowEvent[] = [],
) {
  return {
    ...row,
    goals,
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
    workflowEvents: workflowEvents.map((event) => ({
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

export function mapIepList(
  row: IepListRow,
  workflowEvents: readonly IepWorkflowEvent[] = [],
) {
  return mapIepCommon(
    row,
    row.goals.map((goal) => ({
      ...goal,
      targetDate: goal.targetDate ? isoDate(goal.targetDate) : null,
      achievedDate: goal.achievedDate ? isoDate(goal.achievedDate) : null,
      lastAddressedDate: goal.lastAddressedDate
        ? isoDate(goal.lastAddressedDate)
        : null,
    })),
    workflowEvents,
  );
}

export function mapIep(
  row: IepRow,
  workflowEvents: readonly IepWorkflowEvent[] = [],
) {
  return mapIepCommon(
    row,
    row.goals.map((goal) => {
      const { weeklyProgress, ...summary } = goal;
      return {
        ...summary,
        targetDate: goal.targetDate ? isoDate(goal.targetDate) : null,
        achievedDate: goal.achievedDate ? isoDate(goal.achievedDate) : null,
        lastAddressedDate: goal.lastAddressedDate
          ? isoDate(goal.lastAddressedDate)
          : null,
        addressedHistory: weeklyProgress.map((progress) => ({
          reportId: progress.weeklyReportId,
          weekNumber: progress.weeklyReport.weekNumber,
          date: isoDate(progress.weeklyReport.weekEnd),
          rating: progress.rating,
          notes: progress.notes,
          markedAchieved: progress.markedAchievedThisWeek,
        })),
        achievementEvents: goal.achievementEvents.map((event) => ({
          ...event,
          achievedDate: event.achievedDate ? isoDate(event.achievedDate) : null,
          occurredAt: event.occurredAt.toISOString(),
        })),
      };
    }),
    workflowEvents,
  );
}
