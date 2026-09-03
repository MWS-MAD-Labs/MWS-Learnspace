import { randomBytes } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

const durationBuckets = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
];
const knownMethods = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'HEAD',
]);
const knownRouteSegments = new Set([
  'activate',
  'aggregate',
  'archive',
  'assignments',
  'attendance',
  'callback',
  'classes',
  'coordinator-review',
  'dashboard-summary',
  'director-review',
  'draft',
  'export',
  'goals',
  'ieps',
  'import',
  'learning-journeys',
  'login',
  'logout',
  'notifications',
  'observations',
  'reports',
  'reporting-aggregate',
  'resources',
  'search',
  'session',
  'students',
  'submit',
  'weekly-reports',
]);
const loginFailureReasons = new Set([
  'ACCOUNT_DISABLED',
  'ADMISSION_DENIED',
  'IDENTITY_ALREADY_LINKED',
  'INVALID_CALLBACK',
  'INVALID_IDENTITY',
  'INVALID_OR_REPLAYED_CALLBACK',
  'STATE_MISMATCH',
  'TOKEN_EXCHANGE_FAILED',
  'AUTH_CALLBACK_FAILED',
]);

export type CleanupResult = 'success' | 'failure';
export type ForbiddenReason = 'authorization' | 'csrf' | 'cors' | 'other';

type Histogram = {
  buckets: number[];
  count: number;
  sum: number;
};

type HttpLabels = {
  method: string;
  route: string;
  statusClass: string;
};

export type TraceContext = {
  traceId: string;
  traceparent: string;
};

export type Observability = ReturnType<typeof createObservability>;

function normalizeMethod(method: string): string {
  const normalized = method.toUpperCase();
  return knownMethods.has(normalized) ? normalized : 'OTHER';
}

function normalizeStatusClass(status: number): string {
  return status >= 100 && status <= 599
    ? `${Math.floor(status / 100)}xx`
    : 'other';
}

export function normalizeRoutePath(originalUrl: string): string {
  const pathname = originalUrl.split('?', 1)[0] || '/';
  const segments = pathname.split('/').filter(Boolean);
  if (!segments.length) return '/';
  if (segments[0] === 'health') {
    return segments[1] === 'live' || segments[1] === 'ready'
      ? `/health/${segments[1]}`
      : '/health/:other';
  }
  if (segments[0] === 'metrics') return '/metrics';
  if (segments[0] !== 'api' || segments[1] !== 'v1') return '/:other';
  if (segments[2] === 'version') return '/api/v1/version';
  if (segments[2] === 'auth') {
    const action = segments[3];
    return action && knownRouteSegments.has(action)
      ? `/api/v1/auth/${action}`
      : '/api/v1/auth/:other';
  }
  if (segments[2] !== 'organizations') return '/api/v1/:other';

  const normalized = ['/api', 'v1', 'organizations', ':id'];
  for (const segment of segments.slice(4, 9)) {
    normalized.push(knownRouteSegments.has(segment) ? segment : ':id');
  }
  if (segments.length > 9) normalized.push('...');
  return normalized.join('/');
}

export function createTraceContext(
  traceparent: string | undefined,
): TraceContext {
  const candidate = traceparent?.trim().toLowerCase();
  const match = candidate?.match(
    /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/,
  );
  if (
    match &&
    match[1] !== '00000000000000000000000000000000' &&
    match[2] !== '0000000000000000'
  ) {
    return { traceId: match[1], traceparent: candidate! };
  }

  const traceId = randomBytes(16).toString('hex');
  const parentId = randomBytes(8).toString('hex');
  return { traceId, traceparent: `00-${traceId}-${parentId}-01` };
}

export function classifyForbiddenReason(code: unknown): ForbiddenReason {
  if (code === 'AUTHORIZATION_DENIED') return 'authorization';
  if (code === 'CSRF_VALIDATION_FAILED') return 'csrf';
  if (code === 'CORS_ORIGIN_DENIED' || code === 'CORS_PREFLIGHT_DENIED') {
    return 'cors';
  }
  return 'other';
}

function histogram(): Histogram {
  return { buckets: durationBuckets.map(() => 0), count: 0, sum: 0 };
}

