import { describe, expect, it, vi } from 'vitest';
import {
  parseSharedSessionReadinessArguments,
  runSharedSessionReadinessCli,
} from '../application/shared-session-readiness-cli.js';

const environment = {
  DATABASE_URL: 'postgresql://local/private',
  HUB_SESSION_ISSUER: 'mws-hub',
  SHARED_SESSION_LOCAL_ORGANIZATION_ID: '10000000-0000-4000-8000-000000000001',
  CENTRAL_API_BASE_URL: 'https://central.example/api/internal',
  CENTRAL_API_TOKEN: 'private-token',
  CENTRAL_ORGANIZATION_ID: 'central-org',
  HUB_SSO_APP_ID: 'learnspace',
};

function output() {
  return { log: vi.fn(), error: vi.fn() };
}

function prisma() {
  return {
    user: {
      findMany: vi.fn(async () => [
        {
          id: 'private-user',
          memberships: [
            {
              role: 'DIRECTOR',
              status: 'ACTIVE',
              organization: { status: 'ACTIVE' },
            },
          ],
        },
      ]),
    },
    externalPrincipal: {
      findMany: vi.fn(async () => [
        {
          userId: 'private-user',
          subject: 'private-subject',
          verified: true,
        },
      ]),
    },
  };
}

describe('shared session readiness CLI', () => {
  it('parses strict and explicit local-only flags', () => {
    expect(
      parseSharedSessionReadinessArguments(['--strict', '--local-only']),
    ).toEqual({ strict: true, localOnly: true });
  });

  it('defaults to read-only local diagnostics when Central is absent', async () => {
    const console = output();
    const database = prisma();
    const exitCode = await runSharedSessionReadinessCli([], {
      environment: {
        ...environment,
        CENTRAL_API_BASE_URL: undefined,
        CENTRAL_API_TOKEN: undefined,
        CENTRAL_ORGANIZATION_ID: undefined,
      },
      output: console,
      prisma: database as never,
    });
    expect(exitCode).toBe(0);
    const printed = console.log.mock.calls[0]?.[0] as string;
    expect(JSON.parse(printed)).toMatchObject({
      mode: 'local-only',
      strict: false,
      counts: { ready: 1, entitlementUnavailable: 1 },
      reasons: { CENTRAL_NOT_CONFIGURED: 1 },
    });
    expect(printed).not.toContain('private-user');
    expect(printed).not.toContain('private-subject');
    expect(printed).not.toContain('private-token');
  });

  it('returns one in strict mode when any blocker remains', async () => {
    const console = output();
    expect(
      await runSharedSessionReadinessCli(['--strict'], {
        environment,
        output: console,
        prisma: prisma() as never,
        central: {
          lookupApplicationEntitlement: vi.fn(async () => null),
        },
      }),
    ).toBe(1);
    expect(JSON.parse(console.log.mock.calls[0]?.[0] as string)).toMatchObject({
      go: false,
      reasons: { ENTITLEMENT_MISSING_OR_INACTIVE: 1 },
    });
  });

  it('accepts the legacy application ID alias and rejects conflicts', async () => {
    expect(
      await runSharedSessionReadinessCli([], {
        environment: {
          ...environment,
          HUB_SSO_APP_ID: undefined,
          CENTRAL_APPLICATION_ID: 'learnspace',
        },
        output: output(),
        prisma: prisma() as never,
        central: {
          lookupApplicationEntitlement: vi.fn(async () => null),
        },
      }),
    ).toBe(0);

    const console = output();
    expect(
      await runSharedSessionReadinessCli([], {
        environment: {
          ...environment,
          CENTRAL_APPLICATION_ID: 'different-app',
        },
        output: console,
        prisma: prisma() as never,
      }),
    ).toBe(2);
    expect(console.error).toHaveBeenCalledWith(
      JSON.stringify({ code: 'CONFIGURATION_INVALID' }),
    );
  });

  it('prints finite error codes rather than configuration or failure details', async () => {
    const console = output();
    expect(
      await runSharedSessionReadinessCli(['--unknown'], {
        environment,
        output: console,
        prisma: prisma() as never,
      }),
    ).toBe(2);
    expect(console.error).toHaveBeenCalledWith(
      JSON.stringify({ code: 'INVALID_ARGUMENTS' }),
    );
  });
});
