import type { ObservationStatus } from '@prisma/client';

export type ObservationGroups = [
  Array<{
    status: ObservationStatus;
    _count: { _all: number };
  }>,
  number,
  number,
  number,
];

export function mapObservationAggregate([
  groups,
  completedFedc,
  completedSensory,
  completedSfa,
]: ObservationGroups) {
  const statusCounts = new Map(
    groups.map((group) => [group.status, group._count._all]),
  );
  return {
    pending: statusCounts.get('PENDING') ?? 0,
    inProgress: statusCounts.get('IN_PROGRESS') ?? 0,
    completed: completedFedc + completedSensory + completedSfa,
    completedByType: {
      FEDC: completedFedc,
      SENSORY_PROFILE: completedSensory,
      SFA: completedSfa,
    },
  };
}
