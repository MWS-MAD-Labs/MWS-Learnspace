import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import {
  appendReportAchievementEvents,
  projectIepGoals,
} from '../src/iepGoalProjection.js';

const organizationId = '11111111-1111-4111-8111-111111111111';
const iepId = '22222222-2222-4222-8222-222222222222';
const reportId = '33333333-3333-4333-8333-333333333333';
const goalId = '44444444-4444-4444-8444-444444444444';
const actorId = '55555555-5555-4555-8555-555555555555';

describe('IEP goal projections', () => {
  it('preserves an explicit source timestamp on achievement events', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'event-1' });
    const tx = {
      goalAchievementEvent: { create },
    } as unknown as Prisma.TransactionClient;
    const occurredAt = new Date('2026-08-21T10:00:00.000Z');

    await appendReportAchievementEvents(tx, {
      organizationId,
      iepId,
      weeklyReportId: reportId,
      sourceReportVersion: 1,
      actorId,
      occurredAt,
      current: [
        {
          goalId,
          markedAchievedThisWeek: true,
          achievedNote: 'Imported historical achievement.',
        },
      ],
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ occurredAt }),
    });
  });

  it('orders nullable source versions after versioned report corrections', async () => {
    const findAchievementEvents = vi.fn().mockResolvedValue([]);
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ locked: 1 }]),
      weeklyGoalProgress: { findMany: vi.fn().mockResolvedValue([]) },
      goalAchievementEvent: { findMany: findAchievementEvents },
      iEPGoal: { update: vi.fn().mockResolvedValue({ id: goalId }) },
    } as unknown as Prisma.TransactionClient;

    await projectIepGoals(tx, iepId, [goalId]);

    expect(findAchievementEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { sourceReportVersion: { sort: 'desc', nulls: 'last' } },
          { occurredAt: 'desc' },
          { id: 'desc' },
        ],
      }),
    );
  });
});
