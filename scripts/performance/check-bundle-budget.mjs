#!/usr/bin/env node

import console from 'node:console';
import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import process from 'node:process';

function parseArguments(argv) {
  const options = {
    budgetFile: 'docs/performance/budgets.json',
    root: undefined,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--budget-file') options.budgetFile = argv[++index];
    else if (argument === '--root') options.root = argv[++index];
    else if (argument === '--json') options.json = true;
    else if (argument === '--help') {
      console.log(
        'Usage: node scripts/performance/check-bundle-budget.mjs [--budget-file FILE] [--root DIR] [--json]',
      );
      process.exit(0);
    } else throw new Error(`Unknown argument: ${argument}`);
  }

  if (!options.budgetFile) throw new Error('--budget-file requires a value');
  return options;
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
    }),
  );
  return nested.flat();
}

function summarize(files, extension) {
  const selected = files.filter((file) => file.path.endsWith(extension));
  return {
    count: selected.length,
    bytes: selected.reduce((total, file) => total + file.bytes, 0),
    gzipBytes: selected.reduce((total, file) => total + file.gzipBytes, 0),
    largestBytes: Math.max(0, ...selected.map((file) => file.bytes)),
    largestGzipBytes: Math.max(0, ...selected.map((file) => file.gzipBytes)),
    largestFile:
      selected.toSorted((left, right) => right.bytes - left.bytes)[0]?.path ??
      null,
  };
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

const options = parseArguments(process.argv.slice(2));
const budgetPath = path.resolve(options.budgetFile);
const budgets = JSON.parse(await readFile(budgetPath, 'utf8'));
const bundle = budgets.bundle;
if (!bundle) throw new Error(`No bundle budget found in ${options.budgetFile}`);

const root = path.resolve(options.root ?? bundle.root);
let paths;
try {
  paths = await collectFiles(root);
} catch (error) {
  throw new Error(
    `Cannot read build output at ${root}. Run "npm run build -w @learnspace/web" first.`,
    { cause: error },
  );
}

const files = await Promise.all(
  paths.map(async (filePath) => {
    const contents = await readFile(filePath);
    return {
      path: path.relative(root, filePath),
      bytes: contents.byteLength,
      gzipBytes: gzipSync(contents, { level: 9 }).byteLength,
    };
  }),
);

const javascript = summarize(files, '.js');
const css = summarize(files, '.css');
const checks = [
  ['total JavaScript', javascript.bytes, bundle.maxTotalJavaScriptBytes],
  [
    'total JavaScript gzip',
    javascript.gzipBytes,
    bundle.maxTotalJavaScriptGzipBytes,
  ],
  [
    'largest JavaScript chunk',
    javascript.largestBytes,
    bundle.maxJavaScriptChunkBytes,
  ],
  [
    'largest JavaScript chunk gzip',
    javascript.largestGzipBytes,
    bundle.maxJavaScriptChunkGzipBytes,
  ],
  ['total CSS', css.bytes, bundle.maxTotalCssBytes],
  ['total CSS gzip', css.gzipBytes, bundle.maxTotalCssGzipBytes],
].map(([name, actual, maximum]) => ({
  name,
  actual,
  maximum,
  passed: Number(actual) <= Number(maximum),
}));

const result = {
  root: path.relative(process.cwd(), root),
  javascript,
  css,
  checks,
  passed: checks.every((check) => check.passed),
};

if (options.json) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`Bundle budget: ${result.root}`);
  console.log(
    `JavaScript: ${javascript.count} files, ${formatBytes(javascript.bytes)} raw, ${formatBytes(javascript.gzipBytes)} gzip`,
  );
  console.log(
    `CSS: ${css.count} files, ${formatBytes(css.bytes)} raw, ${formatBytes(css.gzipBytes)} gzip`,
  );
  if (javascript.largestFile)
    console.log(`Largest JS: ${javascript.largestFile}`);
  for (const check of checks) {
    console.log(
      `${check.passed ? 'PASS' : 'FAIL'} ${check.name}: ${formatBytes(Number(check.actual))} / ${formatBytes(Number(check.maximum))}`,
    );
  }
}

if (!result.passed) process.exitCode = 1;
