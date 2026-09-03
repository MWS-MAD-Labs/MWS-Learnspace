import { describe, expect, it, vi } from 'vitest';
import {
  createObservability,
  createTraceContext,
  normalizeRoutePath,
} from '../src/observability.js';

describe('observability', () => {
  it('normalizes routes without IDs or query strings', () => {
    expect(
      normalizeRoutePath(
        '/api/v1/organizations/11111111-1111-4111-8111-111111111111/students/22222222-2222-4222-8222-222222222222?email=private@example.org',
      ),
    ).toBe('/api/v1/organizations/:id/students/:id');
    expect(normalizeRoutePath('/unknown/private-value?token=secret')).toBe(
      '/:other',
    );
  });

  it('accepts valid W3C trace context and replaces invalid context', () => {
    const valid = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
    expect(createTraceContext(valid)).toEqual({
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      traceparent: valid,
    });
    const generated = createTraceContext('invalid');
    expect(generated.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(generated.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });

  it('renders bounded labels and database connection utilization', async () => {
    const observability = createObservability();
    observability.observeHttpRequest(
      'GET',
      '/api/v1/organizations/private-id/students/private-student?email=private@example.org',
      403,
      0.25,
    );
    observability.observeForbidden('AUTHORIZATION_DENIED');
    observability.observeForbidden('CSRF_VALIDATION_FAILED');
    observability.observeLoginFailure('ACCOUNT_DISABLED');
    observability.observeLoginFailure('unbounded-private-reason');
    observability.observeAuthCleanup(
      'success',
      0.5,
      new Date('2026-09-03T00:00:00.000Z'),
    );
    observability.setDatabaseUp(true);
    const client = {
      $queryRaw: vi.fn(async () => [
        { used_connections: 8, max_connections: 100 },
      ]),
    };
    await observability.collectDatabaseConnectionUtilization(client as never);

    const metrics = observability.renderPrometheus();
    expect(metrics).toContain(
      'learnspace_http_requests_total{method="GET",route="/api/v1/organizations/:id/students/:id",status_class="4xx"} 1',
    );
    expect(metrics).toContain(
      'learnspace_http_forbidden_total{reason="authorization"} 1',
    );
    expect(metrics).toContain(
      'learnspace_http_forbidden_total{reason="csrf"} 1',
    );
    expect(metrics).toContain(
      'learnspace_login_failures_total{reason="ACCOUNT_DISABLED"} 1',
    );
    expect(metrics).toContain(
      'learnspace_login_failures_total{reason="AUTH_CALLBACK_FAILED"} 1',
    );
    expect(metrics).toContain(
      'learnspace_auth_cleanup_runs_total{result="success"} 1',
    );
    expect(metrics).toContain('learnspace_database_up 1');
    expect(metrics).toContain('learnspace_database_connections 8');
    expect(metrics).toContain(
      'learnspace_database_connection_utilization_ratio 0.08',
    );
    expect(metrics).not.toContain('private-id');
    expect(metrics).not.toContain('private-student');
    expect(metrics).not.toContain('private@example.org');
    expect(metrics).not.toContain('unbounded-private-reason');
  });
});
