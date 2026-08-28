import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { transitionIep, type IepTransition } from '../src/iepRoutes.js';
import type { MembershipScope } from '../src/authorization.js';

const organizationId = '11111111-1111-4111-8111-111111111111';
const iepId = '22222222-2222-4222-8222-222222222222';
const actorId = '33333333-3333-4333-8333-333333333333';
const studentId = '44444444-4444-4444-8444-444444444444';
const membership: MembershipScope = {
  organizationId,
  role: 'DIRECTOR',
  unitIds: [],
  gradeIds: [],
  subjectIds: [],
  assignedStudentIds: [],
};

const transitions: IepTransition[] = [
  {
    fromState: 'DRAFT',
    toState: 'COORDINATOR_REVIEW',
    action: 'SUBMITTED',
    auditAction: 'iep.submit',
  },
  {
    fromState: 'COORDINATOR_REVIEW',
    toState: 'DIRECTOR_APPROVAL',
    action: 'APPROVED',
    auditAction: 'iep.coordinator-approve',
  },
  {
    fromState: 'COORDINATOR_REVIEW',
    toState: 'DRAFT',
    action: 'RETURNED',
    auditAction: 'iep.coordinator-return',
    comment: 'Revise the accommodations.',
  },
  {
    fromState: 'DIRECTOR_APPROVAL',
    toState: 'APPROVED',
    action: 'APPROVED',
    auditAction: 'iep.director-approve',
  },
  {
    fromState: 'DIRECTOR_APPROVAL',
    toState: 'COORDINATOR_REVIEW',
    action: 'RETURNED',
    auditAction: 'iep.director-return',
    comment: 'Confirm parent approval.',
  },
  {
    fromState: 'APPROVED',
    toState: 'ACTIVE',
    action: 'ACTIVATED',
    auditAction: 'iep.activate',
    archivePriorActive: true,
  },
  {
    fromState: 'ACTIVE',
    toState: 'ARCHIVED',
    action: 'ARCHIVED',
    auditAction: 'iep.archive',
  },
];

