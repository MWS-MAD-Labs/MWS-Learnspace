import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../src/config.js';
import { openJson } from '../src/authCrypto.js';
import {
  OAuthDeniedError,
  OAuthService,
  type OAuthContext,
} from '../src/oauthService.js';

const config: AppConfig = {
  nodeEnv: 'test',
  port: 4000,
  databaseUrl: 'postgresql://localhost/learnspace',
  appUrl: 'http://localhost:3000',
  sessionSecret: 'a-secure-session-secret-with-32-characters',
  googleClientId: 'google-client',
  googleClientSecret: 'google-secret',
  googleAllowedDomains: ['example.org'],
  googleRedirectUri: 'http://localhost:4000/api/v1/auth/callback',
  authAdmissionMode: 'DENY_UNKNOWN',

  sessionTtlHours: 24,
  logLevel: 'info',
};

type OAuthAccountLookup =
  | {
      user: {
        id: string;
        email: string;
        displayName: string;
        avatarUrl: null;
        status: string;
      };
    }
  | { id: string; userId: string }
  | null;

function createPrisma() {
  const stored: { transaction?: Record<string, unknown> } = {};
  const prisma = {
    oAuthLoginTransaction: {
      create: vi.fn(async ({ data }) => {
        stored.transaction = {
          id: 'transaction-id',
          consumedAt: null,
          ...data,
        };
        return stored.transaction;
      }),
      findUnique: vi.fn(async () => stored.transaction),
      updateMany: vi.fn(async () => ({ count: 1 })),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    oAuthAccount: {
      findUnique: vi.fn(async (): Promise<OAuthAccountLookup> => ({
        user: {
          id: '11111111-1111-4111-8111-111111111111',
          email: 'existing@example.org',
          displayName: 'Existing User',
          avatarUrl: null,
          status: 'ACTIVE',
        },
      })),
      create: vi.fn(),
    },
    user: { findUnique: vi.fn(), create: vi.fn() },
    userInvitation: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma, stored };
}

const verifyIdToken = vi.fn(async (_token, nonce: string) => ({
  iss: 'https://accounts.google.com',
  aud: 'google-client',
  sub: 'google-subject',
  email: 'existing@example.org',
  email_verified: true,
  name: 'Existing User',
  nonce,
}));

const fetchTokens = vi.fn(
  async () =>
    new Response(JSON.stringify({ id_token: 'signed-token' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
);

describe('OAuthService', () => {
  it('creates state, nonce, and PKCE while storing only hashes', async () => {
    const { prisma, stored } = createPrisma();
    const service = new OAuthService(
      prisma as never,
      config,
      verifyIdToken,
      fetchTokens,
    );
    const login = await service.begin('/dashboard');
    const context = openJson<OAuthContext>(
      login.sealedContext,
      config.sessionSecret,
    );

    expect(context).toBeDefined();
    expect(login.authorizationUrl).toContain('code_challenge_method=S256');
    expect(login.authorizationUrl).toContain(`state=${context?.state}`);
    expect(JSON.stringify(stored.transaction)).not.toContain(context?.state);
    expect(JSON.stringify(stored.transaction)).not.toContain(context?.nonce);
    expect(JSON.stringify(stored.transaction)).not.toContain(context?.verifier);
  });

  it('rejects scheme-relative redirects containing backslashes', async () => {
    const { prisma, stored } = createPrisma();
    const service = new OAuthService(
      prisma as never,
      config,
      verifyIdToken,
      fetchTokens,
    );
    await service.begin('/\\\\evil.com');

    expect(stored.transaction?.redirectPath).toBe('/');
  });

  it('rejects a mismatched state before token exchange', async () => {
    const { prisma } = createPrisma();
    const service = new OAuthService(
      prisma as never,
      config,
      verifyIdToken,
      fetchTokens,
    );
    const login = await service.begin('/');

    await expect(
      service.callback('code', 'forged-state', login.sealedContext),
    ).rejects.toMatchObject({
      code: 'STATE_MISMATCH',
    } satisfies Partial<OAuthDeniedError>);
  });

  it('does not persist the Google picture claim during admission', async () => {
    const { prisma } = createPrisma();
    prisma.oAuthAccount.findUnique.mockResolvedValueOnce(null);
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.userInvitation.findFirst.mockResolvedValueOnce(null);
    prisma.user.create.mockImplementationOnce(async ({ data }) => ({
      id: '22222222-2222-4222-8222-222222222222',
      avatarUrl: null,
      status: 'ACTIVE',
      ...data,
    }));
    const verifyWithPicture = vi.fn(async (_token, nonce: string) => ({
      iss: 'https://accounts.google.com',
      aud: 'google-client',
      sub: 'google-subject',
      email: 'new@example.org',
      email_verified: true,
      name: 'New User',
      picture: 'https://lh3.googleusercontent.com/avatar',
      nonce,
    }));
    const service = new OAuthService(
      prisma as never,
      { ...config, authAdmissionMode: 'ALLOWED_DOMAIN' },
      verifyWithPicture,
      fetchTokens,
    );
    const login = await service.begin('/');
    const context = openJson<OAuthContext>(
      login.sealedContext,
      config.sessionSecret,
    )!;

    await service.callback('code', context.state, login.sealedContext);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'new@example.org',
        displayName: 'New User',
        oauthAccounts: {
          create: { provider: 'google', providerAccountId: 'google-subject' },
        },
      },
    });
  });

  it('does not persist the Google picture claim during invitation admission', async () => {
    const { prisma } = createPrisma();
    prisma.oAuthAccount.findUnique.mockResolvedValueOnce(null);
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.userInvitation.findFirst.mockResolvedValueOnce({
      id: 'invitation-id',
      organizationId: '33333333-3333-4333-8333-333333333333',
      role: 'GRADE_TEACHER',
      roleTitle: 'Grade Teacher',
    });
    const transactionClient = {
      user: {
        create: vi.fn(async ({ data }) => ({
          id: '22222222-2222-4222-8222-222222222222',
          avatarUrl: null,
          status: 'ACTIVE',
          ...data,
        })),
      },
      userInvitation: { update: vi.fn(async () => ({})) },
    };
    prisma.$transaction.mockImplementationOnce(async (operation) =>
      operation(transactionClient),
    );
    const verifyWithPicture = vi.fn(async (_token, nonce: string) => ({
      iss: 'https://accounts.google.com',
      aud: 'google-client',
      sub: 'google-subject',
      email: 'invited@example.org',
      email_verified: true,
      name: 'Invited User',
      picture: 'https://lh3.googleusercontent.com/avatar',
      nonce,
    }));
    const service = new OAuthService(
      prisma as never,
      { ...config, authAdmissionMode: 'INVITE_ONLY' },
      verifyWithPicture,
      fetchTokens,
    );
    const login = await service.begin('/');
    const context = openJson<OAuthContext>(
      login.sealedContext,
      config.sessionSecret,
    )!;

    await service.callback('code', context.state, login.sealedContext);

    expect(transactionClient.user.create).toHaveBeenCalledWith({
      data: {
        email: 'invited@example.org',
        displayName: 'Invited User',
        memberships: {
          create: {
            organizationId: '33333333-3333-4333-8333-333333333333',
            role: 'GRADE_TEACHER',
            roleTitle: 'Grade Teacher',
          },
        },
        oauthAccounts: {
          create: { provider: 'google', providerAccountId: 'google-subject' },
        },
      },
    });
  });

  it('recovers when another invite-admission request creates the user first', async () => {
    const { prisma } = createPrisma();
    const concurrentlyCreatedUser = {
      id: '22222222-2222-4222-8222-222222222222',
      email: 'existing@example.org',
      displayName: 'Existing User',
      avatarUrl: null,
      status: 'ACTIVE',
    };
    prisma.oAuthAccount.findUnique.mockResolvedValueOnce(null);
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(concurrentlyCreatedUser);
    prisma.userInvitation.findFirst.mockResolvedValueOnce({
      id: 'invitation-id',
      organizationId: '33333333-3333-4333-8333-333333333333',
      role: 'GRADE_TEACHER',
      roleTitle: 'Grade Teacher',
    });
    prisma.$transaction.mockRejectedValueOnce({ code: 'P2002' });
    prisma.oAuthAccount.create.mockResolvedValueOnce({
      id: 'oauth-account-id',
      userId: concurrentlyCreatedUser.id,
    });
    const service = new OAuthService(
      prisma as never,
      { ...config, authAdmissionMode: 'INVITE_ONLY' },
      verifyIdToken,
      fetchTokens,
    );
    const login = await service.begin('/');
    const context = openJson<OAuthContext>(
      login.sealedContext,
      config.sessionSecret,
    )!;

    await expect(
      service.callback('code', context.state, login.sealedContext),
    ).resolves.toMatchObject({ user: concurrentlyCreatedUser });
    expect(prisma.oAuthAccount.create).toHaveBeenCalledWith({
      data: {
        userId: concurrentlyCreatedUser.id,
        provider: 'google',
        providerAccountId: 'google-subject',
      },
    });
  });

  it('recovers when another domain-admission request creates the user first', async () => {
    const { prisma } = createPrisma();
    const concurrentlyCreatedUser = {
      id: '22222222-2222-4222-8222-222222222222',
      email: 'existing@example.org',
      displayName: 'Existing User',
      avatarUrl: null,
      status: 'ACTIVE',
    };
    prisma.oAuthAccount.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'oauth-account-id',
        userId: concurrentlyCreatedUser.id,
      });
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(concurrentlyCreatedUser);
    prisma.user.create.mockRejectedValueOnce({ code: 'P2002' });
    prisma.oAuthAccount.create.mockResolvedValueOnce({
      id: 'oauth-account-id',
      userId: concurrentlyCreatedUser.id,
    });
    const service = new OAuthService(
      prisma as never,
      { ...config, authAdmissionMode: 'ALLOWED_DOMAIN' },
      verifyIdToken,
      fetchTokens,
    );
    const login = await service.begin('/');
    const context = openJson<OAuthContext>(
      login.sealedContext,
      config.sessionSecret,
    )!;

    await expect(
      service.callback('code', context.state, login.sealedContext),
    ).resolves.toMatchObject({ user: concurrentlyCreatedUser });
    expect(prisma.oAuthAccount.create).toHaveBeenCalledWith({
      data: {
        userId: concurrentlyCreatedUser.id,
        provider: 'google',
        providerAccountId: 'google-subject',
      },
    });
  });

  it('consumes a callback once and rejects replay', async () => {
    const { prisma } = createPrisma();
    const service = new OAuthService(
      prisma as never,
      config,
      verifyIdToken,
      fetchTokens,
    );
    const login = await service.begin('/dashboard');
    const context = openJson<OAuthContext>(
      login.sealedContext,
      config.sessionSecret,
    )!;

    await expect(
      service.callback('code', context.state, login.sealedContext),
    ).resolves.toMatchObject({ redirectPath: '/dashboard' });

    prisma.oAuthLoginTransaction.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      service.callback('code', context.state, login.sealedContext),
    ).rejects.toMatchObject({
      code: 'INVALID_OR_REPLAYED_CALLBACK',
    } satisfies Partial<OAuthDeniedError>);
  });
});
