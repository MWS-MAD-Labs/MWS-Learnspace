import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import {
  LEARNSPACE_EXPORT_MAX_BYTES,
  learnspaceExportSchema,
  type LearnspaceExportV1,
} from '@learnspace/contracts';
import { importManifestSchema, type ImportManifest } from './importManifest.js';

const parseJson = (bytes: Buffer, label: string): unknown => {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label} is not valid UTF-8.`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} contains malformed JSON.`);
  }
};

export async function readExportFile(path: string): Promise<{
  document: LearnspaceExportV1;
  sha256: string;
  byteCount: number;
}> {
  const metadata = await stat(path);
  if (!metadata.isFile()) throw new Error('Export path must be a file.');
  if (metadata.size > LEARNSPACE_EXPORT_MAX_BYTES) {
    throw new Error(
      `Export exceeds the ${LEARNSPACE_EXPORT_MAX_BYTES}-byte limit.`,
    );
  }
  const bytes = await readFile(path);
  const result = learnspaceExportSchema.safeParse(
    parseJson(bytes, 'Export file'),
  );
  if (!result.success) {
    throw new Error(
      `Export validation failed: ${result.error.issues
        .map((issue) => `${issue.path.join('.') || 'export'}: ${issue.message}`)
        .join('; ')}`,
    );
  }
  return {
    document: result.data,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    byteCount: bytes.byteLength,
  };
}

export async function readImportManifest(
  path: string,
): Promise<ImportManifest> {
  const bytes = await readFile(path);
  const result = importManifestSchema.safeParse(
    parseJson(bytes, 'Import manifest'),
  );
  if (!result.success) {
    throw new Error(
      `Import manifest validation failed: ${result.error.issues
        .map(
          (issue) => `${issue.path.join('.') || 'manifest'}: ${issue.message}`,
        )
        .join('; ')}`,
    );
  }
  return result.data;
}
