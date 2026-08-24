import type { LearnspaceExportV1 } from '@learnspace/contracts';
import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import type { ImportManifest } from '../src/importer/importManifest.js';
import { importExport } from '../src/importer/importService.js';

const organizationId = '00000000-0000-4000-8000-000000000001';
const operatorUserId = '00000000-0000-4000-8000-000000000002';
const importRunId = '00000000-0000-4000-8000-000000000003';

const document: LearnspaceExportV1 = {
  format: 'learnspace-export',
  version: 1,
  exportedAt: '2026-08-24T12:00:00.000Z',
  source: {
    application: 'learnspace-web',
    applicationVersion: 'test',
    storageVersion: 2,
  },
  organization: {
    sourceKey: 'test-source',
    targetOrganizationId: organizationId,
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

const manifest: ImportManifest = {
  targetOrganizationId: organizationId,
  sourceKey: 'test-source',
  operatorUserId,
  enrollmentAcademicYear: '2026-2027',
  users: {},
  academicYears: {},
  semesters: {},
  units: {},
  grades: {},
  classes: {},
  subjects: {},
};

const transactionClient = (existingExportSha256?: string) => ({
  organization: {
    findUnique: vi
      .fn()
      .mockResolvedValue({ id: organizationId, status: 'ACTIVE' }),
  },
  user: {
    findUnique: vi
      .fn()
      .mockResolvedValue({ id: operatorUserId, status: 'ACTIVE' }),
  },
  importRun: {
    findFirst: vi
      .fn()
      .mockResolvedValue(
        existingExportSha256
          ? { id: importRunId, exportSha256: existingExportSha256 }
          : null,
      ),
    create: vi.fn().mockResolvedValue({ id: importRunId }),
  },
  auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit-1' }) },
});

describe('importExport', () => {
  it('checks repeat/conflict state on the serializable transaction client', async () => {
    const transaction = transactionClient();
    const prisma = {
      importRun: {
        findFirst: vi.fn(() => {
          throw new Error('outer import-run lookup must not execute');
        }),
      },
      $transaction: vi.fn(async (operation, options) => {
        expect(options).toMatchObject({ isolationLevel: 'Serializable' });
        return operation(transaction);
      }),
    } as unknown as PrismaClient;

    const report = await importExport({
      prisma,
      document,
      exportSha256: 'a'.repeat(64),
      manifest,
      mode: 'apply',
    });

    expect(transaction.importRun.findFirst).toHaveBeenCalledOnce();
    expect(transaction.importRun.create).toHaveBeenCalledOnce();
    expect(report.importRunId).toBe(importRunId);
  });

  it('skips an exact repeat discovered inside the transaction', async () => {
    const exportSha256 = 'b'.repeat(64);
    const transaction = transactionClient(exportSha256);
    const prisma = {
      $transaction: vi.fn(async (operation) => operation(transaction)),
    } as unknown as PrismaClient;

    const report = await importExport({
      prisma,
      document,
      exportSha256,
      manifest,
      mode: 'apply',
    });

    expect(transaction.importRun.create).not.toHaveBeenCalled();
    expect(report.counts.accepted).toBe(0);
    expect(report.importRunId).toBe(importRunId);
  });

  it('rejects a changed export discovered inside the transaction', async () => {
    const transaction = transactionClient('c'.repeat(64));
    const prisma = {
      $transaction: vi.fn(async (operation) => operation(transaction)),
    } as unknown as PrismaClient;

    await expect(
      importExport({
        prisma,
        document,
        exportSha256: 'd'.repeat(64),
        manifest,
        mode: 'apply',
      }),
    ).rejects.toThrow('A different export has already been applied');

    expect(transaction.importRun.create).not.toHaveBeenCalled();
  });
});
