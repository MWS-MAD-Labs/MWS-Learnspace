import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { CentralDataClient } from 'mws-central-auth/data-client';
import { loadRootEnvironment, resolveApplicationId } from '../lib/config.js';
import { inspectSharedSessionReadiness } from '../service/shared-session-readiness-service.js';
import {
  normalizeCentralApiBaseUrl,
  type CentralEntitlementClient,
} from '../service/shared-session-shadow-service.js';

const usage = `Usage:
  npm run shared-session:readiness -- [--strict] [--local-only]`;

type ReadinessEnvironment = Partial<
  Pick<
    NodeJS.ProcessEnv,
    | 'DATABASE_URL'
    | 'HUB_SESSION_ISSUER'
    | 'SHARED_SESSION_LOCAL_ORGANIZATION_ID'
    | 'CENTRAL_API_BASE_URL'
    | 'CENTRAL_API_TOKEN'
    | 'CENTRAL_ORGANIZATION_ID'
    | 'HUB_SSO_APP_ID'
    | 'CENTRAL_APPLICATION_ID'
    | 'CENTRAL_API_TIMEOUT_MS'
  >
>;

type ReadinessOutput = Pick<Console, 'log' | 'error'>;

export function parseSharedSessionReadinessArguments(argv: string[]): {
  strict: boolean;
  localOnly: boolean;
} {
  let strict = false;
  let localOnly = false;
  for (const argument of argv) {
    if (argument === '--strict') strict = true;
    else if (argument === '--local-only') localOnly = true;
    else throw new Error(usage);
  }
  return { strict, localOnly };
}

export async function runSharedSessionReadinessCli(
  argv: string[],
  options: {
    environment?: ReadinessEnvironment;
    output?: ReadinessOutput;
    prisma?: Pick<PrismaClient, 'user' | 'externalPrincipal'>;
    central?: Pick<CentralEntitlementClient, 'lookupApplicationEntitlement'>;
  } = {},
): Promise<number> {
  const environment = options.environment ?? process.env;
  const output = options.output ?? console;
  let args;
  try {
    args = parseSharedSessionReadinessArguments(argv);
  } catch {
    output.error(JSON.stringify({ code: 'INVALID_ARGUMENTS' }));
    return 2;
  }

  const databaseUrl = environment.DATABASE_URL?.trim();
  const localOrganizationId =
    environment.SHARED_SESSION_LOCAL_ORGANIZATION_ID?.trim();
  let applicationId: string;
  try {
    applicationId = resolveApplicationId(environment);
  } catch {
    output.error(JSON.stringify({ code: 'CONFIGURATION_INVALID' }));
    return 2;
  }
  if (!databaseUrl || !localOrganizationId) {
    output.error(JSON.stringify({ code: 'CONFIGURATION_INVALID' }));
    return 2;
  }

  const baseUrl = environment.CENTRAL_API_BASE_URL?.trim();
  const token = environment.CENTRAL_API_TOKEN?.trim();
  const centralOrganizationId = environment.CENTRAL_ORGANIZATION_ID?.trim();
  const useCentral =
    !args.localOnly && Boolean(baseUrl && token && centralOrganizationId);
  const ownsPrisma = !options.prisma;
  const prisma =
    options.prisma ?? new PrismaClient({ datasourceUrl: databaseUrl });

  try {
    let central = options.central;
    if (useCentral && !central) {
      const timeout = Number(environment.CENTRAL_API_TIMEOUT_MS ?? 5_000);
      central = new CentralDataClient({
        baseUrl: normalizeCentralApiBaseUrl(baseUrl!),
        token: token!,
        timeoutMs:
          Number.isInteger(timeout) && timeout >= 100 && timeout <= 60_000
            ? timeout
            : 5_000,
      });
    }
    const report = await inspectSharedSessionReadiness({
      prisma,
      issuer: environment.HUB_SESSION_ISSUER?.trim() || 'mws-hub',
      localOrganizationId,
      applicationId,
      centralOrganizationId: useCentral ? centralOrganizationId : undefined,
      central: useCentral ? central : undefined,
      strict: args.strict,
    });
    output.log(JSON.stringify(report));
    return report.go ? 0 : 1;
  } catch {
    output.error(JSON.stringify({ code: 'DIAGNOSTIC_FAILED' }));
    return 2;
  } finally {
    if (ownsPrisma) await (prisma as PrismaClient).$disconnect();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  loadRootEnvironment();
  runSharedSessionReadinessCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
