import type { MembershipScope } from '../utils/authorization.js';
import { HttpError } from '../middleware/http-errors.js';
import type { Prisma } from '@prisma/client';
import { createAuditService } from '../service/audit-service.js';
import {
  assertWeeklyReportStudentScope,
  denyWeeklyReportAccess,
  requireWeeklyReportTransitionActor,
  type WeeklyReportTransitionKind,
} from '../utils/weekly-reports.policy.js';
import type { WeeklyReportRow } from '../model/weekly-reports-model.js';
import { weeklyReportSelect } from '../model/weekly-reports-model.js';

export function weeklyReportVersionConflict() {
  return new HttpError(
    409,
    'WEEKLY_REPORT_VERSION_CONFLICT',
    'The weekly report was changed by another request.',
  );
}

export async function transitionWeeklyReport(input: {
  database: Prisma.TransactionClient;
  organizationId: string;
  reportId: string;
  expectedVersion: number;
  decision?: 'APPROVE' | 'RETURN';
  comment?: string;
  actorId: string;
  membership: MembershipScope;
  requestId: string;
  kind: WeeklyReportTransitionKind;
  onDate: Date;
}): Promise<WeeklyReportRow> {
  const existing = await input.database.weeklyReport.findFirst({
    where: { id: input.reportId, organizationId: input.organizationId },
    select: weeklyReportSelect,
  });
  if (!existing) denyWeeklyReportAccess();
  assertWeeklyReportStudentScope(
    input.membership,
    existing.studentId,
    input.onDate,
  );
  requireWeeklyReportTransitionActor(
    input.membership,
    existing.teacherId,
    input.actorId,
    input.kind,
  );
  const fromState =
    input.kind === 'submit'
      ? 'DRAFT'
      : input.kind === 'coordinator'
        ? 'COORDINATOR_REVIEW'
        : 'DIRECTOR_APPROVAL';
  const toState =
    input.kind === 'submit'
      ? 'COORDINATOR_REVIEW'
      : input.kind === 'coordinator'
        ? input.decision === 'APPROVE'
          ? 'DIRECTOR_APPROVAL'
          : 'DRAFT'
        : input.decision === 'APPROVE'
          ? 'APPROVED'
          : 'COORDINATOR_REVIEW';
  if (existing.version !== input.expectedVersion) {
    throw weeklyReportVersionConflict();
  }
  if (existing.state !== fromState) {
    throw new HttpError(
      409,
      'WEEKLY_REPORT_INVALID_TRANSITION',
      'The weekly report is not in a valid state for this action.',
    );
  }
  const updated = await input.database.weeklyReport.updateMany({
    where: {
      id: existing.id,
      organizationId: input.organizationId,
      state: fromState,
      version: input.expectedVersion,
    },
    data: { state: toState, version: { increment: 1 } },
  });
  if (updated.count !== 1) throw weeklyReportVersionConflict();
  await input.database.workflowEvent.create({
    data: {
      organizationId: input.organizationId,
      aggregateType: 'WEEKLY_REPORT',
      aggregateId: existing.id,
      fromState,
      toState,
      action:
        input.decision === 'RETURN'
          ? 'RETURNED'
          : input.kind === 'submit'
            ? 'SUBMITTED'
            : 'APPROVED',
      actorId: input.actorId,
      comment: input.kind === 'submit' ? null : (input.comment ?? null),
    },
  });
  await createAuditService(input.database).append({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: `weekly-report.${input.kind}${input.decision ? `-${input.decision.toLowerCase()}` : ''}`,
    targetType: 'WEEKLY_REPORT',
    targetId: existing.id,
    requestId: input.requestId,
    result: 'SUCCEEDED',
    metadata: { changedFields: ['state', 'version'] },
  });
  const row = await input.database.weeklyReport.findFirst({
    where: { id: existing.id, organizationId: input.organizationId },
    select: weeklyReportSelect,
  });
  if (!row) throw new Error('Updated weekly report was not found.');
  return row;
}
