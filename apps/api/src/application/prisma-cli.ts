import { spawn } from 'node:child_process';
import { loadRootEnvironment } from '../lib/config.js';

loadRootEnvironment();

const child = spawn('bunx', ['prisma', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});

child.once('error', (error) => {
  console.error(
    error instanceof Error ? error.message : 'Prisma command failed.',
  );
  process.exitCode = 1;
});
child.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
