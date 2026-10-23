import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../../../../');

describe('ExternalPrincipal schema and migration', () => {
  it('keeps issuer/subject and user/issuer mappings unique', async () => {
    const schema = await readFile(
      path.join(root, 'prisma/schema.prisma'),
      'utf8',
    );
    expect(schema).toContain('model ExternalPrincipal');
    expect(schema).toContain('@@unique([issuer, subject])');
    expect(schema).toContain('@@unique([userId, issuer])');
    expect(schema).toContain('verified    Boolean  @default(false)');
  });

  it('commits the matching table, indexes, and cascading user foreign key', async () => {
    const migration = await readFile(
      path.join(
        root,
        'prisma/migrations/20261021000000_external_principals/migration.sql',
      ),
      'utf8',
    );
    expect(migration).toContain('CREATE TABLE "ExternalPrincipal"');
    expect(migration).toContain('"ExternalPrincipal_issuer_subject_key"');
    expect(migration).toContain('"ExternalPrincipal_userId_issuer_key"');
    expect(migration).toContain('ON DELETE CASCADE');
  });
});
