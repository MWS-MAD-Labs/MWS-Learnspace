import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../lib/config.js';
import { createSharedSessionAuthentication } from '../service/shared-session-service.js';
import { createSharedSessionShadow } from '../service/shared-session-shadow-service.js';

const localOrganizationId = '10000000-0000-4000-8000-000000000001';
const centralOrganizationId = 'central-organization';

function config(mode: 'off' | 'shadow' | 'shared'): AppConfig {
  return {
    nodeEnv: 'test',
    port: 4000,
    databaseUrl: 'postgresql://localhost/learnspace',
    appUrl: 'http://localhost:3000',
    sessionSecret: 'a-secure-session-secret-with-32-characters',
    googleClientId: 'client',
    googleClientSecret: 'secret',
    googleAllowedDomains: [],
    googleRedirectUri: 'http://localhost:3000/api/v1/auth/callback',
    authAdmissionMode: 'DENY_UNKNOWN',
    sharedSessionMode: mode,
    hubBaseUrl: 'https://hub.example.test',
    hubAccessCookieName: 'hub_access',
    centralApiBaseUrl: 'https://central.example.test',
    centralApiToken: 'secret-token',
    centralOrganizationId,
    applicationId: 'learnspace-test',
    sessionTtlHours: 24,
    logLevel: 'info',
  };
}

function logger() {
  return {
    fatal: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  };
}

function prismaWithExistingMapping() {
  return {
    organization: {
      findUnique: vi.fn(async () => ({
        id: localOrganizationId,
        centralOrganizationId,
        status: 'ACTIVE',
      })),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

describe('shared session startup', () => {
  it.each(['shadow', 'shared'] as const)(
    'resolves the local organization before constructing %s mode',
    async (mode) => {
      const prisma = prismaWithExistingMapping();
      const startupLogger = logger();
      const service =
        mode === 'shadow'
          ? await createSharedSessionShadow(
              config(mode),
              prisma as never,
              startupLogger,
            )
          : await createSharedSessionAuthentication(
              config(mode),
              prisma as never,
              startupLogger,
            );

      expect(prisma.organization.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { centralOrganizationId },
        }),
      );
      const resolvedLocalOrganizationId =
        mode === 'shadow'
          ? (service as never as { contexts: { localOrganizationId: string } })
              .contexts.localOrganizationId
          : (service as never as { localOrganizationId: string })
              .localOrganizationId;
      expect(resolvedLocalOrganizationId).toBe(localOrganizationId);
      expect(startupLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          authMode: mode,
          applicationId: 'learnspace-test',
          hubCookieName: 'hub_access',
          hubCookieNameSource: 'option',
        }),
        expect.any(String),
      );
    },
  );

  it.each(['shadow', 'shared'] as const)(
    'fails %s startup with a finite mapping code and no identifiers',
    async (mode) => {
      const startupLogger = logger();
      const prisma = {
        organization: {
          findUnique: vi.fn(async () => null),
          findMany: vi.fn(async () => []),
          updateMany: vi.fn(),
        },
      };

      const startup =
        mode === 'shadow'
          ? createSharedSessionShadow(
              config(mode),
              prisma as never,
              startupLogger,
            )
          : createSharedSessionAuthentication(
              config(mode),
              prisma as never,
              startupLogger,
            );
      await expect(startup).rejects.toThrow(
        'NO_ACTIVE_UNMAPPED_LOCAL_ORGANIZATION',
      );

      expect(startupLogger.error).toHaveBeenCalledWith(
        {
          event: 'shared_session_mapping_failed',
          authMode: mode,
          applicationId: 'learnspace-test',
          mappingCode: 'NO_ACTIVE_UNMAPPED_LOCAL_ORGANIZATION',
        },
        'shared session organization mapping failed',
      );
      const logged = JSON.stringify(startupLogger.error.mock.calls);
      expect(logged).not.toContain(centralOrganizationId);
      expect(logged).not.toContain(localOrganizationId);
      expect(logged).not.toContain('secret-token');
    },
  );

  it('does not resolve organization mapping while auth mode is off', async () => {
    const prisma = prismaWithExistingMapping();
    const startupLogger = logger();

    await expect(
      createSharedSessionShadow(config('off'), prisma as never, startupLogger),
    ).resolves.toBeUndefined();
    await expect(
      createSharedSessionAuthentication(
        config('off'),
        prisma as never,
        startupLogger,
      ),
    ).resolves.toBeUndefined();
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    expect(startupLogger.info).not.toHaveBeenCalled();
  });
});
