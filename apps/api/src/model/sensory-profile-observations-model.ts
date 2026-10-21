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

export const sensoryProfileObservationSelect = {
  id: true,
  organizationId: true,
  assignmentId: true,
  studentId: true,
  definitionId: true,
  observerId: true,
  observationDate: true,
  status: true,
  teacherContactFrequency: true,
  teacherContactLength: true,
  responses: true,
  sectionScores: true,
  totalRawScore: true,
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
} satisfies Prisma.SensoryProfileObservationSelect;

export type SensoryProfileObservationRow =
  Prisma.SensoryProfileObservationGetPayload<{
    select: typeof sensoryProfileObservationSelect;
  }>;

export function mapSensoryProfileObservation(
  row: SensoryProfileObservationRow,
) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    assignmentId: row.assignmentId,
    studentId: row.studentId,
    definitionId: row.definitionId,
    observerId: row.observerId,
    observationDate: isoDate(row.observationDate),
    status: row.status,
    teacherContactFrequency: row.teacherContactFrequency,
    teacherContactLength: row.teacherContactLength,
    responses: row.responses,
    sectionScores: row.sectionScores,
    totalRawScore: row.totalRawScore,
    notes: row.notes,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    student: row.student,
    observer: row.observer,
    definition: mapDefinition(row.definition),
  };
}

export function requireSensoryProfileRead(
  row: SensoryProfileObservationRow,
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