function observeHistogram(target: Histogram, seconds: number) {
  const safeSeconds = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
  target.count += 1;
  target.sum += safeSeconds;
  for (let index = 0; index < durationBuckets.length; index += 1) {
    if (safeSeconds <= durationBuckets[index]!) target.buckets[index]! += 1;
  }
}

function escapeLabel(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/"/g, '\\"');
}

function labels(values: Record<string, string>): string {
  return `{${Object.entries(values)
    .map(([key, value]) => `${key}="${escapeLabel(value)}"`)
    .join(',')}}`;
}

function number(value: number): string {
  return Number.isFinite(value) ? String(value) : '0';
}

function renderHistogram(
  lines: string[],
  name: string,
  help: string,
  entries: Iterable<
    [string, { labels: Record<string, string>; histogram: Histogram }]
  >,
) {
  lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} histogram`);
  for (const [, entry] of entries) {
    for (let index = 0; index < durationBuckets.length; index += 1) {
      lines.push(
        `${name}_bucket${labels({ ...entry.labels, le: String(durationBuckets[index]) })} ${entry.histogram.buckets[index]}`,
      );
    }
    lines.push(
      `${name}_bucket${labels({ ...entry.labels, le: '+Inf' })} ${entry.histogram.count}`,
      `${name}_sum${labels(entry.labels)} ${number(entry.histogram.sum)}`,
      `${name}_count${labels(entry.labels)} ${entry.histogram.count}`,
    );
  }
}

export function createObservability() {
  const httpRequests = new Map<string, { labels: HttpLabels; count: number }>();
  const httpDurations = new Map<
    string,
    { labels: Record<string, string>; histogram: Histogram }
  >();
  const forbidden = new Map<ForbiddenReason, number>();
  const loginFailures = new Map<string, number>();
  const cleanupRuns = new Map<CleanupResult, number>();
  const cleanupDurations = new Map<
    CleanupResult,
    { labels: Record<string, string>; histogram: Histogram }
  >();
  let cleanupLastSuccess = 0;
  let databaseUp = 0;
  let databaseConnections = 0;
  let databaseMaxConnections = 0;
  let databaseConnectionScrapeSuccess = 0;

  return {
    observeHttpRequest(
      method: string,
      route: string,
      status: number,
      durationSeconds: number,
    ) {
      const normalizedLabels: HttpLabels = {
        method: normalizeMethod(method),
        route: normalizeRoutePath(route),
        statusClass: normalizeStatusClass(status),
      };
      const key = `${normalizedLabels.method}\u0000${normalizedLabels.route}\u0000${normalizedLabels.statusClass}`;
      const requestEntry = httpRequests.get(key) ?? {
        labels: normalizedLabels,
        count: 0,
      };
      requestEntry.count += 1;
      httpRequests.set(key, requestEntry);

      const durationEntry = httpDurations.get(key) ?? {
        labels: {
          method: normalizedLabels.method,
          route: normalizedLabels.route,
          status_class: normalizedLabels.statusClass,
        },
        histogram: histogram(),
      };
      observeHistogram(durationEntry.histogram, durationSeconds);
      httpDurations.set(key, durationEntry);
    },

    observeForbidden(code: unknown) {
      const reason = classifyForbiddenReason(code);
      forbidden.set(reason, (forbidden.get(reason) ?? 0) + 1);
    },

    observeLoginFailure(reason: unknown) {
      const safeReason =
        typeof reason === 'string' && loginFailureReasons.has(reason)
          ? reason
          : 'AUTH_CALLBACK_FAILED';
      loginFailures.set(safeReason, (loginFailures.get(safeReason) ?? 0) + 1);
    },

    observeAuthCleanup(
      result: CleanupResult,
      durationSeconds: number,
      completedAt = new Date(),
    ) {
      cleanupRuns.set(result, (cleanupRuns.get(result) ?? 0) + 1);
      const durationEntry = cleanupDurations.get(result) ?? {
        labels: { result },
        histogram: histogram(),
      };
      observeHistogram(durationEntry.histogram, durationSeconds);
      cleanupDurations.set(result, durationEntry);
      if (result === 'success')
        cleanupLastSuccess = completedAt.getTime() / 1000;
    },

    setDatabaseUp(up: boolean) {
      databaseUp = up ? 1 : 0;
    },

    async collectDatabaseConnectionUtilization(
      client: PrismaClient | undefined,
    ) {
      if (!client) {
        databaseConnectionScrapeSuccess = 0;
        return;
      }
      try {
        const rows = await client.$queryRaw<
          Array<{ used_connections: number; max_connections: number }>
        >`
          SELECT
            COUNT(*)::int AS "used_connections",
            current_setting('max_connections')::int AS "max_connections"
          FROM pg_stat_activity
          WHERE datname = current_database()
        `;
        databaseConnections = rows[0]?.used_connections ?? 0;
        databaseMaxConnections = rows[0]?.max_connections ?? 0;
        databaseConnectionScrapeSuccess = 1;
      } catch {
        databaseConnectionScrapeSuccess = 0;
      }
    },

    renderPrometheus(): string {
      const lines: string[] = [
        '# HELP learnspace_http_requests_total Completed HTTP requests.',
        '# TYPE learnspace_http_requests_total counter',
      ];
      for (const entry of httpRequests.values()) {
        lines.push(
          `learnspace_http_requests_total${labels({
            method: entry.labels.method,
            route: entry.labels.route,
            status_class: entry.labels.statusClass,
          })} ${entry.count}`,
        );
      }
      renderHistogram(
        lines,
        'learnspace_http_request_duration_seconds',
        'HTTP request duration in seconds.',
        httpDurations.entries(),
      );

      lines.push(
        '# HELP learnspace_http_forbidden_total HTTP 403 responses by safe reason.',
        '# TYPE learnspace_http_forbidden_total counter',
      );
      for (const reason of [
        'authorization',
        'csrf',
        'cors',
        'other',
      ] as const) {
        lines.push(
          `learnspace_http_forbidden_total${labels({ reason })} ${forbidden.get(reason) ?? 0}`,
        );
      }

      lines.push(
        '# HELP learnspace_login_failures_total Authentication callback failures by safe reason.',
        '# TYPE learnspace_login_failures_total counter',
      );
      for (const [reason, count] of [...loginFailures.entries()].sort()) {
        lines.push(
          `learnspace_login_failures_total${labels({ reason })} ${count}`,
        );
      }

      lines.push(
        '# HELP learnspace_auth_cleanup_runs_total Authentication cleanup runs.',
        '# TYPE learnspace_auth_cleanup_runs_total counter',
      );
      for (const result of ['success', 'failure'] as const) {
        lines.push(
          `learnspace_auth_cleanup_runs_total${labels({ result })} ${cleanupRuns.get(result) ?? 0}`,
        );
      }
      renderHistogram(
        lines,
        'learnspace_auth_cleanup_duration_seconds',
        'Authentication cleanup run duration in seconds.',
        cleanupDurations.entries(),
      );
      lines.push(
        '# HELP learnspace_auth_cleanup_last_success_unixtime Unix timestamp of the last successful authentication cleanup.',
        '# TYPE learnspace_auth_cleanup_last_success_unixtime gauge',
        `learnspace_auth_cleanup_last_success_unixtime ${number(cleanupLastSuccess)}`,
        '# HELP learnspace_database_up Whether the latest database readiness check succeeded.',
        '# TYPE learnspace_database_up gauge',
        `learnspace_database_up ${databaseUp}`,
        '# HELP learnspace_database_connections Current database connections for the Learnspace database from pg_stat_activity.',
        '# TYPE learnspace_database_connections gauge',
        `learnspace_database_connections ${number(databaseConnections)}`,
        '# HELP learnspace_database_max_connections PostgreSQL max_connections setting.',
        '# TYPE learnspace_database_max_connections gauge',
        `learnspace_database_max_connections ${number(databaseMaxConnections)}`,
        '# HELP learnspace_database_connection_utilization_ratio pg_stat_activity connection count divided by max_connections.',
        '# TYPE learnspace_database_connection_utilization_ratio gauge',
        `learnspace_database_connection_utilization_ratio ${number(
          databaseMaxConnections > 0
            ? databaseConnections / databaseMaxConnections
            : 0,
        )}`,
        '# HELP learnspace_database_connection_stats_scrape_success Whether the latest pg_stat_activity collection succeeded.',
        '# TYPE learnspace_database_connection_stats_scrape_success gauge',
        `learnspace_database_connection_stats_scrape_success ${databaseConnectionScrapeSuccess}`,
      );
      return `${lines.join('\n')}\n`;
    },
  };
}
