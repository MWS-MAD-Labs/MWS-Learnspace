# PostgreSQL query-plan review template

> **Status:** Template only. Do not include production student data, credentials, cookies, or unredacted bind values in a committed report.

Copy to a dated report for each release candidate or material query change.

## Metadata

| Field                                                  | Value                                |
| ------------------------------------------------------ | ------------------------------------ |
| Candidate version / commit                             | TODO                                 |
| Reviewer and date                                      | TODO                                 |
| PostgreSQL version                                     | TODO                                 |
| Environment/hardware                                   | TODO                                 |
| Dataset generator/source                               | TODO                                 |
| Students / enrollments / observations / IEPs / reports | TODO                                 |
| Statistics refreshed with `ANALYZE`                    | TODO                                 |
| Relevant configuration differences                     | TODO                                 |
| Report status                                          | NOT STARTED / IN PROGRESS / COMPLETE |

## Method

1. Use a disposable environment containing synthetic representative data.
2. Enable query logging/instrumentation appropriate to that environment and count SQL statements for one warmed request.
3. Group normalized query fingerprints and look for a query whose count scales with returned rows (N+1).
4. Capture the exact SQL from the application path with sensitive literals replaced by typed placeholders.
5. Run `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS, FORMAT TEXT)` inside a read-only transaction when feasible.
6. Run each representative case multiple times and distinguish cold-cache from warm-cache evidence.
7. Confirm tenant/organization and authorization predicates are present; performance changes must not weaken access controls.

Example safe session:

```sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS, FORMAT TEXT)
SELECT /* sanitized representative query */ 1;
ROLLBACK;
```

`EXPLAIN ANALYZE` executes the query. Use only read-only statements in a disposable/approved environment. For mutation plans, use plain `EXPLAIN` or a disposable transaction whose rollback behavior has been verified.

## Request/query-count matrix

Budget source: `docs/performance/budgets.json`.

| Flow and endpoint            | Role/scope | Result rows | SQL count | Repeated fingerprint? | Duration p50/p95 | Budget result | Evidence |
| ---------------------------- | ---------- | ----------: | --------: | --------------------- | ---------------- | ------------- | -------- |
| Dashboard summary            | TODO       |        TODO |      TODO | TODO                  | TODO             | NOT TESTED    | TODO     |
| Attendance list/detail       | TODO       |        TODO |      TODO | TODO                  | TODO             | NOT TESTED    | TODO     |
| Learning Journey list/detail | TODO       |        TODO |      TODO | TODO                  | TODO             | NOT TESTED    | TODO     |
| Observation list/detail      | TODO       |        TODO |      TODO | TODO                  | TODO             | NOT TESTED    | TODO     |
| IEP list/detail              | TODO       |        TODO |      TODO | TODO                  | TODO             | NOT TESTED    | TODO     |
| Weekly report list/detail    | TODO       |        TODO |      TODO | TODO                  | TODO             | NOT TESTED    | TODO     |
| Search/notifications         | TODO       |        TODO |      TODO | TODO                  | TODO             | NOT TESTED    | TODO     |
| People/access administration | TODO       |        TODO |      TODO | TODO                  | TODO             | NOT TESTED    | TODO     |

## Plan review

Create one section per material query.

### Query: TODO

- Application flow/endpoint: TODO
- Sanitized SQL or fingerprint: TODO
- Bind-value shape/selectivity: TODO
- Returned rows: TODO
- Planning time / execution time: TODO
- Shared hit/read/dirtied blocks: TODO
- Temp read/write blocks: TODO
- Locks or timeout observed: TODO

Checklist:

| Check                                                       | Result     | Notes |
| ----------------------------------------------------------- | ---------- | ----- |
| Estimated rows are reasonably close to actual rows          | NOT TESTED | TODO  |
| Access path is appropriate for representative selectivity   | NOT TESTED | TODO  |
| No unexpected sequential scan of a large relation           | NOT TESTED | TODO  |
| Sort/hash operations avoid unexpected disk spill            | NOT TESTED | TODO  |
| Join order/type is stable and appropriate                   | NOT TESTED | TODO  |
| Existing index prefix/order matches predicates and ordering | NOT TESTED | TODO  |
| Pagination has a deterministic order and bounded page size  | NOT TESTED | TODO  |
| Query count does not scale per returned row                 | NOT TESTED | TODO  |
| Organization/authz predicates remain server-enforced        | NOT TESTED | TODO  |
| Plan remains acceptable for sparse and dense organizations  | NOT TESTED | TODO  |

Paste the sanitized plan or link to a protected artifact: TODO

## Findings and decisions

| ID          | Flow/query | Finding | Impact | Proposed action/index | Write/lock cost | Owner | Status |
| ----------- | ---------- | ------- | ------ | --------------------- | --------------- | ----- | ------ |
| PERF-DB-001 | TODO       | TODO    | TODO   | TODO                  | TODO            | TODO  | OPEN   |

## Conclusion

- Core list flows reviewed: TODO
- Core detail flows reviewed: TODO
- Known/suspected N+1 queries: TODO
- Budget exceptions with owners: TODO
- Reviewer conclusion: **NOT PROVIDED**
