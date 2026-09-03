# API observability

Learnspace exposes dependency-free Prometheus text metrics from the API process at `GET /metrics`.

## Exposure boundary

`/metrics` is an internal/operator-only endpoint. It is intentionally outside `/api/v1` and must not be proxied by the public nginx virtual host. Scrape it only over a private container, host, or cluster network. Apply network policy, firewall, or private ingress authentication appropriate to the deployment platform.

The endpoint contains no application record identifiers, email addresses, query strings, cookies, request bodies, or secrets. Do not add user, organization, student, email, URL query, cookie, or body dimensions to metrics.

Example private scrape target:

```yaml
scrape_configs:
  - job_name: learnspace-api
    metrics_path: /metrics
    static_configs:
      - targets: ['api:4000']
```

## Metrics

- `learnspace_http_requests_total{method,route,status_class}`: completed requests. Routes are normalized to bounded path groups; path identifiers and query strings are removed.
- `learnspace_http_request_duration_seconds{method,route,status_class}`: fixed-bucket request-duration histogram.
- `learnspace_http_forbidden_total{reason}`: 403 outcomes split into `authorization`, `csrf`, `cors`, and `other`.
- `learnspace_login_failures_total{reason}`: OAuth callback failures using a fixed allowlist of safe reason codes.
- `learnspace_auth_cleanup_runs_total{result}` and `learnspace_auth_cleanup_duration_seconds{result}`: background session/OAuth cleanup outcomes and duration.
- `learnspace_auth_cleanup_last_success_unixtime`: Unix timestamp of the last successful cleanup in this process.
- `learnspace_database_up`: result of the latest `/health/ready` database check. It is `0` until a successful readiness check occurs.
- `learnspace_database_connections`: current connections to the Learnspace database reported by `pg_stat_activity`.
- `learnspace_database_max_connections`: PostgreSQL `max_connections`.
- `learnspace_database_connection_utilization_ratio`: `pg_stat_activity` connections for the current database divided by `max_connections`.
- `learnspace_database_connection_stats_scrape_success`: whether the latest connection-stat query succeeded.

The connection utilization ratio is an operational proxy, not Prisma pool utilization. It includes every PostgreSQL session connected to the same database, may require permission to see complete `pg_stat_activity` data, and should be interpreted together with database-level monitoring. A failed stats query does not fail the metrics scrape; the scrape-success gauge becomes `0`.

Metrics are process-local and reset when the API restarts. Prometheus should retain and aggregate the time series.

## Trace correlation

The API accepts a valid W3C `traceparent` header and returns it with `x-trace-id`. If the incoming header is absent or invalid, the API generates a new trace ID and W3C trace context. Request completion and request failure logs include the trace ID and request ID.

Request logs contain only the normalized route group, HTTP method, status, and duration. They do not contain query strings or path identifiers.

## Log redaction

The central JSON logger recursively replaces values under sensitive keys with `[REDACTED]`. Sensitive keys include authorization, cookies, CSRF values, email, passwords, secrets, sessions, tokens, bodies, queries, and user/student/organization identifiers. Redaction is a defense in depth measure; callers should still avoid passing sensitive data to the logger.
