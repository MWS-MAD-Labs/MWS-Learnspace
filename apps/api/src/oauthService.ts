import type { Prisma, PrismaClient } from '@prisma/client';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { AppConfig } from './config.js';
import {
  hashToken,
  openJson,
  randomToken,
  safeEqual,
  sealJson,
  sha256Base64Url,
} from './authCrypto.js';

const googleIssuer = 'https://accounts.google.com';
const googleAuthorizationEndpoint =
  'https://accounts.google.com/o/oauth2/v2/auth';
const googleTokenEndpoint = 'https://oauth2.googleapis.com/token';
const oauthTransactionLifetimeMs = 10 * 60 * 1000;
const googleJwks = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs'),
);

export type OAuthContext = {
  state: string;
  nonce: string;
  verifier: string;
};

type GoogleClaims = JWTPayload & {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  nonce: string;
};

type VerifyIdToken = (
  idToken: string,
  nonce: string,
  config: AppConfig,
) => Promise<GoogleClaims>;

async function verifyGoogleIdToken(
  idToken: string,
  nonce: string,
  config: AppConfig,
): Promise<GoogleClaims> {
  const result = await jwtVerify(idToken, googleJwks, {
    issuer: [googleIssuer, 'accounts.google.com'],
    audience: config.googleClientId,
    clockTolerance: 30,
    maxTokenAge: '10m',
  });
  const payload = result.payload as Partial<GoogleClaims>;
  if (
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    payload.email_verified !== true ||
    typeof payload.nonce !== 'string' ||
    !safeEqual(payload.nonce, nonce)
  ) {
    throw new OAuthDeniedError('INVALID_IDENTITY');
  }
  return payload as GoogleClaims;
}

export class OAuthDeniedError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'OAuthDeniedError';
  }
}

