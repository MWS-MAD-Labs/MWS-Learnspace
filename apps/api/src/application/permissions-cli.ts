import { pathToFileURL } from 'node:url';
import {
  CentralApiError,
  CentralDataClient,
  comparePermissions,
  permissionCheckFailed,
  type PermissionCheck,
  type PermissionSyncResult,
  type RegisteredPermission,
} from 'mws-central-auth/data-client';
import { loadRootEnvironment, resolveApplicationId } from '../lib/config.js';
import { PERMISSION_MANIFEST } from '../utils/authorization.js';

const usage = `Usage:
  npm run permissions:check -- [--allow-removals] [--soft] [--retries N] [--wait SECONDS]
  npm run permissions:sync -- [--check] [--confirm-removals] [--allow-removals] [--soft] [--retries N] [--wait SECONDS]`;

type Mode = 'check' | 'sync';

export type PermissionCliArguments = {
  mode: Mode;
  confirmRemovals: boolean;
  allowRemovals: boolean;
  soft: boolean;
  retries: number;
  waitMs: number;
};

export interface PermissionClient {
  publishPermissions(
    applicationId: string,
    permissions: typeof PERMISSION_MANIFEST,
    options: { confirmRemovals?: boolean },
  ): Promise<PermissionSyncResult>;
  listRegisteredPermissions(
    applicationId: string,
  ): Promise<RegisteredPermission[]>;
  permissionUsage(applicationId: string): Promise<string[]>;
}

type PermissionCliEnvironment = Partial<
  Pick<
    NodeJS.ProcessEnv,
    | 'CENTRAL_API_BASE_URL'
    | 'CENTRAL_API_TOKEN'
    | 'HUB_SSO_APP_ID'
    | 'CENTRAL_APPLICATION_ID'
  >
>;

type PermissionCliOutput = Pick<Console, 'log' | 'warn' | 'error'>;

function readNonNegativeNumber(
  argv: string[],
  index: number,
  flag: string,
): number {
  const value = argv[index + 1];
  if (value === undefined || !/^\d+$/.test(value)) {
    throw new Error(`${flag} requires a non-negative integer.\n${usage}`);
  }
  return Number(value);
}

export function parsePermissionArguments(
  defaultMode: Mode,
  argv: string[],
): PermissionCliArguments {
  let mode = defaultMode;
  let confirmRemovals = false;
  let allowRemovals = false;
  let soft = false;
  let retries = 0;
  let waitMs = 20_000;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--check') mode = 'check';
    else if (argument === '--confirm-removals') confirmRemovals = true;
    else if (argument === '--allow-removals') allowRemovals = true;
    else if (argument === '--soft') soft = true;
    else if (argument === '--retries') {
      retries = readNonNegativeNumber(argv, index, argument);
      index += 1;
    } else if (argument === '--wait') {
      waitMs = readNonNegativeNumber(argv, index, argument) * 1_000;
      index += 1;
    } else if (argument === '--help') throw new Error(usage);
    else throw new Error(`Unknown argument "${argument}".\n${usage}`);
  }

  if (mode === 'check' && confirmRemovals) {
    throw new Error(`--confirm-removals is only valid for sync.\n${usage}`);
  }
  if (mode === 'sync' && allowRemovals) {
    throw new Error(`--allow-removals is only valid for checks.\n${usage}`);
  }
  return {
    mode,
    confirmRemovals,
    allowRemovals,
    soft,
    retries,
    waitMs,
  };
}

export function normalizeCentralApiBaseUrl(value: string): string {
  const url = new URL(value);
  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !['/', '/api/internal', '/api/internal/'].includes(url.pathname)
  ) {
    throw new Error('Invalid Central API base URL.');
  }
  url.pathname = '/';
  return url.toString().replace(/\/$/, '');
}

function shouldRetry(error: unknown): boolean {
  return (
    error instanceof CentralApiError &&
    (error.status === 0 || error.status === 429 || error.status >= 500)
  );
}

function safeErrorMessage(error: unknown, token: string): string {
  const message =
    error instanceof CentralApiError
      ? error.status === 0
        ? `Central is unreachable: ${error.message}`
        : `Central said ${error.status}: ${error.message}`
      : error instanceof Error
        ? error.message
        : 'Unknown error';
  return message.split(token).join('[redacted]');
}

