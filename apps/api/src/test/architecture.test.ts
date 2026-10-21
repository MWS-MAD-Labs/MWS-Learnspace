import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceRoot = new URL('..', import.meta.url).pathname;

async function sourceFiles(directory = sourceRoot): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? sourceFiles(path) : Promise.resolve([path]);
    }),
  );
  return files.flat().filter((file) => extname(file) === '.ts');
}

describe('API architecture', () => {
  it('uses Data Center horizontal naming without feature or repository layers', async () => {
    const files = await sourceFiles();
    const relativeFiles = files.map((file) => relative(sourceRoot, file));

    expect(relativeFiles.some((file) => file.startsWith('features/'))).toBe(
      false,
    );
    expect(
      relativeFiles.filter((file) =>
        /(^|\/).*(repository|\.database)\.ts$/i.test(file),
      ),
    ).toEqual([]);
    expect(
      relativeFiles.filter(
        (file) => file.startsWith('routes/') && !file.endsWith('-router.ts'),
      ),
    ).toEqual([]);
    expect(
      relativeFiles.filter(
        (file) =>
          file.startsWith('controller/') && !file.endsWith('-controller.ts'),
      ),
    ).toEqual([]);
    expect(
      relativeFiles.filter(
        (file) => file.startsWith('model/') && !file.endsWith('-model.ts'),
      ),
    ).toEqual([]);
    expect(
      relativeFiles.filter(
        (file) => file.startsWith('service/') && !file.endsWith('-service.ts'),
      ),
    ).toEqual([]);
    expect(
      relativeFiles.filter((file) => file.endsWith('-prisma-service.ts')),
    ).toEqual([]);
    expect(
      relativeFiles.filter(
        (file) =>
          file.startsWith('validation/') && !file.endsWith('-validation.ts'),
      ),
    ).toEqual([]);
  });

  it('keeps services from delegating Prisma access to prisma-service adapters', async () => {
    const serviceFiles = (await sourceFiles()).filter((file) =>
      /\/service\/.*-service\.ts$/.test(file),
    );
    const violations: string[] = [];

    for (const file of serviceFiles) {
      const source = await readFile(file, 'utf8');
      if (/from\s+['"][^'"]*-prisma-service\.js['"]/.test(source)) {
        violations.push(relative(sourceRoot, file));
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps Prisma imports and operations out of routes and controllers', async () => {
    const boundaryFiles = (await sourceFiles()).filter((file) =>
      /\/(routes|controller)\//.test(file),
    );
    const violations: string[] = [];

    for (const file of boundaryFiles) {
      const source = await readFile(file, 'utf8');
      if (
        source.includes('@prisma/client') ||
        /\bprisma\s*\./.test(source) ||
        /\.\$transaction\s*\(/.test(source)
      ) {
        violations.push(relative(sourceRoot, file));
      }
    }

    expect(violations).toEqual([]);
  });
});
