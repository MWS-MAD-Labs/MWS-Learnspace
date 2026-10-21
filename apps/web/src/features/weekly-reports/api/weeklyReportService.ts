import {
  weeklyReportCoordinatorDecisionCommandSchema,
  weeklyReportCreateCommandSchema,
  weeklyReportDirectorDecisionCommandSchema,
  weeklyReportMutationResponseSchema,
  weeklyReportSubmitCommandSchema,
  weeklyReportUpdateCommandSchema,
  weeklyReportDateRange,
  weeklyReportsResponseSchema,
} from '@learnspace/contracts';
import { z } from 'zod';
import type {
  IEPReport,
  WeeklyGoalProgress,
  WorkflowHistoryEntry,
} from '../../../types';
import { apiClient } from '../../../services/apiClient';

export type WeeklyReport = IEPReport & { version?: number };

type WeeklyReportResponse = z.infer<typeof weeklyReportMutationResponseSchema>;
type WeeklyReportRecord = WeeklyReportResponse['data'];
type WeeklyReportWorkflowEvent = WeeklyReportRecord['workflowEvents'][number];
type WeeklyReportGoalProgress = WeeklyReportRecord['goalProgress'][number];

const reportResponseSchema = weeklyReportMutationResponseSchema;
const reportsResponseSchema = weeklyReportsResponseSchema;

