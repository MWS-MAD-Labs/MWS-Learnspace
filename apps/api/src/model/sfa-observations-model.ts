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

export const sfaObservationSelect = {
  id: true,
  organizationId: true,
  assignmentId: true,
  studentId: true,
  definitionId: true,
  observerId: true,
  assessmentDate: true,
  observationDate: true,
  status: true,
  programRecommendation: true,
  primaryLanguage: true,
  writingMethod: true,
  mobilityMethod: true,
  conditionsAffectingPerformance: true,
  respondents: true,
  participationScores: true,
  settings: true,
  taskSupports: true,
  activityPerformance: true,
  adaptations: true,
  participationAverage: true,
  totalParticipationRawScore: true,
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
} satisfies Prisma.SFAObservationSelect;

export type SfaObservationRow = Prisma.SFAObservationGetPayload<{
  select: typeof sfaObservationSelect;
}>;

export function mapSfaObservation(row: SfaObservationRow) {
  const participationScores =
    row.participationScores &&
    typeof row.participationScores === 'object' &&
    !Array.isArray(row.participationScores)
      ? (row.participationScores as Record<string, unknown>)
      : {};
  const derivedParticipationTotal = Object.values(participationScores).reduce(
    (total: number, rating) =>
      total +
      (typeof rating === 'number' && Number.isInteger(rating) ? rating : 0),
    0,
  );
  return {
    id: row.id,
    organizationId: row.organizationId,
    assignmentId: row.assignmentId,
    studentId: row.studentId,
    definitionId: row.definitionId,
    observerId: row.observerId,
    assessmentDate: isoDate(row.assessmentDate),
    observationDate: row.observationDate ? isoDate(row.observationDate) : null,
    status: row.status,
    programRecommendation: row.programRecommendation,
    primaryLanguage: row.primaryLanguage,
    writingMethod: row.writingMethod,
    mobilityMethod: row.mobilityMethod,
    conditionsAffectingPerformance: row.conditionsAffectingPerformance,
    respondents: row.respondents,
    participationScores,
    taskSupports: row.taskSupports,
    activityPerformance: row.activityPerformance,
    adaptations: row.adaptations,
    participationAverage: row.participationAverage.toNumber(),
    totalParticipationRawScore:
      row.totalParticipationRawScore ?? derivedParticipationTotal,
    notes: row.notes,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    student: row.student,
    observer: row.observer,
    definition: mapDefinition(row.definition),
  };
}

export function requireSfaRead(
  row: SfaObservationRow,
  membership: MembershipScope,
  userId: string,
) {
  if (
    row.assignment.assignedTo.userId !== userId &&
    !canReadObservationStudent(membership, row.studentId, row.assessmentDate)
  ) {
    deny();
  }
}