async function withRetries<T>(
  operation: () => Promise<T>,
  options: {
    retries: number;
    waitMs: number;
    token: string;
    output: PermissionCliOutput;
    sleep: (milliseconds: number) => Promise<void>;
  },
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= options.retries || !shouldRetry(error)) throw error;
      options.output.warn(
        `Central permission request attempt ${attempt + 1} failed (${safeErrorMessage(error, options.token)}); retrying in ${options.waitMs / 1_000}s.`,
      );
      await options.sleep(options.waitMs);
    }
  }
}

function printCheck(check: PermissionCheck, output: PermissionCliOutput): void {
  const lines: Array<[string, string[]]> = [
    ['Not registered in Central yet (sync adds them)', check.notRegistered],
    ['Registered but absent from code (sync drops them)', check.wouldDrop],
    ['Carried by active roles but unknown to code', check.unknownToCode],
    ['Registered with different requirements', check.requiresDiffer],
  ];
  for (const [label, keys] of lines) {
    if (keys.length > 0) output.warn(`${label}: ${keys.join(', ')}`);
  }
}

export async function runPermissionCli(
  defaultMode: Mode,
  argv: string[],
  options: {
    environment?: PermissionCliEnvironment;
    output?: PermissionCliOutput;
    client?: PermissionClient;
    sleep?: (milliseconds: number) => Promise<void>;
  } = {},
): Promise<number> {
  const environment = options.environment ?? process.env;
  const output = options.output ?? console;
  let args: PermissionCliArguments;
  try {
    args = parsePermissionArguments(defaultMode, argv);
  } catch (error) {
    output.error(error instanceof Error ? error.message : usage);
    return 2;
  }

  const baseUrl = environment.CENTRAL_API_BASE_URL?.trim();
  const token = environment.CENTRAL_API_TOKEN?.trim();
  let applicationId: string;
  try {
    applicationId = resolveApplicationId(environment);
  } catch (error) {
    output.error(
      error instanceof Error ? error.message : 'Invalid application ID.',
    );
    return 2;
  }
  if ((!baseUrl || !token) && args.soft) {
    output.warn(
      'Central permissions not checked or sent because Central is not configured; continuing due to --soft.',
    );
    return 0;
  }
  if (!baseUrl || !token) {
    output.error('CENTRAL_API_BASE_URL and CENTRAL_API_TOKEN are required.');
    return 2;
  }

  try {
    const client =
      options.client ??
      new CentralDataClient({
        baseUrl: normalizeCentralApiBaseUrl(baseUrl),
        token,
        timeoutMs: 10_000,
      });
    const retry = <T>(operation: () => Promise<T>) =>
      withRetries(operation, {
        retries: args.retries,
        waitMs: args.waitMs,
        token,
        output,
        sleep:
          options.sleep ??
          ((milliseconds) =>
            new Promise((resolve) => setTimeout(resolve, milliseconds))),
      });

    if (args.mode === 'check') {
      const [registered, usage] = await retry(() =>
        Promise.all([
          client.listRegisteredPermissions(applicationId),
          client.permissionUsage(applicationId),
        ]),
      );
      const check = comparePermissions(
        [...PERMISSION_MANIFEST],
        registered,
        usage,
      );
      printCheck(check, output);
      if (permissionCheckFailed(check, { allowRemovals: args.allowRemovals })) {
        throw new Error('Learnspace permissions do not match Central.');
      }
      output.log('Learnspace permissions match Central.');
      return 0;
    }

    const result = await retry(() =>
      client.publishPermissions(applicationId, PERMISSION_MANIFEST, {
        confirmRemovals: args.confirmRemovals,
      }),
    );
    output.log(
      `Learnspace permissions synchronized: ${result.total} total, ${result.added} added.`,
    );
    if (result.deprecated.length > 0) {
      output.warn(`Dropped from the manifest: ${result.deprecated.join(', ')}`);
    }
    if (result.affected_roles.length > 0) {
      output.warn('Active roles still carry dropped permissions:');
      for (const role of result.affected_roles) {
        output.warn(`  ${role.role}: ${role.permissions.join(', ')}`);
      }
    }
    return 0;
  } catch (error) {
    const message = safeErrorMessage(error, token);
    if (args.soft) {
      output.warn(
        `Central permissions not checked or sent (${message}); continuing due to --soft.`,
      );
      return 0;
    }
    output.error(message);
    return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [mode, ...argv] = process.argv.slice(2);
  if (mode !== 'check' && mode !== 'sync') {
    console.error(usage);
    process.exitCode = 2;
  } else {
    loadRootEnvironment();
    runPermissionCli(mode, argv).then((exitCode) => {
      process.exitCode = exitCode;
    });
  }
}
