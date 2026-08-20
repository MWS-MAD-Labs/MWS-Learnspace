import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('database restore script', () => {
  it('refuses an archive without its SHA-256 sidecar before Docker access', () => {
    const directory = mkdtempSync(join(tmpdir(), 'learnspace-restore-'));
    temporaryDirectories.push(directory);
    const archive = join(directory, 'backup.dump');
    writeFileSync(archive, 'not-a-real-archive');

    const result = spawnSync(
      'sh',
      [
        resolve(process.cwd(), '../../scripts/db-restore.sh'),
        '--archive',
        archive,
        '--database',
        'restore_test',
      ],
      { encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `Checksum sidecar does not exist: ${archive}.sha256`,
    );
    expect(result.stderr).not.toContain('Compose db service is not running');
  });
});
