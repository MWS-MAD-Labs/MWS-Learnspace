# Runbook: API unavailable

- **Severity:** Critical when user traffic cannot be served; High for partial or non-production impact.
- **Primary owner:** `TBD: application on-call`
- **Escalation:** `TBD: incident commander`, then `TBD: infrastructure owner`; notify `TBD: security/privacy owner` if compromise or disclosure is suspected.

## Symptoms

- `/health` or the same-origin API route is unreachable or repeatedly returns 5xx.
- API container is unhealthy, absent, restarting, or saturated.
- Web remains reachable but protected workflows fail broadly.

## Diagnose

1. Record environment, start time, last known-good time, commit, and correlation-safe evidence.
2. Check public `/health` and `/health/ready`; do not use protected endpoints as health probes.
3. Check web/ingress and API container health, restart count, resource pressure, and recent deployment state.
4. Inspect sanitized API logs by request/correlation identifier. Never paste cookies, tokens, request bodies, student records, or credentials into incident channels.
5. If liveness passes but readiness fails, switch to the [database unavailable runbook](database-unavailable.md).
6. Determine whether a deployment, configuration rotation, capacity event, or infrastructure outage preceded the failure.

## Mitigate

- Freeze deployments and other changes until the failure is understood.
- Remove unhealthy replicas from traffic or restart only the failed stateless service when evidence supports it.
- Roll back to the last known-compatible application configuration/artifact if a deployment caused the outage.
- Do not bypass authentication, expose the API directly, seed production, or weaken authorization to restore availability.

## Verify and close

- `/health` and `/health/ready` remain successful through the agreed observation window (`TBD`).
- A representative authenticated workflow succeeds and unauthorized access remains denied.
- Restart counts and error rates stop increasing.
- Record root cause, duration, affected workflows, actions, owners, and follow-ups in the incident system (`TBD`).
