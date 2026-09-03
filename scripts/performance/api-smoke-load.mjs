#!/usr/bin/env node

import console from 'node:console';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import process from 'node:process';

function parseArguments(argv) {
  const options = {
    baseUrl: undefined,
    budgetFile: 'docs/performance/budgets.json',
    allowRemote: false,
    requests: undefined,
    concurrency: undefined,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--base-url') options.baseUrl = argv[++index];
    else if (argument === '--budget-file') options.budgetFile = argv[++index];
    else if (argument === '--requests')
      options.requests = Number(argv[++index]);
    else if (argument === '--concurrency')
      options.concurrency = Number(argv[++index]);
    else if (argument === '--allow-remote') options.allowRemote = true;
    else if (argument === '--json') options.json = true;
    else if (argument === '--help') {
      console.log(
        'Usage: node scripts/performance/api-smoke-load.mjs --base-url URL [--requests N] [--concurrency N] [--allow-remote] [--json]',
      );
      process.exit(0);
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function percentile(values, quantile) {
  const sorted = values.toSorted((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * quantile) - 1);
  return sorted[index] ?? 0;
}

function isLoopback(hostname) {
  return (
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  );
}

async function runEndpoint(
  baseUrl,
  endpoint,
  requests,
  concurrency,
  timeoutMs,
) {
  const durations = [];
  const statuses = new Map();
  let next = 0;

  async function worker() {
    while (next < requests) {
      next += 1;
      const startedAt = performance.now();
      let status = 0;
      try {
        const response = await globalThis.fetch(
          new globalThis.URL(endpoint.path, baseUrl),
          {
            method: 'GET',
            redirect: 'manual',
            signal: globalThis.AbortSignal.timeout(timeoutMs),
            headers: {
              accept: 'application/json',
              'user-agent': 'learnspace-budget-check/1',
            },
          },
        );
        status = response.status;
        await response.arrayBuffer();
      } catch {
        status = 0;
      }
      durations.push(performance.now() - startedAt);
      statuses.set(status, (statuses.get(status) ?? 0) + 1);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const expectedResponses = statuses.get(endpoint.expectedStatus) ?? 0;
  const p95Ms = percentile(durations, 0.95);
  return {
    name: endpoint.name,
    path: endpoint.path,
    requests,
    concurrency,
    expectedStatus: endpoint.expectedStatus,
    statuses: Object.fromEntries([...statuses.entries()].sort()),
    minMs: Math.min(...durations),
    medianMs: percentile(durations, 0.5),
    p95Ms,
    maxMs: Math.max(...durations),
    passed: expectedResponses === requests && p95Ms <= endpoint.maxP95Ms,
    maxP95Ms: endpoint.maxP95Ms,
  };
}

const options = parseArguments(process.argv.slice(2));
if (!options.baseUrl)
  throw new Error('--base-url is required; no target is assumed');

const baseUrl = new globalThis.URL(options.baseUrl);
if (!['http:', 'https:'].includes(baseUrl.protocol)) {
  throw new Error('Only HTTP(S) targets are supported');
}
if (!isLoopback(baseUrl.hostname) && !options.allowRemote) {
  throw new Error(
    'Remote targets require explicit --allow-remote authorization',
  );
}

const budgets = JSON.parse(await readFile(options.budgetFile, 'utf8'));
const api = budgets.api;
if (!api?.endpoints?.length)
  throw new Error('No API endpoint budgets are configured');

const requests = options.requests ?? api.requests;
const concurrency = options.concurrency ?? api.concurrency;
if (!Number.isInteger(requests) || requests < 1 || requests > 1000) {
  throw new Error('--requests must be an integer from 1 to 1000');
}
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 20) {
  throw new Error('--concurrency must be an integer from 1 to 20');
}
if (concurrency > requests)
  throw new Error('--concurrency cannot exceed --requests');

const results = [];
for (const endpoint of api.endpoints) {
  results.push(
    await runEndpoint(baseUrl, endpoint, requests, concurrency, api.timeoutMs),
  );
}
const report = {
  target: baseUrl.origin,
  generatedAt: new Date().toISOString(),
  results,
  passed: results.every((result) => result.passed),
};

if (options.json) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`Read-only API smoke/load target: ${baseUrl.origin}`);
  for (const result of results) {
    console.log(
      `${result.passed ? 'PASS' : 'FAIL'} ${result.name} ${result.path}: p95 ${result.p95Ms.toFixed(1)} ms / ${result.maxP95Ms} ms; statuses ${JSON.stringify(result.statuses)}`,
    );
  }
}
if (!report.passed) process.exitCode = 1;
