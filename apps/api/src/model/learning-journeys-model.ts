import type {
  LearningJourneyCreateCommand,
  LearningJourneyDetailResponse,
} from '@learnspace/contracts';
import { Prisma, type WorkflowState } from '@prisma/client';
import type { MembershipRole } from '../utils/authorization.js';

export const learningJourneySelect = {
  id: true,
  organizationId: true,
  title: true,
  state: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  academicYear: {
    select: {
      id: true,
      organizationId: true,
      name: true,
      startsOn: true,
      endsOn: true,
    },
  },
  semester: {
    select: {
      id: true,
      organizationId: true,
      academicYearId: true,
      name: true,
      position: true,
      startsOn: true,
      endsOn: true,
    },
  },
  unit: {
    select: { id: true, organizationId: true, code: true, name: true },
  },
  grade: {
    select: {
      id: true,
      organizationId: true,
      unitId: true,
      code: true,
      name: true,
      position: true,
    },
  },
  subject: {
    select: { id: true, organizationId: true, code: true, name: true },
  },
  createdBy: { select: { id: true, displayName: true } },
  updatedBy: { select: { id: true, displayName: true } },
  owners: {
    orderBy: { membershipId: 'asc' as const },
    select: {
      membership: {
        select: {
          id: true,
          userId: true,
          role: true,
          roleTitle: true,
          user: { select: { displayName: true } },
        },
      },
    },
  },
  projects: {
    orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
    select: {
      id: true,
      title: true,
      description: true,
      startsOn: true,
      endsOn: true,
      color: true,
      position: true,
      goals: {
        orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
        select: { id: true, description: true, position: true },
      },
      connections: {
        orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
        select: {
          id: true,
          subject: true,
          description: true,
          position: true,
        },
      },
    },
  },
} satisfies Prisma.LearningJourneySelect;

export type LearningJourneyRow = Prisma.LearningJourneyGetPayload<{
  select: typeof learningJourneySelect;
}>;

export function learningJourneyDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function nestedLearningJourneyProjects(
  command: LearningJourneyCreateCommand,
) {
  return command.projects.map((project) => ({
    title: project.title,
    description: project.description,
    startsOn: learningJourneyDate(project.startsOn),
    endsOn: learningJourneyDate(project.endsOn),
    color: project.color ?? null,
    position: project.position,
    goals: {
      create: project.goals.map((goal) => ({
        description: goal.description,
        position: goal.position,
      })),
    },
    connections: {
      create: project.connections.map((connection) => ({
        subject: connection.subject,
        description: connection.description,
        position: connection.position,
      })),
    },
  }));
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export type LearningJourneyWorkflowEvent = {
  id: string;
  aggregateId: string;
  fromState: WorkflowState;
  toState: WorkflowState;
  action:
    | 'SUBMITTED'
    | 'APPROVED'
    | 'RETURNED'
    | 'UPDATED'
    | 'ACTIVATED'
    | 'ARCHIVED';
  comment: string | null;
  occurredAt: Date;
  actor: {
    id: string;
    displayName: string;
    memberships: Array<{ role: MembershipRole; roleTitle: string | null }>;
  };
};

export function mapLearningJourney(
  row: LearningJourneyRow,
  workflowEvents: readonly LearningJourneyWorkflowEvent[] = [],
): LearningJourneyDetailResponse['data'] {
  return {
    id: row.id,
    organizationId: row.organizationId,
    title: row.title,
    academicYear: {
      id: row.academicYear.id,
      organizationId: row.academicYear.organizationId,
      name: row.academicYear.name,
      startsOn: isoDate(row.academicYear.startsOn),
      endsOn: isoDate(row.academicYear.endsOn),
    },
    semester: {
      id: row.semester.id,
      organizationId: row.semester.organizationId,
      academicYearId: row.semester.academicYearId,
      name: row.semester.name,
      position: row.semester.position,
      startsOn: isoDate(row.semester.startsOn),
      endsOn: isoDate(row.semester.endsOn),
    },
    unit: {
      id: row.unit.id,
      organizationId: row.unit.organizationId,
      code: row.unit.code,
      name: row.unit.name,
    },
    grade: {
      id: row.grade.id,
      organizationId: row.grade.organizationId,
      unitId: row.grade.unitId,
      code: row.grade.code,
      name: row.grade.name,
      position: row.grade.position,
    },
    subject: {
      id: row.subject.id,
      organizationId: row.subject.organizationId,
      code: row.subject.code,
      name: row.subject.name,
    },
    state: row.state,
    version: row.version,
    owners: row.owners.map(({ membership }) => ({
      membershipId: membership.id,
      userId: membership.userId,
      displayName: membership.user.displayName,
      role: membership.role,
      roleTitle: membership.roleTitle,
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
    projects: row.projects.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      startsOn: isoDate(project.startsOn),
      endsOn: isoDate(project.endsOn),
      color: project.color,
      position: project.position,
      goals: project.goals.map((goal) => ({
        id: goal.id,
        description: goal.description,
        position: goal.position,
      })),
      connections: project.connections.map((connection) => ({
        id: connection.id,
        subject: connection.subject,
        description: connection.description,
        position: connection.position,
      })),
    })),
    createdBy: {
      id: row.createdBy.id,
      displayName: row.createdBy.displayName,
    },
    updatedBy: {
      id: row.updatedBy.id,
      displayName: row.updatedBy.displayName,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
