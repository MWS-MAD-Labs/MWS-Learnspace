import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import {
  transitionJourney,
  type JourneyTransition,
} from '../src/learningJourneyRoutes.js';
import type { MembershipScope } from '../src/authorization.js';

const organizationId = '11111111-1111-4111-8111-111111111111';
const journeyId = '22222222-2222-4222-8222-222222222222';
const actorId = '33333333-3333-4333-8333-333333333333';
const actorMembershipId = '44444444-4444-4444-8444-444444444444';
const membership: MembershipScope = {
  organizationId,
  role: 'PRINCIPAL',
  unitIds: [],
  gradeIds: [],
  subjectIds: [],
  assignedStudentIds: [],
};

function journeyRow(state: JourneyTransition['toState'], version: number) {
  return { id: journeyId, state, version };
}

function transactionFor(input: {
  state: JourneyTransition['fromState'];
  version?: number;
  updateCount?: number;
  workflowFailure?: Error;
  auditFailure?: Error;
  existing?: boolean;
}) {
  const workflowCreate = input.workflowFailure
    ? vi.fn().mockRejectedValue(input.workflowFailure)
    : vi.fn().mockResolvedValue({ id: 'event-id' });
  const auditCreate = input.auditFailure
    ? vi.fn().mockRejectedValue(input.auditFailure)
    : vi.fn().mockResolvedValue({ id: 'audit-id' });
  const transaction = {
    learningJourney: {
      findFirst: vi
        .fn()
        .mockResolvedValue(
          input.existing === false
            ? null
            : { state: input.state, version: input.version ?? 1 },
        ),
      updateMany: vi.fn().mockResolvedValue({ count: input.updateCount ?? 1 }),
      findFirstOrThrow: vi
        .fn()
        .mockResolvedValue(journeyRow(input.state, (input.version ?? 1) + 1)),
    },
    workflowEvent: { create: workflowCreate },
    auditEvent: { create: auditCreate },
  };
  return {
    transaction: transaction as unknown as Prisma.TransactionClient,
    mocks: { ...transaction, workflowCreate, auditCreate },
  };
}

function run(
  transaction: Prisma.TransactionClient,
  transition: JourneyTransition,
  overrides: Partial<Parameters<typeof transitionJourney>[0]> = {},
) {
  return transitionJourney({
    transaction,
    organizationId,
    journeyId,
    expectedVersion: 1,
    actorId,
    actorMembershipId,
    membership,
    requestId: 'request-id',
    requireOwner: false,
    transition,
    ...overrides,
  });
}

const validTransitions: JourneyTransition[] = [
  {
    fromState: 'DRAFT',
    toState: 'PRINCIPAL_REVIEW',
    action: 'SUBMITTED',
    auditAction: 'learning-journey.submit',
  },
  {
    fromState: 'PRINCIPAL_REVIEW',
    toState: 'DIRECTOR_APPROVAL',
    action: 'APPROVED',
    auditAction: 'learning-journey.principal-approve',
  },
  {
    fromState: 'PRINCIPAL_REVIEW',
    toState: 'DRAFT',
    action: 'RETURNED',
    auditAction: 'learning-journey.principal-return',
    comment: 'Revise the assessment milestones.',
  },
  {
    fromState: 'DIRECTOR_APPROVAL',
    toState: 'APPROVED',
    action: 'APPROVED',
    auditAction: 'learning-journey.director-approve',
  },
  {
    fromState: 'DIRECTOR_APPROVAL',
    toState: 'DRAFT',
    action: 'RETURNED',
    auditAction: 'learning-journey.director-return',
    comment: 'Clarify the final outcomes.',
  },
];

