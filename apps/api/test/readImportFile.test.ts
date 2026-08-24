import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { LEARNSPACE_EXPORT_MAX_BYTES } from '@learnspace/contracts';
import { describe, expect, it } from 'vitest';
import { readExportFile } from '../src/importer/readImportFile.js';

const valid = {
  format: 'learnspace-export',
  version: 1,
  exportedAt: '2026-08-24T12:00:00.000Z',
  source: {
    application: 'learnspace-web',
    applicationVersion: 'test',
    storageVersion: 2,
  },
  organization: {
    sourceKey: 'test',
    targetOrganizationId: null,
    academicYears: [],
    semesters: [],
    units: [],
    grades: [],
    classes: [],
    subjects: [],
  },
  records: {
    users: [],
    students: [],
    learningJourneys: [],
    observationDefinitions: [],
    observationAssignments: [],
    fedcObservations: [],
    sensoryProfileObservations: [],
    sfaObservations: [],
    ieps: [],
    weeklyReports: [],
  },
};

describe('readExportFile', () => {
  it('reads, validates, and hashes exact bytes', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'learnspace-import-'));
    const file = path.join(directory, 'export.json');
    await writeFile(file, JSON.stringify(valid));

    const result = await readExportFile(file);

    expect(result.document.version).toBe(1);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.byteCount).toBeGreaterThan(0);
  });

  it('rejects malformed JSON', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'learnspace-import-'));
    const file = path.join(directory, 'export.json');
    await writeFile(file, '{broken');

    await expect(readExportFile(file)).rejects.toThrow('malformed JSON');
  });

  it('rejects oversized files before parsing', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'learnspace-import-'));
    const file = path.join(directory, 'export.json');
    await writeFile(file, Buffer.alloc(LEARNSPACE_EXPORT_MAX_BYTES + 1));

    await expect(readExportFile(file)).rejects.toThrow('byte limit');
  });
});
