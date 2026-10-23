import { existsSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const packageDirectory = [
  path.resolve('node_modules/mws-central-auth'),
  path.resolve('apps/api/node_modules/mws-central-auth'),
  path.resolve('apps/web/node_modules/mws-central-auth'),
].find((candidate) => existsSync(path.join(candidate, 'package.json')));

if (!packageDirectory) process.exit(0);

const declaration = path.join(packageDirectory, 'dist/server/index.d.ts');

if (existsSync(declaration)) process.exit(0);

const tsconfigPath = path.join(packageDirectory, 'tsconfig.json');
const run = (command: string, args: string[], captureOutput = false) =>
  new Promise<{ exitCode: number; output: string }>((resolve, reject) => {
    let output = '';
    const child = spawn(command, args, {
      cwd: packageDirectory,
      stdio: captureOutput ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    });
    child.stdout?.on('data', (chunk) => {
      output += chunk;
    });
    child.once('error', reject);
    child.once('exit', (code) => resolve({ exitCode: code ?? 1, output }));
  });

const version = await run('bunx', ['tsc', '--version'], true);
if (version.exitCode !== 0) process.exit(version.exitCode);

const majorVersion = Number.parseInt(
  version.output.match(/\d+/)?.[0] ?? '',
  10,
);
if (!Number.isInteger(majorVersion)) {
  throw new Error(
    `Could not parse TypeScript version from: ${version.output.trim()}`,
  );
}

let declarationTsconfigPath = tsconfigPath;
let temporaryTsconfigPath: string | undefined;

if (majorVersion < 6) {
  const tsconfig = JSON.parse(await readFile(tsconfigPath, 'utf8')) as {
    compilerOptions?: Record<string, unknown>;
  };
  if (tsconfig.compilerOptions)
    delete tsconfig.compilerOptions.ignoreDeprecations;
  temporaryTsconfigPath = path.join(
    packageDirectory,
    `tsconfig.learnspace-${process.pid}.json`,
  );
  await writeFile(
    temporaryTsconfigPath,
    `${JSON.stringify(tsconfig, null, 2)}\n`,
  );
  declarationTsconfigPath = temporaryTsconfigPath;
}

let buildExitCode = 0;

try {
  const bundle = await run('bunx', [
    'tsup',
    'src/index.ts',
    'src/server/index.ts',
    'src/data-client/index.ts',
    'src/client/index.ts',
    '--format',
    'esm,cjs',
  ]);
  buildExitCode = bundle.exitCode;

  if (buildExitCode === 0) {
    const declarations = await run('bunx', [
      'tsc',
      '-p',
      declarationTsconfigPath,
      '--emitDeclarationOnly',
      '--declaration',
      '--noEmit',
      'false',
    ]);
    buildExitCode = declarations.exitCode;
  }
} finally {
  if (temporaryTsconfigPath) await rm(temporaryTsconfigPath, { force: true });
}

if (buildExitCode !== 0) process.exit(buildExitCode);