describe('learning journey workflow transition table', () => {
  it.each(validTransitions)(
    '$fromState --$action--> $toState persists the aggregate, workflow event, and audit event',
    async (transition) => {
      const { transaction, mocks } = transactionFor({
        state: transition.fromState,
      });

      await run(transaction, transition);

      expect(mocks.learningJourney.updateMany).toHaveBeenCalledWith({
        where: {
          id: journeyId,
          organizationId,
          state: transition.fromState,
          version: 1,
        },
        data: {
          state: transition.toState,
          updatedById: actorId,
          version: { increment: 1 },
        },
      });
      expect(mocks.workflowCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId,
          aggregateType: 'LEARNING_JOURNEY',
          aggregateId: journeyId,
          fromState: transition.fromState,
          toState: transition.toState,
          action: transition.action,
          actorId,
          comment: transition.comment ?? null,
        }),
      });
      expect(mocks.auditCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId,
          actorId,
          action: transition.auditAction,
          targetId: journeyId,
          result: 'SUCCEEDED',
        }),
      });
    },
  );

  it.each([
    ['PRINCIPAL_REVIEW', validTransitions[0]],
    ['DIRECTOR_APPROVAL', validTransitions[0]],
    ['APPROVED', validTransitions[0]],
    ['ACTIVE', validTransitions[0]],
    ['ARCHIVED', validTransitions[0]],
    ['DRAFT', validTransitions[1]],
    ['DIRECTOR_APPROVAL', validTransitions[1]],
    ['APPROVED', validTransitions[1]],
    ['DRAFT', validTransitions[3]],
    ['PRINCIPAL_REVIEW', validTransitions[3]],
    ['APPROVED', validTransitions[3]],
  ] as const)(
    'rejects source state %s for a transition requiring %s',
    async (state, transition) => {
      const { transaction, mocks } = transactionFor({ state });
      await expect(run(transaction, transition)).rejects.toMatchObject({
        status: 409,
        code: 'LEARNING_JOURNEY_INVALID_TRANSITION',
      });
      expect(mocks.learningJourney.updateMany).not.toHaveBeenCalled();
      expect(mocks.workflowCreate).not.toHaveBeenCalled();
      expect(mocks.auditCreate).not.toHaveBeenCalled();
    },
  );

  it('rejects a stale version before any persistence', async () => {
    const { transaction, mocks } = transactionFor({
      state: 'DRAFT',
      version: 2,
    });
    await expect(run(transaction, validTransitions[0])).rejects.toMatchObject({
      status: 409,
      code: 'LEARNING_JOURNEY_VERSION_CONFLICT',
    });
    expect(mocks.learningJourney.updateMany).not.toHaveBeenCalled();
  });

  it('allows only one of two simultaneous commands to win', async () => {
    let currentVersion = 1;
    const workflowCreate = vi.fn().mockResolvedValue({});
    const auditCreate = vi.fn().mockResolvedValue({});
    const transaction = {
      learningJourney: {
        findFirst: vi.fn().mockImplementation(async () => ({
          state: 'DRAFT',
          version: currentVersion,
        })),
        updateMany: vi.fn().mockImplementation(async ({ where }) => {
          if (where.version !== currentVersion) return { count: 0 };
          currentVersion += 1;
          return { count: 1 };
        }),
        findFirstOrThrow: vi
          .fn()
          .mockResolvedValue(journeyRow('PRINCIPAL_REVIEW', 2)),
      },
      workflowEvent: { create: workflowCreate },
      auditEvent: { create: auditCreate },
    } as unknown as Prisma.TransactionClient;

    const results = await Promise.allSettled([
      run(transaction, validTransitions[0]),
      run(transaction, validTransitions[0]),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(workflowCreate).toHaveBeenCalledTimes(1);
    expect(auditCreate).toHaveBeenCalledTimes(1);
  });

  it('denies cross-scope or non-owner submissions without revealing the journey', async () => {
    const { transaction, mocks } = transactionFor({
      state: 'DRAFT',
      existing: false,
    });
    await expect(
      run(transaction, validTransitions[0], { requireOwner: true }),
    ).rejects.toMatchObject({ status: 403, code: 'AUTHORIZATION_DENIED' });
    expect(mocks.learningJourney.updateMany).not.toHaveBeenCalled();
  });

  it('does not append an audit event when workflow persistence fails', async () => {
    const failure = new Error('workflow persistence failed');
    const { transaction, mocks } = transactionFor({
      state: 'DRAFT',
      workflowFailure: failure,
    });
    await expect(run(transaction, validTransitions[0])).rejects.toBe(failure);
    expect(mocks.auditCreate).not.toHaveBeenCalled();
    expect(mocks.learningJourney.findFirstOrThrow).not.toHaveBeenCalled();
  });

  it('does not return success when audit persistence fails', async () => {
    const failure = new Error('audit persistence failed');
    const { transaction, mocks } = transactionFor({
      state: 'DRAFT',
      auditFailure: failure,
    });
    await expect(run(transaction, validTransitions[0])).rejects.toBe(failure);
    expect(mocks.workflowCreate).toHaveBeenCalledOnce();
    expect(mocks.learningJourney.findFirstOrThrow).not.toHaveBeenCalled();
  });
});
