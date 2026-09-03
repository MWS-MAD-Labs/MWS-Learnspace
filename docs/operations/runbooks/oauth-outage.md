# Runbook: OAuth outage

- **Severity:** High; Critical if all authorized users/operators are locked out.
- **Primary owner:** `TBD: identity on-call`
- **Escalation:** `TBD: incident commander`, `TBD: Google/provider support owner`, and `TBD: security owner`.

## Symptoms

- Google authorization cannot start or callback broadly fails.
- Provider status reports an incident.
- Redirect URI/client errors or token exchange failures spike after a change.

## Diagnose

1. Confirm Learnspace `/health` and `/health/ready` independently of OAuth.
2. Check provider status and test with an approved non-production/test identity where possible.
3. Compare the exact public origin, callback URI, OAuth client, admission mode, system time, and recent secret/configuration changes with the documented environment configuration.
4. Distinguish provider outage, ingress/DNS/TLS failure, invalid client configuration, secret rotation error, and Learnspace callback/session failure.
5. Preserve sanitized error codes and timestamps only. Never capture authorization codes, tokens, cookies, client secrets, or user record data.

## Mitigate

- Keep OAuth validation, admission, sessions, and authorization fail-closed.
- Roll back a known-bad deployment/configuration or complete controlled secret rotation when evidence supports it.
- Communicate expected impact through the approved status channel (`TBD`).
- Do not introduce password fallback, shared bypass accounts, relaxed redirect matching, disabled state/nonce/PKCE, or manually forged sessions.

## Verify and close

- Fresh login and logout succeed, session revocation works, and unknown/disabled users remain denied.
- Monitor success/failure rates through the agreed observation window (`TBD`).
- Record cause, provider ticket/status link, duration, affected environments, and follow-ups.
- The plan at `../tabletop-exercises/oauth-outage.md` has not been executed unless a separately dated evidence record says so.