function transactionFor(input: {
  state: IepTransition['fromState'];
  version?: number;
  updateCount?: number;
  existing?: boolean;
  priorActive?: boolean;
  workflowFailure?: Error;
  auditFailure?: Error;
}) {
  const version = input.version ?? 1;
  const workflowCreate = input.workflowFailure
    ? vi.fn().mockRejectedValue(input.workflowFailure)
    : vi.fn().mockResolvedValue({ id: 'event-id' });
  const auditCreate = input.auditFailure
    ? vi.fn().mockRejectedValue(input.auditFailure)
    : vi.fn().mockResolvedValue({ id: 'audit-id' });
  const findFirst = vi
    .fn()
    .mockResolvedValueOnce(
      input.existing === false
        ? null
        : { studentId, state: input.state, version },
    );
  if (input.priorActive !== undefined) {
    findFirst.mockResolvedValueOnce(
      input.priorActive
        ? { id: '55555555-5555-4555-8555-555555555555', version: 3 }
        : null,
    );
  }
  const transaction = {
    $executeRaw: vi.fn().mockResolvedValue(1),
    iEP: {
      findFirst,
      updateMany: vi.fn().mockResolvedValue({ count: input.updateCount ?? 1 }),
      findFirstOrThrow: vi.fn().mockResolvedValue({
        id: iepId,
        organizationId,
        state: input.state,
        version: version + 1,
      }),
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
  transition: IepTransition,
  overrides: Partial<Parameters<typeof transitionIep>[0]> = {},
) {
  return transitionIep({
    transaction,
    organizationId,
    iepId,
    expectedVersion: 1,
    actorId,
    membership,
    onDate: new Date('2026-08-28T00:00:00.000Z'),
    requestId: 'request-id',
    transition,
    ...overrides,
  });
}

describe('IEP workflow transition table', () => {
  it.each(transitions)(
    '$fromState --$action--> $toState conditionally updates state and appends immutable workflow/audit events',
    async (transition) => {
      const { transaction, mocks } = transactionFor({
        state: transition.fromState,
        ...(transition.archivePriorActive ? { priorActive: false } : {}),
      });

      await run(transaction, transition);

      expect(mocks.iEP.updateMany).toHaveBeenLastCalledWith({
        where: {
          id: iepId,
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
      expect(mocks.workflowCreate).toHaveBeenLastCalledWith({
        data: expect.objectContaining({
          organizationId,
          aggregateType: 'IEP',
          aggregateId: iepId,
          fromState: transition.fromState,
          toState: transition.toState,
          action: transition.action,
          actorId,
          comment: transition.comment ?? null,
        }),
      });
      expect(mocks.auditCreate).toHaveBeenLastCalledWith({
        data: expect.objectContaining({
          organizationId,
          actorId,
          action: transition.auditAction,
          targetType: 'IEP',
          targetId: iepId,
          result: 'SUCCEEDED',
        }),
      });
    },
  );

  const states = [
    'DRAFT',
    'PRINCIPAL_REVIEW',
    'COORDINATOR_REVIEW',
    'DIRECTOR_APPROVAL',
    'APPROVED',
    'ACTIVE',
    'ARCHIVED',
  ] as const;
  const invalidCases = transitions.flatMap((transition) =>
    states
      .filter((state) => state !== transition.fromState)
      .map((state) => [state, transition] as const),
  );

  it.each(invalidCases)(
    'rejects source state %s for transition requiring $fromState',
    async (state, transition) => {
      const { transaction, mocks } = transactionFor({ state });
      await expect(run(transaction, transition)).rejects.toMatchObject({
        status: 409,
        code: 'IEP_INVALID_TRANSITION',
      });
      expect(mocks.iEP.updateMany).not.toHaveBeenCalled();
      expect(mocks.workflowCreate).not.toHaveBeenCalled();
      expect(mocks.auditCreate).not.toHaveBeenCalled();
    },
  );

  it('rejects stale commands before persistence', async () => {
    const { transaction, mocks } = transactionFor({
      state: 'DRAFT',
      version: 2,
    });
    await expect(run(transaction, transitions[0])).rejects.toMatchObject({
      status: 409,
      code: 'IEP_VERSION_CONFLICT',
    });
    expect(mocks.iEP.updateMany).not.toHaveBeenCalled();
  });

  it('allows only one simultaneous command to win', async () => {
    let currentVersion = 1;
    const workflowCreate = vi.fn().mockResolvedValue({});
    const auditCreate = vi.fn().mockResolvedValue({});
    const transaction = {
      iEP: {
        findFirst: vi.fn().mockImplementation(async () => ({
          studentId,
          state: 'DRAFT',
          version: currentVersion,
        })),
        updateMany: vi.fn().mockImplementation(async ({ where }) => {
          if (where.version !== currentVersion) return { count: 0 };
          currentVersion += 1;
          return { count: 1 };
        }),
        findFirstOrThrow: vi.fn().mockResolvedValue({ id: iepId }),
      },
      workflowEvent: { create: workflowCreate },
      auditEvent: { create: auditCreate },
    } as unknown as Prisma.TransactionClient;

    const results = await Promise.allSettled([
      run(transaction, transitions[0]),
      run(transaction, transitions[0]),
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

  it('archives a prior active IEP without rewriting its history when activating a replacement', async () => {
    const { transaction, mocks } = transactionFor({
      state: 'APPROVED',
      priorActive: true,
    });

    await run(transaction, transitions[5]);

    expect(mocks.iEP.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: '55555555-5555-4555-8555-555555555555',
        organizationId,
        state: 'ACTIVE',
        version: 3,
      },
      data: {
        state: 'ARCHIVED',
        updatedById: actorId,
        version: { increment: 1 },
      },
    });
    expect(mocks.workflowCreate).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        aggregateId: '55555555-5555-4555-8555-555555555555',
        fromState: 'ACTIVE',
        toState: 'ARCHIVED',
        action: 'ARCHIVED',
      }),
    });
    expect(mocks.workflowCreate).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        aggregateId: iepId,
        fromState: 'APPROVED',
        toState: 'ACTIVE',
        action: 'ACTIVATED',
      }),
    });
  });

  it('denies an unassigned scoped actor without revealing the IEP', async () => {
    const { transaction, mocks } = transactionFor({
      state: 'DRAFT',
      existing: false,
    });
    await expect(
      run(transaction, transitions[0], {
        membership: {
          ...membership,
          role: 'SPECIAL_ED_TEACHER',
          assignedStudentScopes: [],
        },
      }),
    ).rejects.toMatchObject({ status: 403, code: 'AUTHORIZATION_DENIED' });
    expect(mocks.iEP.updateMany).not.toHaveBeenCalled();
  });

  it('does not append an audit event when workflow event persistence fails', async () => {
    const failure = new Error('workflow failed');
    const { transaction, mocks } = transactionFor({
      state: 'DRAFT',
      workflowFailure: failure,
    });
    await expect(run(transaction, transitions[0])).rejects.toBe(failure);
    expect(mocks.auditCreate).not.toHaveBeenCalled();
    expect(mocks.iEP.findFirstOrThrow).not.toHaveBeenCalled();
  });

  it('does not return success when audit persistence fails', async () => {
    const failure = new Error('audit failed');
    const { transaction, mocks } = transactionFor({
      state: 'DRAFT',
      auditFailure: failure,
    });
    await expect(run(transaction, transitions[0])).rejects.toBe(failure);
    expect(mocks.workflowCreate).toHaveBeenCalledOnce();
    expect(mocks.iEP.findFirstOrThrow).not.toHaveBeenCalled();
  });
});
