import type { Prisma, WorkflowAction, WorkflowState } from '@prisma/client';
import type { MembershipScope } from '../utils/authorization.js';
import { HttpError } from '../middleware/http-errors.js';
import {
  activeAssignedStudentIds,
  denyIepAccess,
} from '../utils/ieps.policy.js';
import { iepSelect, type IepRow } from '../model/ieps-model.js';
import { createAuditService } from '../service/audit-service.js';

export type IepTransition = {
  fromState: WorkflowState;
  toState: WorkflowState;
  action: WorkflowAction;
  auditAction: string;
  comment?: string;
  archivePriorActive?: boolean;
};

function versionConflict() {
  return new HttpError(
    409,
    'IEP_VERSION_CONFLICT',
    'The IEP was changed by another request.',
  );
}

function invalidTransition() {
  return new HttpError(
    409,
    'IEP_INVALID_TRANSITION',
    'The IEP is not in a valid state for this action.',
  );
}

async function transitionIepWithPrisma(input: {
  database: Prisma.TransactionClient;
  organizationId: string;
  iepId: string;
  expectedVersion: number;
  actorId: string;
  membership: MembershipScope;
  requestId: string;
  transition: IepTransition;
  onDate: Date;
}): Promise<IepRow> {
  const scopedStudentIds = activeAssignedStudentIds(
    input.membership,
    input.onDate,
  );
  const existing = await input.database.iEP.findFirst({
    where: {
      id: input.iepId,
      organizationId: input.organizationId,
      ...(scopedStudentIds ? { studentId: { in: [...scopedStudentIds] } } : {}),
    },
    select: { studentId: true, state: true, version: true },
  });
  if (!existing) denyIepAccess();
  if (existing.version !== input.expectedVersion) throw versionConflict();
  if (existing.state !== input.transition.fromState) throw invalidTransition();

  if (input.transition.archivePriorActive) {
    await input.database.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${`${input.organizationId}:${existing.studentId}:active-iep`}, 0))
    `;
    const priorActive = await input.database.iEP.findFirst({
      where: {
        organizationId: input.organizationId,
        studentId: existing.studentId,
        state: 'ACTIVE',
        id: { not: input.iepId },
      },
      select: { id: true, version: true },
    });
    if (priorActive) {
      const archived = await input.database.iEP.updateMany({
        where: {
          id: priorActive.id,
          organizationId: input.organizationId,
          state: 'ACTIVE',
          version: priorActive.version,
        },
        data: {
          state: 'ARCHIVED',
          updatedById: input.actorId,
          version: { increment: 1 },
        },
      });
      if (archived.count !== 1) throw versionConflict();
      await input.database.workflowEvent.create({
        data: {
          organizationId: input.organizationId,
          aggregateType: 'IEP',
          aggregateId: priorActive.id,
          fromState: 'ACTIVE',
          toState: 'ARCHIVED',
          action: 'ARCHIVED',
          actorId: input.actorId,
          comment: `Archived when replacement IEP ${input.iepId} was activated.`,
        },
      });
      await createAuditService(input.database).append({
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: 'iep.archive-replaced',
        targetType: 'IEP',
        targetId: priorActive.id,
        requestId: input.requestId,
        result: 'SUCCEEDED',
        metadata: {
          replacementIepId: input.iepId,
          changedFields: ['state', 'version', 'updatedById'],
        },
      });
    }
  }

  const updated = await input.database.iEP.updateMany({
    where: {
      id: input.iepId,
      organizationId: input.organizationId,
      state: input.transition.fromState,
      version: input.expectedVersion,
    },
    data: {
      state: input.transition.toState,
      updatedById: input.actorId,
      version: { increment: 1 },
    },
  });
  if (updated.count !== 1) throw versionConflict();

  await input.database.workflowEvent.create({
    data: {
      organizationId: input.organizationId,
      aggregateType: 'IEP',
      aggregateId: input.iepId,
      fromState: input.transition.fromState,
      toState: input.transition.toState,
      action: input.transition.action,
      actorId: input.actorId,
      comment: input.transition.comment ?? null,
    },
  });
  await createAuditService(input.database).append({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: input.transition.auditAction,
    targetType: 'IEP',
    targetId: input.iepId,
    requestId: input.requestId,
    result: 'SUCCEEDED',
    metadata: { changedFields: ['state', 'version', 'updatedById'] },
  });
  return input.database.iEP.findFirstOrThrow({
    where: { id: input.iepId, organizationId: input.organizationId },
    select: iepSelect,
  });
}

export async function transitionIep(input: {
  transaction: Prisma.TransactionClient;
  organizationId: string;
  iepId: string;
  expectedVersion: number;
  actorId: string;
  membership: MembershipScope;
  requestId: string;
  transition: IepTransition;
  onDate: Date;
}): Promise<IepRow> {
  return transitionIepWithPrisma({
    ...input,
    database: input.transaction,
  });
}

export { transitionIepWithPrisma };