export class OAuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig,
    private readonly verifyIdToken: VerifyIdToken = verifyGoogleIdToken,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {}

  async begin(redirectPath = '/', now = new Date()) {
    const state = randomToken();
    const nonce = randomToken();
    const verifier = randomToken(48);
    const challenge = sha256Base64Url(verifier);
    const safeRedirectPath = normalizeRedirectPath(
      redirectPath,
      this.config.appUrl,
    );

    await this.prisma.oAuthLoginTransaction.create({
      data: {
        stateHash: hashToken(state, this.config.sessionSecret),
        nonceHash: hashToken(nonce, this.config.sessionSecret),
        verifierHash: hashToken(verifier, this.config.sessionSecret),
        redirectPath: safeRedirectPath,
        expiresAt: new Date(now.getTime() + oauthTransactionLifetimeMs),
      },
    });

    const parameters = new URLSearchParams({
      client_id: this.config.googleClientId,
      redirect_uri: this.config.googleRedirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });

    return {
      authorizationUrl: `${googleAuthorizationEndpoint}?${parameters}`,
      sealedContext: sealJson(
        { state, nonce, verifier },
        this.config.sessionSecret,
      ),
    };
  }

  async callback(
    code: string,
    state: string,
    sealedContext: string | undefined,
    now = new Date(),
  ) {
    const context = sealedContext
      ? openJson<OAuthContext>(sealedContext, this.config.sessionSecret)
      : undefined;
    if (!context || !safeEqual(context.state, state)) {
      throw new OAuthDeniedError('STATE_MISMATCH');
    }

    const stateHash = hashToken(state, this.config.sessionSecret);
    const transaction = await this.prisma.oAuthLoginTransaction.findUnique({
      where: { stateHash },
    });
    if (
      !transaction ||
      transaction.consumedAt ||
      transaction.expiresAt <= now ||
      !safeEqual(
        transaction.nonceHash,
        hashToken(context.nonce, this.config.sessionSecret),
      ) ||
      !safeEqual(
        transaction.verifierHash,
        hashToken(context.verifier, this.config.sessionSecret),
      )
    ) {
      throw new OAuthDeniedError('INVALID_OR_REPLAYED_CALLBACK');
    }

    const consumed = await this.prisma.oAuthLoginTransaction.updateMany({
      where: { id: transaction.id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) {
      throw new OAuthDeniedError('INVALID_OR_REPLAYED_CALLBACK');
    }

    const tokenResponse = await this.fetchImplementation(googleTokenEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.googleClientId,
        client_secret: this.config.googleClientSecret,
        code,
        code_verifier: context.verifier,
        grant_type: 'authorization_code',
        redirect_uri: this.config.googleRedirectUri,
      }),
    });
    if (!tokenResponse.ok) throw new OAuthDeniedError('TOKEN_EXCHANGE_FAILED');
    const tokenBody = (await tokenResponse.json()) as { id_token?: unknown };
    if (typeof tokenBody.id_token !== 'string') {
      throw new OAuthDeniedError('TOKEN_EXCHANGE_FAILED');
    }

    const claims = await this.verifyIdToken(
      tokenBody.id_token,
      context.nonce,
      this.config,
    );
    const user = await this.admit(claims, now);
    return { user, redirectPath: transaction.redirectPath };
  }

  async cleanup(now = new Date()) {
    return this.prisma.oAuthLoginTransaction.deleteMany({
      where: {
        OR: [
          { expiresAt: { lte: now } },
          { consumedAt: { lte: new Date(now.getTime() - 60 * 60 * 1000) } },
        ],
      },
    });
  }

  private async admit(claims: GoogleClaims, now: Date) {
    const normalizedEmail = claims.email.trim().toLowerCase();
    const existingAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: claims.sub,
        },
      },
      include: { user: true },
    });
    if (existingAccount) {
      if (existingAccount.user.status !== 'ACTIVE') {
        throw new OAuthDeniedError('ACCOUNT_DISABLED');
      }
      return existingAccount.user;
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      if (existingUser.status !== 'ACTIVE') {
        throw new OAuthDeniedError('ACCOUNT_DISABLED');
      }
      await this.linkOAuthAccount(existingUser.id, claims.sub);
      return existingUser;
    }

    const invitation = await this.prisma.userInvitation.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        acceptedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (invitation && this.config.authAdmissionMode !== 'DENY_UNKNOWN') {
      try {
        return await this.prisma.$transaction(
          async (transactionClient: Prisma.TransactionClient) => {
            const user = await transactionClient.user.create({
              data: {
                email: normalizedEmail,
                displayName: claims.name?.trim() || normalizedEmail,
                memberships: {
                  create: {
                    organizationId: invitation.organizationId,
                    role: invitation.role,
                    roleTitle: invitation.roleTitle,
                  },
                },
                oauthAccounts: {
                  create: { provider: 'google', providerAccountId: claims.sub },
                },
              },
            });
            await transactionClient.userInvitation.update({
              where: { id: invitation.id },
              data: { acceptedAt: now },
            });
            return user;
          },
        );
      } catch (error) {
        return this.recoverConcurrentlyCreatedUser(
          error,
          normalizedEmail,
          claims.sub,
        );
      }
    }

    if (this.config.authAdmissionMode === 'ALLOWED_DOMAIN') {
      const domain = normalizedEmail.split('@')[1] ?? '';
      if (this.config.googleAllowedDomains.includes(domain)) {
        try {
          return await this.prisma.user.create({
            data: {
              email: normalizedEmail,
              displayName: claims.name?.trim() || normalizedEmail,
              oauthAccounts: {
                create: { provider: 'google', providerAccountId: claims.sub },
              },
            },
          });
        } catch (error) {
          return this.recoverConcurrentlyCreatedUser(
            error,
            normalizedEmail,
            claims.sub,
          );
        }
      }
    }

    throw new OAuthDeniedError('ADMISSION_DENIED');
  }

  private async recoverConcurrentlyCreatedUser(
    error: unknown,
    normalizedEmail: string,
    providerAccountId: string,
  ) {
    if (!isUniqueConstraintError(error)) throw error;
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user) throw error;
    if (user.status !== 'ACTIVE') {
      throw new OAuthDeniedError('ACCOUNT_DISABLED');
    }
    await this.linkOAuthAccount(user.id, providerAccountId);
    return user;
  }

  private async linkOAuthAccount(userId: string, providerAccountId: string) {
    try {
      await this.prisma.oAuthAccount.create({
        data: { userId, provider: 'google', providerAccountId },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const account = await this.prisma.oAuthAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: 'google',
            providerAccountId,
          },
        },
      });
      if (!account || account.userId !== userId) {
        throw new OAuthDeniedError('IDENTITY_ALREADY_LINKED');
      }
    }
  }
}

function normalizeRedirectPath(redirectPath: string, appUrl: string): string {
  try {
    const applicationUrl = new URL(appUrl);
    const resolvedRedirect = new URL(redirectPath, applicationUrl);
    return resolvedRedirect.origin === applicationUrl.origin
      ? `${resolvedRedirect.pathname}${resolvedRedirect.search}${resolvedRedirect.hash}`
      : '/';
  } catch {
    return '/';
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
