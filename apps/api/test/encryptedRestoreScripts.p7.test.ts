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

function commandPath(command: string) {
  return spawnSync('/bin/sh', ['-c', `command -v ${command}`], {
    encoding: 'utf8',
  }).stdout.trim();
}

describe('P7 encrypted restore wrappers', () => {
  it('refuses a missing encrypted checksum before decryption', () => {
    const directory = mkdtempSync(
      join(tmpdir(), 'learnspace-encrypted-restore-'),
    );
    temporaryDirectories.push(directory);
    const archive = join(directory, 'backup.dump.age');
    const identity = join(directory, 'identity.txt');
    writeFileSync(archive, 'ciphertext');
    writeFileSync(identity, 'AGE-SECRET-KEY-TEST');

    const result = spawnSync(
      '/bin/sh',
      [
        resolve(process.cwd(), '../../scripts/db-restore-encrypted.sh'),
        '--archive',
        archive,
        '--database',
        'restore_test',
      ],
      {
        encoding: 'utf8',
        env: { ...process.env, AGE_IDENTITY_FILE: identity },
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `Encrypted checksum sidecar does not exist: ${archive}.sha256.age`,
    );
    expect(result.stderr).not.toContain('age CLI is required');
  });

  it('drops the disposable database when verification fails', () => {
    const directory = mkdtempSync(join(tmpdir(), 'learnspace-restore-verify-'));
    temporaryDirectories.push(directory);
    const binaryDirectory = join(directory, 'bin');
    const plaintextTemporaryDirectory = join(directory, 'plaintext');
    const archive = join(directory, 'backup.dump.age');
    const identity = join(directory, 'identity.txt');
    const dockerLog = join(directory, 'docker.log');
    spawnSync('mkdir', ['-p', binaryDirectory, plaintextTemporaryDirectory]);
    writeFileSync(archive, 'fake-archive');
    writeFileSync(`${archive}.sha256.age`, 'checksum');
    writeFileSync(identity, 'AGE-SECRET-KEY-TEST');

    for (const command of [
      'basename',
      'cat',
      'date',
      'dirname',
      'grep',
      'mktemp',
      'pwd',
      'rm',
      'sh',
    ]) {
      symlinkSync(commandPath(command), join(binaryDirectory, command));
    }

    writeFileSync(
      join(binaryDirectory, 'age'),
      `#!/bin/sh
output=''
input=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    -d) shift ;;
    -i) shift 2 ;;
    -o) output=$2; shift 2 ;;
    *) input=$1; shift ;;
  esac
done
case "$input" in
  *.sha256.age) printf '%s\\n' 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa  backup.dump' > "$output" ;;
  *) cat "$input" > "$output" ;;
esac
`,
      { mode: 0o700 },
    );

    writeFileSync(
      join(binaryDirectory, 'docker'),
      `#!/bin/sh
printf '%s\\n' "$*" >> '${dockerLog}'
case "$*" in
  "compose ps -q db") printf '%s\\n' container-id ;;
  *" sh -c "*POSTGRES_USER*) printf '%s' learnspace ;;
  *" sh -c "*POSTGRES_DB*) printf '%s' learnspace ;;
  *" pg_restore --list") cat >/dev/null ;;
  *"SELECT 1 FROM pg_database"*) exit 0 ;;
  *" createdb "*) exit 0 ;;
  *" pg_restore -U "*) cat >/dev/null ;;
  *" -c ANALYZE") exit 0 ;;
  *"to_regclass"*) printf '%s\\n' 0 ;;
  *" dropdb "*) exit 0 ;;
  *) exit 1 ;;
esac
`,
      { mode: 0o700 },
    );

    writeFileSync(join(binaryDirectory, 'shasum'), '#!/bin/sh\nexit 0\n', {
      mode: 0o700,
    });

    const result = spawnSync(
      '/bin/sh',
      [
        resolve(process.cwd(), '../../scripts/db-restore-verify.sh'),
        '--archive',
        archive,
        '--database',
        'learnspace_restore_verify_test',
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          AGE_IDENTITY_FILE: identity,
          PATH: binaryDirectory,
          TMPDIR: plaintextTemporaryDirectory,
        },
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Restored database is missing the Prisma migration table.',
    );
    expect(result.stderr).toContain(
      '{"status":"failed","operation":"restore_verify"}',
    );
    expect(existsSync(join(plaintextTemporaryDirectory, 'backup.dump'))).toBe(
      false,
    );
    expect(
      spawnSync('/bin/sh', ['-c', 'find . -mindepth 1 -print'], {
        cwd: plaintextTemporaryDirectory,
        encoding: 'utf8',
      }).stdout,
    ).toBe('');
    expect(
      spawnSync('/bin/sh', ['-c', `grep 'dropdb' '${dockerLog}'`], {
        encoding: 'utf8',
      }).stdout,
    ).toContain('learnspace_restore_verify_test');
  });
});
