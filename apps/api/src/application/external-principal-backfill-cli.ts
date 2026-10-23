import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { CentralDataClient } from 'mws-central-auth/data-client';
import { backfillExternalPrincipals } from '../service/external-principal-backfill-service.js';
import { normalizeCentralApiBaseUrl } from '../service/shared-session-shadow-service.js';
import { loadRootEnvironment } from '../lib/config.js';

const usage = `Usage:
  npm run db:backfill-central-principals -- --dry-run
  npm run db:backfill-central-principals -- --apply`;

export function parseBackfillArguments(argv: string[]): 'dry-run' | 'apply' {
  if (argv.length !== 1) throw new Error(usage);
  if (argv[0] === '--dry-run') return 'dry-run';
  if (argv[0] === '--apply') return 'apply';
  throw new Error(usage);
}

export async function runExternalPrincipalBackfillCli(
  argv: string[],
): Promise<number> {
  try {
    const mode = parseBackfillArguments(argv);
    const databaseUrl = process.env.DATABASE_URL?.trim();
    const centralApiBaseUrl = process.env.CENTRAL_API_BASE_URL?.trim();
    const centralApiToken = process.env.CENTRAL_API_TOKEN?.trim();
    if (!databaseUrl) throw new Error('DATABASE_URL is required.');
    if (!centralApiBaseUrl || !centralApiToken) {
      throw new Error(
        'CENTRAL_API_BASE_URL and CENTRAL_API_TOKEN are required.',
      );
    }
    const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    try {
      const report = await backfillExternalPrincipals({
        prisma,
        central: new CentralDataClient({
          baseUrl: normalizeCentralApiBaseUrl(centralApiBaseUrl),
          token: centralApiToken,
          timeoutMs: 5_000,
        }),
        issuer: process.env.HUB_SESSION_ISSUER?.trim() || 'mws-hub',
        mode,
      });
      console.log(JSON.stringify(report));
      return report.counts.conflicts === 0 ? 0 : 1;
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : 'Principal backfill failed.',
    );
    return 2;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  loadRootEnvironment();
  runExternalPrincipalBackfillCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
