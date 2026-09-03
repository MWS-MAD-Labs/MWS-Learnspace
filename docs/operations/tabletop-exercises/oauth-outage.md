# Planned tabletop exercise: OAuth outage

> **Status: not executed.** This document is a scenario plan only. It does not demonstrate that Google OAuth recovery, communications, or escalation has been tested.

## Required participants and unresolved inputs

- Facilitator: `TBD`
- Identity/application owner: `TBD`
- Incident commander: `TBD`
- Infrastructure/ingress owner: `TBD`
- Security owner: `TBD`
- Communications/status owner and channel: `TBD`
- Google/provider support path: `TBD`

## Objectives

- Validate the OAuth-outage alert's owner, symptoms, diagnosis, mitigation, and escalation path.
- Preserve fail-closed authentication and authorization during identity-provider failure.
- Reject unsafe bypass proposals and identify approved user communications.

## Scenario injects

1. At `T+0`, public health checks pass but nearly all OAuth callbacks fail.
2. At `T+5`, Google status is ambiguous and a client-secret rotation occurred earlier that day.
3. At `T+10`, an administrator proposes creating a shared bypass account.
4. At `T+15`, callback errors indicate either redirect mismatch or invalid client credentials; logs contain no secret values.
5. At `T+25`, Google reports a regional incident while one environment also has a configuration discrepancy.

## Expected discussion/actions

- Open `../runbooks/oauth-outage.md`, assign command, and compare provider, ingress, callback, client, time, and secret-rotation evidence.
- Explicitly reject password fallback, shared accounts, forged sessions, disabled state/nonce/PKCE, or weakened admission.
- Define rollback/rotation approval, provider escalation, and sanitized status messaging.
- Verify that existing sessions and authorization behavior are considered separately from new login availability.

## Result record template

- Date/start/end:
- Participants and roles:
- Alert received by/at:
- Diagnosis and decisions by timestamp:
- Unsafe options rejected:
- Communications decision:
- Gaps/risks found:
- Follow-up action, owner, due date:
- Facilitator acknowledgement:
- Owner acknowledgement:

Blank acknowledgements mean no sign-off.
