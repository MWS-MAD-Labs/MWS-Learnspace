import type { LearnspaceExportV1 } from '@learnspace/contracts';

export type ImportMode = 'dry-run' | 'apply';
export type ImportCounts = {
  accepted: number;
  transformed: number;
  skipped: number;
  rejected: number;
};

export type ImportReport = {
  mode: ImportMode;
  format: LearnspaceExportV1['format'];
  version: LearnspaceExportV1['version'];
  exportSha256: string;
  organizationId: string;
  sourceKey: string;
  counts: ImportCounts;
  collections: Record<string, ImportCounts>;
  diagnostics: string[];
  importRunId?: string;
};

export const emptyCounts = (): ImportCounts => ({
  accepted: 0,
  transformed: 0,
  skipped: 0,
  rejected: 0,
});
