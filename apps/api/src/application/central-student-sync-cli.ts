import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { CentralDataClient } from 'mws-central-auth/data-client';
import { loadRootEnvironment } from '../lib/config.js';
import {
  createPostgresCentralStudentSyncLock,
  synchronizeCentralStudents,
  type StudentCentralClient,
  type CentralStudentSyncMode,
} from '../service/central-student-sync-service.js';
import { createCentralOrganizationService } from '../service/central-organization-service.js';
import { normalizeCentralApiBaseUrl } from '../service/shared-session-shadow-service.js';

const usage = `Usage:
  bun run central-student:sync -- --dry-run [--adopt]
  bun run central-student:sync -- --apply [--adopt]

--adopt links a student that already exists here (same student number) to its Central id instead of leaving it as a conflict.`;

export function parseCentralStudentSyncArguments(argv: string[]): {
  mode: CentralStudentSyncMode;
  adopt: boolean;
} {
  const flags = new Set(argv);
  const mode =
    flags.has('--apply') && !flags.has('--dry-run')
      ? 'apply'
      : flags.has('--dry-run') && !flags.has('--apply')
        ? 'dry-run'
        : undefined;
  const known = new Set(['--apply', '--dry-run', '--adopt']);
  if (
    !mode ||
    argv.length !== flags.size ||
    [...flags].some((f) => !known.has(f))
  ) {
    throw new Error(usage);
  }
  return { mode, adopt: flags.has('--adopt') };
}

export async function runCentralStudentSyncCli(
  argv: string[],
): Promise<number> {
  let prisma: PrismaClient | undefined;
  try {
    const { mode, adopt } = parseCentralStudentSyncArguments(argv);
    const databaseUrl = process.env.DATABASE_URL?.trim();
    const baseUrl = process.env.CENTRAL_API_BASE_URL?.trim();
    const token = process.env.CENTRAL_API_TOKEN?.trim();
    const centralOrganizationId = process.env.CENTRAL_ORGANIZATION_ID?.trim();
    if (!databaseUrl || !baseUrl || !token || !centralOrganizationId) {
      throw new Error('Central student synchronization is not configured.');
    }
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    const organization = await createCentralOrganizationService(prisma).resolve(
      {
        centralOrganizationId,
        localOrganizationIdHint:
          process.env.SHARED_SESSION_LOCAL_ORGANIZATION_ID?.trim(),
      },
    );
    const report = await synchronizeCentralStudents({
      lock: createPostgresCentralStudentSyncLock(prisma),
      central: new CentralDataClient({
        baseUrl: normalizeCentralApiBaseUrl(baseUrl),
        token,
        timeoutMs: 15_000,
      }) as unknown as StudentCentralClient,
      localOrganizationId: organization.localOrganizationId,
      mode,
      adopt,
    });
    console.log(JSON.stringify(report));
    return report.lockAcquired ? 0 : 1;
  } catch {
    console.error(JSON.stringify({ code: 'CENTRAL_ACADEMIC_SYNC_FAILED' }));
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
  runCentralStudentSyncCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
