import { Prisma } from '@prisma/client';

export type AchievementSource = {
  goalId: string;
  markedAchievedThisWeek: boolean;
  achievedDate?: string | null;
  achievedNote?: string | null;
};

function utcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function appendReportAchievementEvents(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    iepId: string;
    weeklyReportId: string;
    sourceReportVersion: number;
    actorId: string;
    occurredAt?: Date;
    previous?: readonly AchievementSource[];
    current: readonly AchievementSource[];
  },
): Promise<void> {
  const previous = new Map(
    (input.previous ?? []).map((item) => [item.goalId, item]),
  );
  const current = new Map(input.current.map((item) => [item.goalId, item]));
  const goalIds = [...new Set([...previous.keys(), ...current.keys()])].sort();

  for (const goalId of goalIds) {
    const before = previous.get(goalId);
    const after = current.get(goalId);
    if (!before?.markedAchievedThisWeek && !after?.markedAchievedThisWeek) {
      continue;
    }
    await tx.goalAchievementEvent.create({
      data: {
        organizationId: input.organizationId,
        iepId: input.iepId,
        goalId,
        weeklyReportId: input.weeklyReportId,
        actorId: input.actorId,
        achieved: after?.markedAchievedThisWeek ?? false,
        achievedDate:
          after?.markedAchievedThisWeek && after.achievedDate
            ? utcDate(after.achievedDate)
            : null,
        note:
          after?.markedAchievedThisWeek && after.achievedNote
            ? after.achievedNote
            : null,
        sourceReportVersion: input.sourceReportVersion,
        occurredAt: input.occurredAt,
      },
    });
  }
}

export async function projectIepGoals(
  tx: Prisma.TransactionClient,
  iepId: string,
  goalIds: readonly string[],
): Promise<void> {
  const ids = [...new Set(goalIds)].sort();
  for (const goalId of ids) {
    await tx.$queryRaw`
      SELECT 1::integer AS "locked"
      WHERE pg_advisory_xact_lock(hashtextextended(${goalId}, 0)) IS NULL
    `;

    const [progress, achievementEvents] = await Promise.all([
      tx.weeklyGoalProgress.findMany({
        where: { iepId, goalId, addressedThisWeek: true },
        orderBy: [
          { weeklyReport: { weekEnd: 'desc' } },
          { weeklyReport: { weekNumber: 'desc' } },
          { weeklyReportId: 'desc' },
        ],
        select: {
          rating: true,
          weeklyReportId: true,
          weeklyReport: { select: { weekEnd: true, weekNumber: true } },
        },
      }),
      tx.goalAchievementEvent.findMany({
        where: { iepId, goalId },
        orderBy: [
          { sourceReportVersion: { sort: 'desc', nulls: 'last' } },
          { occurredAt: 'desc' },
          { id: 'desc' },
        ],
        select: {
          id: true,
          weeklyReportId: true,
          achieved: true,
          achievedDate: true,
          note: true,
          occurredAt: true,
        },
      }),
    ]);

    const latestByReport = new Map<
      string,
      (typeof achievementEvents)[number]
    >();
    let latestStandalone: (typeof achievementEvents)[number] | undefined;
    for (const event of achievementEvents) {
      if (!event.weeklyReportId) {
        latestStandalone ??= event;
      } else if (!latestByReport.has(event.weeklyReportId)) {
        latestByReport.set(event.weeklyReportId, event);
      }
    }
    const effectiveEvents = [
      ...latestByReport.values(),
      ...(latestStandalone ? [latestStandalone] : []),
    ];
    const achievement = effectiveEvents
      .filter((event) => event.achieved)
      .sort((left, right) => {
        const leftTime = (left.achievedDate ?? left.occurredAt).getTime();
        const rightTime = (right.achievedDate ?? right.occurredAt).getTime();
        return rightTime - leftTime || right.id.localeCompare(left.id);
      })[0];
    const latest = progress[0];

    await tx.iEPGoal.update({
      where: { id: goalId, iepId },
      data: {
        achieved: Boolean(achievement),
        achievedDate: achievement?.achievedDate ?? null,
        achievedNote: achievement?.note ?? null,
        achievedInReportId: achievement?.weeklyReportId ?? null,
        achievedEventId: achievement?.id ?? null,
        lastAddressedDate: latest?.weeklyReport.weekEnd ?? null,
        lastAddressedWeek: latest?.weeklyReport.weekNumber ?? null,
        lastAddressedRating: latest?.rating ?? null,
        timesAddressed: progress.length,
      },
    });
  }
}
