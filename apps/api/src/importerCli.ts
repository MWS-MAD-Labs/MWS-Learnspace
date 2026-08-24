import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { importExport } from './importer/importService.js';
import {
  readExportFile,
  readImportManifest,
} from './importer/readImportFile.js';

const usage = `Usage:
  npm run db:import -- --file EXPORT.json --manifest MANIFEST.json --dry-run
  npm run db:import -- --file EXPORT.json --manifest MANIFEST.json --apply --confirm-organization UUID`;

type Arguments = {
  file: string;
  manifest: string;
  mode: 'dry-run' | 'apply';
  confirmOrganization?: string;
};

export function parseImportArguments(argv: string[]): Arguments {
  let file: string | undefined;
  let manifest: string | undefined;
  let dryRun = false;
  let apply = false;
  let confirmOrganization: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--file') file = argv[++index];
    else if (argument === '--manifest') manifest = argv[++index];
    else if (argument === '--confirm-organization')
      confirmOrganization = argv[++index];
    else if (argument === '--dry-run') dryRun = true;
    else if (argument === '--apply') apply = true;
    else if (argument === '--help') throw new Error(usage);
    else throw new Error(`Unknown argument "${argument}".\n${usage}`);
  }
  if (!file || !manifest || dryRun === apply) throw new Error(usage);
  if (apply && !confirmOrganization) {
    throw new Error(`Apply requires --confirm-organization.\n${usage}`);
  }
  return {
    file,
    manifest,
    mode: apply ? 'apply' : 'dry-run',
    confirmOrganization,
  };
}

export async function runImportCli(argv: string[]): Promise<number> {
  let args: Arguments;
  try {
    args = parseImportArguments(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : usage);
    return 2;
  }
  try {
    const [{ document, sha256 }, manifest] = await Promise.all([
      readExportFile(args.file),
      readImportManifest(args.manifest),
    ]);
    if (
      args.mode === 'apply' &&
      args.confirmOrganization !== manifest.targetOrganizationId
    ) {
      console.error('Organization confirmation does not match the manifest.');
      return 2;
    }
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL is required.');
    const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    try {
      const report = await importExport({
        prisma,
        document,
        exportSha256: sha256,
        manifest,
        mode: args.mode,
      });
      console.log(JSON.stringify(report, null, 2));
      return report.counts.rejected === 0 ? 0 : 1;
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Import failed.');
    return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runImportCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
