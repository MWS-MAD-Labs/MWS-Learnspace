import {
  weeklyReportCoordinatorDecisionCommandSchema,
  weeklyReportCreateCommandSchema,
  weeklyReportDirectorDecisionCommandSchema,
  weeklyReportMutationResponseSchema,
  weeklyReportSubmitCommandSchema,
  weeklyReportUpdateCommandSchema,
  weeklyReportsResponseSchema,
} from '@learnspace/contracts';
import { z } from 'zod';
import type {
  IEPReport,
  WeeklyGoalProgress,
  WorkflowHistoryEntry,
} from '../types';
import { apiClient } from './apiClient';

export type WeeklyReport = IEPReport & { version?: number };

const reportResponseSchema = weeklyReportMutationResponseSchema;
const reportsResponseSchema = weeklyReportsResponseSchema;

function organizationPath(organizationId: string): string {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function booleanValue(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function dateOnly(value: unknown): string {
  return stringValue(value).slice(0, 10);
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

function mapWorkflowHistory(value: unknown): WorkflowHistoryEntry[] {
  return arrayValue(value).map((item, index) => {
    const event = asRecord(item);
    const actor = asRecord(event.actor);
    return {
      id: stringValue(event.id, `weekly-report-event-${index}`),
      stage: stringValue(
        event.fromState,
        'Draft',
      ) as WorkflowHistoryEntry['stage'],
      action: stringValue(event.action, 'Updated'),
      status: stringValue(event.toState, stringValue(event.status, 'Updated')),
      actorId: optionalString(actor.id) ?? optionalString(event.actorId),
      actorName:
        optionalString(actor.displayName) ?? optionalString(event.actorName),
      actorRole:
        optionalString(actor.roleTitle) ?? optionalString(event.actorRole),
      timestamp: stringValue(event.occurredAt, stringValue(event.timestamp)),
      comment: optionalString(event.comment),
      notes: optionalString(event.comment) ?? optionalString(event.notes),
    };
  });
}

function mapGoalProgress(value: unknown): WeeklyGoalProgress[] {
  return arrayValue(value).map((item) => {
    const progress = asRecord(item);
    return {
      goalId: stringValue(progress.goalId),
      addressedThisWeek: booleanValue(progress.addressedThisWeek),
      rating: numberValue(progress.rating) as WeeklyGoalProgress['rating'],
      notes: optionalString(progress.notes),
      markedAchievedThisWeek: booleanValue(
        progress.markedAchievedThisWeek,
        booleanValue(progress.achieved),
      ),
      achievedDate: optionalString(progress.achievedDate),
      achievedNote: optionalString(progress.achievedNote),
    };
  });
}

export function mapWeeklyReportToView(value: unknown): WeeklyReport {
  const report = asRecord(value);
  const student = asRecord(report.student);
  const teacher = asRecord(report.teacher);
  const state = stringValue(report.state, 'DRAFT');
  return {
    id: stringValue(report.id),
    version: numberValue(report.version),
    studentId: stringValue(report.studentId, stringValue(student.id)),
    studentName:
      optionalString(student.fullName) ?? optionalString(report.studentName),
    grade: optionalString(student.grade) ?? optionalString(report.grade),
    iepId: stringValue(report.iepId),
    year: String(numberValue(report.year) ?? stringValue(report.year)),
    weekNumber: numberValue(report.weekNumber) ?? 0,
    weekRange: stringValue(report.weekRange),
    weekStart: dateOnly(report.weekStart),
    weekEnd: dateOnly(report.weekEnd),
    teacherId: stringValue(report.teacherId, stringValue(teacher.id)),
    teacherName:
      optionalString(teacher.displayName) ?? stringValue(report.teacherName),
    ...workflowStatuses(state),
    workflowHistory: mapWorkflowHistory(
      report.workflowEvents ?? report.workflowHistory,
    ),
    goalProgress: mapGoalProgress(report.goalProgress),
    descriptiveObservation: stringValue(report.descriptiveObservation),
    homeConnection: stringValue(report.homeConnection),
    createdAt: stringValue(report.createdAt),
    updatedAt: stringValue(report.updatedAt),
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
    filters: { studentId?: string; weekNumber?: number } = {},
    signal?: AbortSignal,
  ): Promise<WeeklyReport[]> {
    const query = new URLSearchParams();
    if (filters.studentId) query.set('studentId', filters.studentId);
    if (filters.weekNumber !== undefined)
      query.set('weekNumber', String(filters.weekNumber));
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
