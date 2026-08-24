import type { PrismaClient } from '@prisma/client';
import { hashToken, randomToken } from './authCrypto.js';

const lastSeenUpdateIntervalMs = 5 * 60 * 1000;

export type ActiveSession = Awaited<ReturnType<SessionService['lookup']>>;

export class SessionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly secret: string,
    private readonly ttlHours: number,
  ) {}

  async create(userId: string, now = new Date()) {
    const token = randomToken();
    const expiresAt = new Date(now.getTime() + this.ttlHours * 60 * 60 * 1000);
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hashToken(token, this.secret),
        expiresAt,
        lastSeenAt: now,
      },
    });
    return { token, expiresAt };
  }

  async lookup(token: string | undefined, now = new Date()) {
    if (!token) return undefined;
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token, this.secret) },
      include: {
        user: {
          include: {
            memberships: {
              where: { status: 'ACTIVE', organization: { status: 'ACTIVE' } },
              include: {
                organization: true,
                unitScopes: true,
                gradeScopes: true,
                subjectScopes: true,
                staffAssignments: true,
              },
            },
          },
        },
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status !== 'ACTIVE'
    ) {
      return undefined;
    }

    if (
      !session.lastSeenAt ||
      now.getTime() - session.lastSeenAt.getTime() >= lastSeenUpdateIntervalMs
    ) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { lastSeenAt: now },
      });
    }

    return session;
  }

  async revoke(token: string | undefined, now = new Date()) {
    if (!token) return;
    await this.prisma.session.updateMany({
      where: {
        tokenHash: hashToken(token, this.secret),
        revokedAt: null,
      },
      data: { revokedAt: now },
    });
  }

  async revokeAllForUser(userId: string, now = new Date()) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async cleanup(now = new Date()) {
    return this.prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lte: now } },
          { revokedAt: { lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        ],
      },
    });
  }
}
