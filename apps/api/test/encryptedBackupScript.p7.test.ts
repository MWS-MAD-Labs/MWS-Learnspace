import {
  existsSync,
  mkdtempSync,
  readFileSync,
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

function createHarness(failChecksumEncryption = false) {
  const directory = mkdtempSync(join(tmpdir(), 'learnspace-encrypted-backup-'));
  temporaryDirectories.push(directory);
  const binaryDirectory = join(directory, 'bin');
  const plaintextTemporaryDirectory = join(directory, 'plaintext');
  const output = join(directory, 'backup.dump.age');
  const ageLog = join(directory, 'age.log');
  spawnSync('mkdir', ['-p', binaryDirectory, plaintextTemporaryDirectory]);

  for (const command of [
    'basename',
    'cat',
    'dirname',
    'grep',
    'ln',
    'mktemp',
    'mv',
    'pwd',
    'rm',
    'sh',
    'shasum',
  ]) {
    symlinkSync(commandPath(command), join(binaryDirectory, command));
  }

  writeFileSync(
    join(binaryDirectory, 'docker'),
    `#!/bin/sh
case "$*" in
  "compose ps -q db") printf '%s\\n' container-id ;;
  *" sh -c "*) printf '%s' learnspace ;;
  *" psql "*) printf '%s\\n' 1 ;;
  *" pg_dump "*) printf '%s' fake-archive ;;
  *" pg_restore --list") cat >/dev/null ;;
  *) exit 1 ;;
esac
`,
    { mode: 0o700 },
  );

  writeFileSync(
    join(binaryDirectory, 'age'),
    `#!/bin/sh
printf '%s\\n' "$*" >> '${ageLog}'
output=''
input=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    -r) printf '%s\\n' "recipient=$2" >> '${ageLog}'; shift 2 ;;
    -o) output=$2; shift 2 ;;
    *) input=$1; shift ;;
  esac
done
case "$input" in
  *.sha256) ${failChecksumEncryption ? 'exit 1' : ':'} ;;
esac
cat "$input" > "$output"
`,
    { mode: 0o700 },
  );

  const result = spawnSync(
    '/bin/sh',
    [
      resolve(process.cwd(), '../../scripts/db-backup-encrypted.sh'),
      '--database',
      'learnspace',
      '--output',
      output,
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        AGE_RECIPIENT: 'age1literal recipient value',
        PATH: binaryDirectory,
        TMPDIR: plaintextTemporaryDirectory,
      },
    },
  );

  return { ageLog, directory, output, plaintextTemporaryDirectory, result };
}

describe('P7 encrypted database backup wrapper', () => {
  it('publishes only encrypted artifacts and passes the recipient literally', () => {
    const { ageLog, output, plaintextTemporaryDirectory, result } =
      createHarness();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      '{"status":"ok","operation":"encrypted_backup"}',
    );
    expect(existsSync(output)).toBe(true);
    expect(existsSync(`${output}.sha256.age`)).toBe(true);
    expect(readFileSync(ageLog, 'utf8')).toContain(
      'recipient=age1literal recipient value',
    );
    expect(readFileSync(ageLog, 'utf8')).not.toContain(
      'recipient=age1literal\n',
    );
    expect(readFileSync(output, 'utf8')).toBe('fake-archive');
    expect(
      spawnSync('/bin/sh', ['-c', 'find . -mindepth 1 -print'], {
        cwd: plaintextTemporaryDirectory,
        encoding: 'utf8',
      }).stdout,
    ).toBe('');
  });

  it('fails closed and removes plaintext and partial ciphertext on encryption failure', () => {
    const { directory, output, plaintextTemporaryDirectory, result } =
      createHarness(true);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      '{"status":"failed","operation":"encrypted_backup"}',
    );
    expect(existsSync(output)).toBe(false);
    expect(existsSync(`${output}.sha256.age`)).toBe(false);
    expect(
      spawnSync(
        '/bin/sh',
        [
          '-c',
          'find . -maxdepth 1 -name ".learnspace-encrypted-publish.*" -print',
        ],
        {
          cwd: directory,
          encoding: 'utf8',
        },
      ).stdout,
    ).toBe('');
    expect(
      spawnSync('/bin/sh', ['-c', 'find . -mindepth 1 -print'], {
        cwd: plaintextTemporaryDirectory,
        encoding: 'utf8',
      }).stdout,
    ).toBe('');
  });
});
