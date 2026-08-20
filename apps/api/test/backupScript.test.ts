import {
  existsSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
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

function createHarness(options: {
  failingChecksum?: boolean;
  failingDatabaseQuery?: boolean;
  failingSecondMove?: boolean;
}) {
  const directory = mkdtempSync(join(tmpdir(), 'learnspace-backup-'));
  temporaryDirectories.push(directory);
  const binaryDirectory = join(directory, 'bin');
  const output = join(directory, 'backup.dump');
  const docker = join(binaryDirectory, 'docker');

  spawnSync('mkdir', ['-p', binaryDirectory]);
  for (const command of ['awk', 'basename', 'cat', 'dirname', 'grep', 'rm']) {
    const path = spawnSync('sh', ['-c', `command -v ${command}`], {
      encoding: 'utf8',
    }).stdout.trim();
    symlinkSync(path, join(binaryDirectory, command));
  }
  writeFileSync(
    docker,
    `#!/bin/sh
case "$*" in
  "compose ps -q db") printf '%s\\n' container-id ;;
  *" sh -c "*) printf '%s' learnspace ;;
  *" psql "*) ${options.failingDatabaseQuery ? 'exit 1' : "printf '%s\\n' 1"} ;;
  *" pg_dump "*) printf '%s' fake-archive ;;
  *" pg_restore --list") cat >/dev/null ;;
  *) exit 1 ;;
esac
`,
    { mode: 0o700 },
  );

  const systemMove = spawnSync('sh', ['-c', 'command -v mv'], {
    encoding: 'utf8',
  }).stdout.trim();
  if (options.failingSecondMove) {
    writeFileSync(
      join(binaryDirectory, 'mv'),
      `#!/bin/sh
count_file='${join(directory, 'mv-count')}'
count=0
[ ! -f "$count_file" ] || count=$(cat "$count_file")
count=$((count + 1))
printf '%s' "$count" > "$count_file"
[ "$count" -lt 2 ] || exit 1
exec '${systemMove}' "$@"
`,
      { mode: 0o700 },
    );
  } else {
    symlinkSync(systemMove, join(binaryDirectory, 'mv'));
  }

  if (options.failingChecksum) {
    writeFileSync(join(binaryDirectory, 'shasum'), '#!/bin/sh\nexit 1\n', {
      mode: 0o700,
    });
  } else {
    writeFileSync(
      join(binaryDirectory, 'shasum'),
      `#!/bin/sh
printf '%s  %s\\n' aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa "$3"
`,
      { mode: 0o700 },
    );
  }

  const result = spawnSync(
    '/bin/sh',
    [
      resolve(process.cwd(), '../../scripts/db-backup.sh'),
      '--database',
      'learnspace',
      '--output',
      output,
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, PATH: binaryDirectory },
    },
  );

  return { directory, output, result };
}

function expectNoBackupArtifacts(directory: string, output: string) {
  expect(existsSync(output)).toBe(false);
  expect(existsSync(`${output}.sha256`)).toBe(false);
  expect(existsSync(join(directory, '.backup.dump.tmp'))).toBe(false);
  expect(existsSync(join(directory, '.backup.dump.sha256.tmp'))).toBe(false);
}

describe('database backup script', () => {
  it('distinguishes a database-query failure from a missing database', () => {
    const { directory, output, result } = createHarness({
      failingDatabaseQuery: true,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Failed to query the Compose db service for the source database.',
    );
    expect(result.stderr).not.toContain('Source database does not exist');
    expectNoBackupArtifacts(directory, output);
  });

  it('does not publish an archive when checksum generation fails', () => {
    const { directory, output, result } = createHarness({
      failingChecksum: true,
    });

    expect(result.status).toBe(1);
    expectNoBackupArtifacts(directory, output);
  });

  it('rolls back the archive when publishing the checksum fails', () => {
    const { directory, output, result } = createHarness({
      failingSecondMove: true,
    });

    expect(result.status).toBe(1);
    expectNoBackupArtifacts(directory, output);
  });
});
