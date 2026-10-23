import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../../../../');

describe('Central organization mapping schema and migration', () => {
  it('keeps the nullable Central organization mapping unique', async () => {
    const schema = await readFile(
      path.join(root, 'prisma/schema.prisma'),
      'utf8',
    );
    expect(schema).toContain('centralOrganizationId String?');
    expect(schema).toMatch(/centralOrganizationId\s+String\?\s+@unique/);
  });

  it('adds one post-20261021000000 migration with a unique index', async () => {
    const migration = await readFile(
      path.join(
        root,
        'prisma/migrations/20261022000000_central_organization_mapping/migration.sql',
      ),
      'utf8',
    );
    expect(migration).toContain('ADD COLUMN "centralOrganizationId" TEXT');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "Organization_centralOrganizationId_key"',
    );
  });
});
