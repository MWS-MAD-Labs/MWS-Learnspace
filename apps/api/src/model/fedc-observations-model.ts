import { Prisma } from '@prisma/client';
import type { MembershipScope } from '../utils/authorization.js';
import {
  definitionSelect,
  mapDefinition,
} from '../model/observation-definitions-model.js';
import {
  canReadObservationStudent,
  deny,
} from '../utils/observations.policy.js';
import { isoDate } from '../utils/observations.shared.js';

export const fedcObservationSelect = {
  id: true,
  organizationId: true,
  assignmentId: true,
  studentId: true,
  definitionId: true,
  observerId: true,
  observationDate: true,
  status: true,
  responses: true,
  milestoneScores: true,
  totalScore: true,
  maxPossibleScore: true,
  notes: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: {
      id: true,
      organizationId: true,
      studentNumber: true,
      fullName: true,
      nickname: true,
      avatarUrl: true,
    },
  },
  observer: { select: { id: true, displayName: true } },
  definition: { select: definitionSelect },
  assignment: {
    select: {
      status: true,
      assignedTo: {
        select: { userId: true, organizationId: true, status: true },
      },
    },
  },
} satisfies Prisma.FEDCObservationSelect;

export type FedcObservationRow = Prisma.FEDCObservationGetPayload<{
  select: typeof fedcObservationSelect;
}>;

export function mapFedcObservation(row: FedcObservationRow) {
  const definition = mapDefinition(row.definition);
  return {
    id: row.id,
    organizationId: row.organizationId,
    assignmentId: row.assignmentId,
    studentId: row.studentId,
    definitionId: row.definitionId,
    observerId: row.observerId,
    observationDate: isoDate(row.observationDate),
    status: row.status,
    responses: row.responses,
    milestoneScores: row.milestoneScores,
    totalScore: row.totalScore,
    maxPossibleScore: row.maxPossibleScore,
    notes: row.notes,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    student: row.student,
    observer: row.observer,
    definition,
  };
}

export function requireFedcRead(
  row: FedcObservationRow,
  membership: MembershipScope,
  userId: string,
) {
  if (
    row.assignment.assignedTo.userId !== userId &&
    !canReadObservationStudent(membership, row.studentId, row.observationDate)
  ) {
    deny();
  }
}
