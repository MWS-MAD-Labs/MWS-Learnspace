import { describe, expect, it, vi } from 'vitest';
import { hashToken } from '../src/authCrypto.js';
import { SessionService } from '../src/sessionService.js';

const secret = 'a-secure-session-secret-with-32-characters';

function createPrisma(overrides: Record<string, unknown> = {}) {
  return {
    session: {
      create: vi.fn(async ({ data }) => ({ id: 'session-id', ...data })),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(async () => ({ count: 1 })),
      deleteMany: vi.fn(async () => ({ count: 1 })),
      ...overrides,
    },
  };
}

describe('SessionService', () => {
  it('creates opaque tokens and stores only a keyed hash', async () => {
    const prisma = createPrisma();
    const service = new SessionService(prisma as never, secret, 24);
    const created = await service.create(
      '11111111-1111-4111-8111-111111111111',
      new Date('2026-08-20T00:00:00.000Z'),
    );

    const data = prisma.session.create.mock.calls[0][0].data;
    expect(created.token).toHaveLength(43);
    expect(data.tokenHash).toBe(hashToken(created.token, secret));
    expect(JSON.stringify(data)).not.toContain(created.token);
    expect(created.expiresAt.toISOString()).toBe('2026-08-21T00:00:00.000Z');
  });

  it('rejects expired, revoked, and disabled sessions', async () => {
    const now = new Date('2026-08-20T00:00:00.000Z');
    for (const session of [
      { expiresAt: now, revokedAt: null, user: { status: 'ACTIVE' } },
      {
        expiresAt: new Date('2026-08-21T00:00:00.000Z'),
        revokedAt: now,
        user: { status: 'ACTIVE' },
      },
      {
        expiresAt: new Date('2026-08-21T00:00:00.000Z'),
        revokedAt: null,
        user: { status: 'DISABLED' },
      },
    ]) {
      const prisma = createPrisma({
        findUnique: vi.fn(async () => ({
          id: 'session-id',
          lastSeenAt: now,
          ...session,
        })),
      });
      const service = new SessionService(prisma as never, secret, 24);
      await expect(service.lookup('raw-token', now)).resolves.toBeUndefined();
    }
  });

  it('revokes a session by its token hash', async () => {
    const prisma = createPrisma();
    const service = new SessionService(prisma as never, secret, 24);
    await service.revoke('raw-token', new Date('2026-08-20T00:00:00.000Z'));

    const where = prisma.session.updateMany.mock.calls[0][0].where;
    expect(where.tokenHash).toBe(hashToken('raw-token', secret));
    expect(JSON.stringify(where)).not.toContain('raw-token');
  });
});
