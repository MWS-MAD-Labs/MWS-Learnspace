import { CentralApiError } from 'mws-central-auth/data-client';
import { describe, expect, it, vi } from 'vitest';
import {
  normalizeCentralApiBaseUrl,
  parsePermissionArguments,
  runPermissionCli,
  type PermissionClient,
} from '../application/permissions-cli.js';
import { PERMISSION_MANIFEST } from '../utils/authorization.js';

function output() {
  return {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function client(overrides: Partial<PermissionClient> = {}): PermissionClient {
  return {
    publishPermissions: vi.fn(async () => ({
      application_id: 'learnspace',
      total: PERMISSION_MANIFEST.length,
      added: 0,
      deprecated: [],
      affected_roles: [],
    })),
    listRegisteredPermissions: vi.fn(async () =>
      PERMISSION_MANIFEST.map((entry) => ({
        key: entry.key,
        description: entry.description,
        requires: [...(entry.requires ?? [])],
        source: 'MANIFEST' as const,
        deprecated: false,
      })),
    ),
    permissionUsage: vi.fn(async () => []),
    ...overrides,
  };
}

const environment = {
  CENTRAL_API_BASE_URL: 'https://central.example/api/internal/',
  CENTRAL_API_TOKEN: 'prefix.secret',
  HUB_SSO_APP_ID: 'learnspace',
};

describe('permission CLI', () => {
  it('parses check, removal, retry, wait, and soft flags', () => {
    expect(
      parsePermissionArguments('sync', [
        '--check',
        '--allow-removals',
        '--soft',
        '--retries',
        '3',
        '--wait',
        '4',
      ]),
    ).toEqual({
      mode: 'check',
      confirmRemovals: false,
      allowRemovals: true,
      soft: true,
      retries: 3,
      waitMs: 4_000,
    });
  });

  it('normalizes both Central origin and internal API URLs', () => {
    expect(normalizeCentralApiBaseUrl('https://central.example/')).toBe(
      'https://central.example',
    );
    expect(
      normalizeCentralApiBaseUrl('https://central.example/api/internal/'),
    ).toBe('https://central.example');
    expect(() =>
      normalizeCentralApiBaseUrl('https://central.example/other'),
    ).toThrow(/Invalid Central API base URL/);
    expect(() =>
      normalizeCentralApiBaseUrl('https://central.example/api/internal?x=1'),
    ).toThrow(/Invalid Central API base URL/);
  });

  it('checks without publishing and reports drift', async () => {
    const fake = client({
      listRegisteredPermissions: vi.fn(async () => []),
      permissionUsage: vi.fn(async () => ['removed:permission']),
    });
    const console = output();
    expect(
      await runPermissionCli('check', [], {
        environment,
        output: console,
        client: fake,
      }),
    ).toBe(1);
    expect(fake.publishPermissions).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      'Carried by active roles but unknown to code: removed:permission',
    );
  });

  it('publishes the complete manifest with explicit removal confirmation', async () => {
    const fake = client();
    expect(
      await runPermissionCli('sync', ['--confirm-removals'], {
        environment,
        output: output(),
        client: fake,
      }),
    ).toBe(0);
    expect(fake.publishPermissions).toHaveBeenCalledWith(
      'learnspace',
      PERMISSION_MANIFEST,
      { confirmRemovals: true },
    );
  });

  it('supports the legacy application ID alias and rejects conflicts', async () => {
    const legacyClient = client();
    expect(
      await runPermissionCli('sync', [], {
        environment: {
          ...environment,
          HUB_SSO_APP_ID: undefined,
          CENTRAL_APPLICATION_ID: 'legacy-app',
        },
        output: output(),
        client: legacyClient,
      }),
    ).toBe(0);
    expect(legacyClient.publishPermissions).toHaveBeenCalledWith(
      'legacy-app',
      PERMISSION_MANIFEST,
      { confirmRemovals: false },
    );

    const console = output();
    expect(
      await runPermissionCli('sync', ['--soft'], {
        environment: {
          ...environment,
          CENTRAL_APPLICATION_ID: 'different-app',
        },
        output: console,
        client: client(),
      }),
    ).toBe(2);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('HUB_SSO_APP_ID and CENTRAL_APPLICATION_ID'),
    );
  });

  it('retries transient statuses but not authentication failures', async () => {
    const publish = vi
      .fn<PermissionClient['publishPermissions']>()
      .mockRejectedValueOnce(new CentralApiError(503, 'unavailable'))
      .mockResolvedValueOnce({
        application_id: 'learnspace',
        total: PERMISSION_MANIFEST.length,
        added: 0,
        deprecated: [],
        affected_roles: [],
      });
    const sleep = vi.fn(async () => undefined);
    expect(
      await runPermissionCli('sync', ['--retries', '2', '--wait', '0'], {
        environment,
        output: output(),
        client: client({ publishPermissions: publish }),
        sleep,
      }),
    ).toBe(0);
    expect(publish).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(0);

    const unauthorized = vi
      .fn<PermissionClient['publishPermissions']>()
      .mockRejectedValue(new CentralApiError(401, 'unauthorized'));
    expect(
      await runPermissionCli('sync', ['--retries', '2'], {
        environment,
        output: output(),
        client: client({ publishPermissions: unauthorized }),
        sleep,
      }),
    ).toBe(1);
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });

  it('soft-fails without exposing the Central token', async () => {
    const console = output();
    expect(
      await runPermissionCli('sync', ['--soft'], {
        environment,
        output: console,
        client: client({
          publishPermissions: vi.fn(async () => {
            throw new CentralApiError(
              503,
              `request with ${environment.CENTRAL_API_TOKEN} failed`,
            );
          }),
        }),
      }),
    ).toBe(0);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[redacted]'),
    );
    expect(JSON.stringify(console.warn.mock.calls)).not.toContain(
      environment.CENTRAL_API_TOKEN,
    );
  });
});
