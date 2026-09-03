# Planned tabletop exercise: database outage

> **Status: not executed.** This is a facilitator plan, not evidence that a tabletop, failover, or restore drill occurred. Create a separate dated, sanitized result record after owners actually participate.

## Required participants and unresolved inputs

- Facilitator: `TBD`
- Database owner/on-call: `TBD`
- Application owner/on-call: `TBD`
- Infrastructure owner: `TBD`
- Incident commander: `TBD`
- Security/privacy observer: `TBD`
- Approved RPO: `TBD`
- Approved RTO: `TBD`
- Communications/status owner and channel: `TBD`

Do not schedule the exercise as a sign-off gate until these roles and objectives are assigned.

## Objectives

- Validate detection and ownership of the database-unavailable alert.
- Walk through safe diagnosis without deleting volumes or changing production data.
- Decide when to freeze writers, restart, escalate, or restore into a new database.
- Identify the evidence needed to measure data recovery point and service recovery time.

## Scenario injects

1. At `T+0`, `/health` is live but `/health/ready` reports database down and user workflows fail.
2. At `T+5`, the database container is restarting and host disk telemetry is incomplete.
3. At `T+10`, a recent migration is reported, but its relationship to the outage is unknown.
4. At `T+20`, restart does not resolve the issue; the latest encrypted backup age and restore-verification status are provided.
5. At `T+30`, the team must choose escalation and a non-destructive recovery path.

## Expected discussion/actions

- Open `../runbooks/database-unavailable.md`, assign incident command, freeze changes, preserve evidence, and avoid `down --volumes` or destructive SQL.
- Confirm alert owner/escalation reachability and identify missing dashboards or permissions.
- State explicit go/no-go criteria for restore, new-database verification, cutover, rollback, and preservation of the old database.
- Calculate hypothetical achieved RPO/RTO only from supplied timestamps; do not claim actual objectives were met.

## Result record template

- Date/start/end:
- Participants and roles:
- Alert received by/at:
- Decisions and timestamps:
- Hypothetical recovery point and recovery time:
- Gaps/risks found:
- Follow-up action, owner, due date:
- Facilitator acknowledgement:
- Owner acknowledgement:

Blank acknowledgements mean no sign-off.
