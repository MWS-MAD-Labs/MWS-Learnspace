# Runbook: elevated login failures

- **Severity:** High; Critical when all authorized operators are locked out or active attack impact is confirmed.
- **Primary owner:** `TBD: identity on-call`
- **Escalation:** `TBD: security/privacy owner`, `TBD: incident commander`, and `TBD: Google/provider support owner`.

## Symptoms

- Login start/callback failures rise above the approved baseline (`TBD`).
- State, nonce, PKCE, token verification, admission, or session-creation denials spike.
- Users report repeated sign-in loops or safe access-denied pages.

## Diagnose

1. Preserve only aggregate counts, safe error codes, time windows, environment, and correlation identifiers.
2. Separate expected admission denials from OAuth/provider/configuration failures and suspected abuse.
3. Check `/health` and `/health/ready`, Google service status, callback reachability, exact redirect URI/client configuration, system time, and recent secret/configuration rotation.
4. Confirm cookies retain the production security attributes and that sessions can be created/revoked.
5. Never log or request OAuth codes, ID tokens, session cookies, client secrets, email lists, or student data.

## Mitigate

- Keep admission and token validation fail-closed.
- Roll back a known-bad OAuth/configuration change or rotate a suspected secret through the documented controlled process.
- Apply approved ingress/rate controls for abuse; do not block broad user populations without evidence.
- Do not create shared emergency accounts, disable state/nonce/PKCE, weaken cookie settings, or grant roles by email domain.

## Verify and close

- Fresh login/logout succeeds for approved test identities and unknown/disabled identities remain denied.
- Failure rates return to baseline through the agreed observation window (`TBD`).
- If malicious activity or disclosure is plausible, retain evidence and follow the private security incident process.
