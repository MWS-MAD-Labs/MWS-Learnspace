import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { CentralDataClient } from 'mws-central-auth/data-client';
import { loadRootEnvironment, resolveApplicationId } from '../lib/config.js';
import {
  createPostgresCentralAccessSyncLock,
  synchronizeCentralAccess,
} from '../service/central-access-sync-service.js';
import { createCentralOrganizationService } from '../service/central-organization-service.js';
import { normalizeCentralApiBaseUrl } from '../service/shared-session-shadow-service.js';

const usage = `Usage:
  bun run central-access:sync -- --dry-run
  bun run central-access:sync -- --apply`;

export function parseCentralAccessSyncArguments(
  argv: string[],
): 'dry-run' | 'apply' {
  if (argv.length === 1 && argv[0] === '--dry-run') return 'dry-run';
  if (argv.length === 1 && argv[0] === '--apply') return 'apply';
  throw new Error(usage);
}

export async function runCentralAccessSyncCli(argv: string[]): Promise<number> {
  let prisma: PrismaClient | undefined;
  try {
    const mode = parseCentralAccessSyncArguments(argv);
    const databaseUrl = process.env.DATABASE_URL?.trim();
    const baseUrl = process.env.CENTRAL_API_BASE_URL?.trim();
    const token = process.env.CENTRAL_API_TOKEN?.trim();
    const centralOrganizationId = process.env.CENTRAL_ORGANIZATION_ID?.trim();
    if (!databaseUrl || !baseUrl || !token || !centralOrganizationId) {
      throw new Error('Central access synchronization is not configured.');
    }

    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    const organization = await createCentralOrganizationService(prisma).resolve(
      {
        centralOrganizationId,
        localOrganizationIdHint:
          process.env.SHARED_SESSION_LOCAL_ORGANIZATION_ID?.trim(),
      },
    );
    const report = await synchronizeCentralAccess({
      lock: createPostgresCentralAccessSyncLock(prisma),
      central: new CentralDataClient({
        baseUrl: normalizeCentralApiBaseUrl(baseUrl),
        token,
        timeoutMs: 5_000,
      }),
      issuer: process.env.HUB_SESSION_ISSUER?.trim() || 'mws-hub',
      applicationId: resolveApplicationId(process.env),
      centralOrganizationId,
      localOrganizationId: organization.localOrganizationId,
      mode,
    });
    console.log(JSON.stringify(report));
    return report.lockAcquired && report.counts.lookupFailures === 0 ? 0 : 1;
  } catch {
    console.error(JSON.stringify({ code: 'CENTRAL_ACCESS_SYNC_FAILED' }));
    return 2;
  } finally {
    await prisma?.$disconnect();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  loadRootEnvironment();
  runCentralAccessSyncCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
