import { Prisma } from '@prisma/client';
import { HttpError } from '../middleware/http-errors.js';
import { isoDate } from '../utils/observations.shared.js';

const eligibleAssigneeRoles = [
  'SPECIAL_ED_COORDINATOR',
  'SPECIAL_ED_TEACHER',
  'SPECIALIST',
] as const;

export const assignmentSelect = {
  id: true,
  organizationId: true,
  status: true,
  academicYear: true,
  dueDate: true,
  priority: true,
  notes: true,
  assignedAt: true,
  completedAt: true,
  cancelledAt: true,
  cancellationReason: true,
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
  definition: {
    select: {
      id: true,
      definitionKey: true,
      version: true,
      type: true,
      title: true,
      body: true,
      isActive: true,
      publishedAt: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      userId: true,
      role: true,
      roleTitle: true,
      user: { select: { displayName: true } },
    },
  },
  assignedBy: { select: { id: true, displayName: true } },
  cancelledBy: { select: { id: true, displayName: true } },
  fedcObservation: { select: { id: true } },
  sensoryObservation: { select: { id: true } },
  sfaObservation: { select: { id: true } },
} satisfies Prisma.ObservationAssignmentSelect;

export type AssignmentRow = Prisma.ObservationAssignmentGetPayload<{
  select: typeof assignmentSelect;
}>;

export function hasObservationRecord(row: AssignmentRow): boolean {
  return Boolean(
    row.fedcObservation || row.sensoryObservation || row.sfaObservation,
  );
}

export function mapAssignment(row: AssignmentRow) {
  if (!row.definition.publishedAt) {
    throw new HttpError(
      500,
      'OBSERVATION_DEFINITION_INVALID',
      'The assigned observation definition is not published.',
    );
  }
  return {
    id: row.id,
    organizationId: row.organizationId,
    status: row.status,
    academicYear: row.academicYear,
    dueDate: isoDate(row.dueDate),
    priority: row.priority,
    notes: row.notes,
    assignedAt: row.assignedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancellationReason: row.cancellationReason,
    student: row.student,
    definition: {
      ...row.definition,
      publishedAt: row.definition.publishedAt.toISOString(),
    },
    assignedTo: {
      membershipId: row.assignedTo.id,
      userId: row.assignedTo.userId,
      displayName: row.assignedTo.user.displayName,
      role: row.assignedTo.role,
      roleTitle: row.assignedTo.roleTitle,
    },
    assignedBy: row.assignedBy,
    cancelledBy: row.cancelledBy,
    hasObservationRecord: hasObservationRecord(row),
  };
}

export async function validateAssignmentReferences(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  command: {
    definitionId: string;
    assignedToMembershipId: string;
    studentId: string;
    academicYear: string;
  },
) {
  const [definition, assignee, student, academicYear] = await Promise.all([
    transaction.observationDefinition.findFirst({
      where: {
        id: command.definitionId,
        organizationId,
        isActive: true,
        publishedAt: { not: null },
      },
      select: { id: true },
    }),
    transaction.membership.findFirst({
      where: {
        id: command.assignedToMembershipId,
        organizationId,
        status: 'ACTIVE',
        role: { in: [...eligibleAssigneeRoles] },
        user: { status: 'ACTIVE' },
      },
      select: { id: true },
    }),
    transaction.student.findFirst({
      where: { id: command.studentId, organizationId, status: 'ACTIVE' },
      select: { id: true },
    }),
    transaction.academicYear.findFirst({
      where: { organizationId, name: command.academicYear },
      select: { id: true },
    }),
  ]);
  if (!definition || !assignee || !student || !academicYear) {
    throw new HttpError(
      400,
      'OBSERVATION_ASSIGNMENT_REFERENCE_INVALID',
      'The assignment references are invalid or inactive.',
    );
  }
}