function organizationPath(organizationId: string): string {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}`;
}

function workflowStatuses(
  state: string,
): Pick<
  IEPReport,
  | 'status'
  | 'draftStatus'
  | 'coordinatorReviewStatus'
  | 'directorApprovalStatus'
> {
  if (state === 'COORDINATOR_REVIEW') {
    return {
      status: 'In Review',
      draftStatus: 'Done',
      coordinatorReviewStatus: 'On Progress',
      directorApprovalStatus: 'Not Started',
    };
  }
  if (state === 'DIRECTOR_APPROVAL') {
    return {
      status: 'In Review',
      draftStatus: 'Done',
      coordinatorReviewStatus: 'Done',
      directorApprovalStatus: 'On Progress',
    };
  }
  if (state === 'APPROVED') {
    return {
      status: 'Approved',
      draftStatus: 'Done',
      coordinatorReviewStatus: 'Done',
      directorApprovalStatus: 'Done',
    };
  }
  return {
    status: 'Draft',
    draftStatus: 'On Progress',
    coordinatorReviewStatus: 'Not Started',
    directorApprovalStatus: 'Not Started',
  };
}

function mapWorkflowHistory(
  events: WeeklyReportWorkflowEvent[],
): WorkflowHistoryEntry[] {
  return events.map((event) => ({
    id: event.id,
    stage: event.fromState,
    action: event.action,
    status: event.toState,
    actorId: event.actor.id,
    actorName: event.actor.displayName,
    actorRole: event.actor.roleTitle ?? event.actor.role ?? undefined,
    timestamp: event.occurredAt,
    comment: event.comment ?? undefined,
    notes: event.comment ?? undefined,
  }));
}

function mapGoalProgress(
  records: WeeklyReportGoalProgress[],
): WeeklyGoalProgress[] {
  return records.map((progress) => ({
    goalId: progress.goalId,
    addressedThisWeek: progress.addressedThisWeek,
    rating: weeklyGoalRating(progress.rating),
    notes: progress.notes,
    markedAchievedThisWeek: progress.markedAchievedThisWeek,
    achievedDate: progress.achievedDate,
    achievedNote: progress.achievedNote,
  }));
}

function weeklyGoalRating(
  rating: number | null | undefined,
): WeeklyGoalProgress['rating'] {
  switch (rating) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
      return rating;
    default:
      return undefined;
  }
}

export function mapWeeklyReportToView(
  report: WeeklyReportRecord,
): WeeklyReport {
  return {
    id: report.id,
    version: report.version,
    studentId: report.studentId,
    studentName: report.student.fullName,
    iepId: report.iepId,
    year: String(report.year),
    weekNumber: report.weekNumber,
    weekRange: weeklyReportDateRange(report.year, report.weekNumber).range,
    weekStart: report.weekStart,
    weekEnd: report.weekEnd,
    teacherId: report.teacher.id,
    teacherName: report.teacher.displayName,
    ...workflowStatuses(report.state),
    workflowHistory: mapWorkflowHistory(report.workflowEvents),
    goalProgress: mapGoalProgress(report.goalProgress),
    descriptiveObservation: report.descriptiveObservation,
    homeConnection: report.homeConnection,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

function reportCommand(
  report: WeeklyReport,
  includeVersion: boolean,
): Record<string, unknown> {
  return {
    ...(includeVersion && report.version !== undefined
      ? { expectedVersion: report.version }
      : {}),
    studentId: report.studentId,
    iepId: report.iepId,
    year: report.year,
    weekNumber: report.weekNumber,
    weekStart: report.weekStart,
    weekEnd: report.weekEnd,
    descriptiveObservation: report.descriptiveObservation,
    homeConnection: report.homeConnection,
    goalProgress: report.goalProgress.map((progress) => ({
      goalId: progress.goalId,
      addressedThisWeek: progress.addressedThisWeek,
      rating: progress.rating,
      notes: progress.notes || undefined,
      markedAchievedThisWeek: progress.markedAchievedThisWeek ?? false,
      achievedDate: progress.achievedDate || undefined,
      achievedNote: progress.achievedNote || undefined,
    })),
  };
}

function parseCommand(schema: z.ZodType<unknown>, command: unknown): unknown {
  return schema.parse(command);
}

async function workflowCommand(
  organizationId: string,
  reportId: string,
  action: 'submit' | 'coordinator-decision' | 'director-decision',
  command: unknown,
  schema: z.ZodType<unknown>,
  signal?: AbortSignal,
): Promise<WeeklyReport> {
  const response = await apiClient.request(
    `${organizationPath(organizationId)}/weekly-reports/${encodeURIComponent(reportId)}/${action}`,
    {
      method: 'POST',
      body: parseCommand(schema, command),
      schema: reportResponseSchema,
      signal,
    },
  );
  return mapWeeklyReportToView(response.data);
}

export const weeklyReportService = {
  async getWeeklyReports(
    organizationId: string,
    filters: { studentId?: string; weekNumber?: number; year?: number } = {},
    signal?: AbortSignal,
  ): Promise<WeeklyReport[]> {
    const query = new URLSearchParams();
    if (filters.studentId) query.set('studentId', filters.studentId);
    if (filters.weekNumber !== undefined)
      query.set('weekNumber', String(filters.weekNumber));
    if (filters.year !== undefined) query.set('year', String(filters.year));
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/weekly-reports${query.size ? `?${query}` : ''}`,
      { schema: reportsResponseSchema, signal },
    );
    return response.data.map(mapWeeklyReportToView);
  },

  async getWeeklyReport(
    organizationId: string,
    reportId: string,
    signal?: AbortSignal,
  ): Promise<WeeklyReport> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/weekly-reports/${encodeURIComponent(reportId)}`,
      { schema: reportResponseSchema, signal },
    );
    return mapWeeklyReportToView(response.data);
  },

  async createWeeklyReport(
    organizationId: string,
    report: WeeklyReport,
    signal?: AbortSignal,
  ): Promise<WeeklyReport> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/weekly-reports`,
      {
        method: 'POST',
        body: parseCommand(
          weeklyReportCreateCommandSchema,
          reportCommand(report, false),
        ),
        schema: reportResponseSchema,
        signal,
      },
    );
    return mapWeeklyReportToView(response.data);
  },

  async updateWeeklyReport(
    organizationId: string,
    report: WeeklyReport,
    signal?: AbortSignal,
  ): Promise<WeeklyReport> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/weekly-reports/${encodeURIComponent(report.id)}`,
      {
        method: 'PUT',
        body: parseCommand(
          weeklyReportUpdateCommandSchema,
          reportCommand(report, true),
        ),
        schema: reportResponseSchema,
        signal,
      },
    );
    return mapWeeklyReportToView(response.data);
  },

  submitWeeklyReport(
    organizationId: string,
    report: WeeklyReport,
    signal?: AbortSignal,
  ): Promise<WeeklyReport> {
    return workflowCommand(
      organizationId,
      report.id,
      'submit',
      { expectedVersion: report.version },
      weeklyReportSubmitCommandSchema,
      signal,
    );
  },

  coordinatorDecision(
    organizationId: string,
    report: WeeklyReport,
    decision: 'APPROVE' | 'RETURN',
    comment?: string,
    signal?: AbortSignal,
  ): Promise<WeeklyReport> {
    return workflowCommand(
      organizationId,
      report.id,
      'coordinator-decision',
      { expectedVersion: report.version, decision, comment },
      weeklyReportCoordinatorDecisionCommandSchema,
      signal,
    );
  },

  directorDecision(
    organizationId: string,
    report: WeeklyReport,
    decision: 'APPROVE' | 'RETURN',
    comment?: string,
    signal?: AbortSignal,
  ): Promise<WeeklyReport> {
    return workflowCommand(
      organizationId,
      report.id,
      'director-decision',
      { expectedVersion: report.version, decision, comment },
      weeklyReportDirectorDecisionCommandSchema,
      signal,
    );
  },
};
