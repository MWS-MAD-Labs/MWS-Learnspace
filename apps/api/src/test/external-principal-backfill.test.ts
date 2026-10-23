import { describe, expect, it, vi } from 'vitest';
import { backfillExternalPrincipals } from '../service/external-principal-backfill-service.js';

function prisma(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      findMany: vi.fn(async () => [
        { id: 'user-1', email: ' Person@Example.Test ' },
      ]),
    },
    externalPrincipal: {
      findUnique: vi.fn<() => Promise<Record<string, string> | null>>(
        async () => null,
      ),
      create: vi.fn(async () => ({})),
      ...overrides,
    },
  };
}

describe('external principal backfill', () => {
  it('dry-runs unique normalized email matches without writing PII', async () => {
    const database = prisma();
    const central = {
      lookupEmployee: vi.fn(async ({ email }) => ({
        person_id: 'person-1',
        email,
      })),
    };
    await expect(
      backfillExternalPrincipals({
        prisma: database as never,
        central,
        issuer: 'mws-hub',
        mode: 'dry-run',
      }),
    ).resolves.toEqual({
      mode: 'dry-run',
      counts: {
        scanned: 1,
        eligible: 1,
        created: 0,
        alreadyLinked: 0,
        conflicts: 0,
      },
      conflicts: {},
    });
    expect(central.lookupEmployee).toHaveBeenCalledWith({
      email: 'person@example.test',
    });
    expect(database.externalPrincipal.create).not.toHaveBeenCalled();
  });

  it('applies verified sidecar links idempotently', async () => {
    const database = prisma();
    const central = {
      lookupEmployee: vi.fn(async () => ({
        person_id: 'person-1',
        email: 'person@example.test',
      })),
    };
    const first = await backfillExternalPrincipals({
      prisma: database as never,
      central,
      issuer: 'mws-hub',
      mode: 'apply',
    });
    expect(first.counts.created).toBe(1);
    expect(database.externalPrincipal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        issuer: 'mws-hub',
        subject: 'person-1',
        source: 'employee',
        linkSource: 'normalized_email_backfill',
        verified: true,
      }),
    });

    database.externalPrincipal.findUnique.mockResolvedValue({
      userId: 'user-1',
      subject: 'person-1',
    });
    const second = await backfillExternalPrincipals({
      prisma: database as never,
      central,
      issuer: 'mws-hub',
      mode: 'apply',
    });
    expect(second.counts.alreadyLinked).toBe(1);
  });

  it('reports stable conflict codes without identifiers', async () => {
    const database = prisma({
      findUnique: vi
        .fn()
        .mockResolvedValueOnce({ userId: 'another-user' })
        .mockResolvedValueOnce(null),
    });
    const report = await backfillExternalPrincipals({
      prisma: database as never,
      central: {
        lookupEmployee: vi.fn(async () => ({
          person_id: 'person-1',
          email: 'person@example.test',
        })),
      },
      issuer: 'mws-hub',
      mode: 'apply',
    });
    expect(report.conflicts).toEqual({ SUBJECT_ALREADY_LINKED: 1 });
    expect(JSON.stringify(report)).not.toContain('person@example.test');
    expect(JSON.stringify(report)).not.toContain('person-1');
  });

  it('does not map duplicate local normalized emails', async () => {
    const database = prisma();
    database.user.findMany.mockResolvedValue([
      { id: 'user-1', email: 'person@example.test' },
      { id: 'user-2', email: ' PERSON@example.test ' },
    ]);
    const central = { lookupEmployee: vi.fn() };
    const report = await backfillExternalPrincipals({
      prisma: database as never,
      central: central as never,
      issuer: 'mws-hub',
      mode: 'apply',
    });
    expect(report.counts).toMatchObject({ scanned: 2, conflicts: 2 });
    expect(report.conflicts).toEqual({ LOCAL_EMAIL_NOT_UNIQUE: 2 });
    expect(central.lookupEmployee).not.toHaveBeenCalled();
  });
});
