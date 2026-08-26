# Learnspace domain model

This document maps the browser prototype types in `apps/web/src/types.ts` to the canonical PostgreSQL model. The prototype types remain UI inputs until their feature APIs are implemented; they are not persistence contracts. Server-side audit repositories and observation payload validators are intentionally introduced here as persistence-boundary groundwork and will be wired into feature request handlers in later API milestones.

## Conventions

- Database enum values use uppercase `SCREAMING_SNAKE_CASE`. Title-case text is presentation only.
- Every domain record is owned by an `Organization`. `User` and `OAuthAccount` are global identity records; organization access is granted only through an active `Membership`.
- UUIDs are opaque identifiers. Timestamps are UTC. School dates use PostgreSQL `date` values.
- Mutable aggregates keep a canonical current state and append actor-attributed `WorkflowEvent` records for transitions.
- Historical records are archived or superseded, not overwritten or silently deleted.

## Canonical enums

| Concept           | Values                                                                                                   | Prototype normalization                                                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Membership role   | `PRINCIPAL`, `DIRECTOR`, `GRADE_TEACHER`, `SUBJECT_TEACHER`, `SPECIAL_ED_TEACHER`, `SPECIALIST`          | Replaces `User.role`; GPK/coordinator duties are assignment context rather than independent identity flags.                                                                      |
| Account state     | `ACTIVE`, `DISABLED`                                                                                     | Replaces boolean active/disabled variants. A valid access path requires both an active user and active membership.                                                               |
| Attendance        | `PRESENT`, `LATE`, `SICK`, `EXCUSED_ABSENCE`, `UNEXCUSED_ABSENCE`                                        | `EXPLAINED` maps to `EXCUSED_ABSENCE`; `UNEXPLAINED` maps to `UNEXCUSED_ABSENCE`. `HOLIDAY` belongs in the academic calendar. Legacy `ABSENCE` must be classified during import. |
| Observation type  | `FEDC`, `SENSORY_PROFILE`, `SFA`                                                                         | Direct normalization.                                                                                                                                                            |
| Observation state | `PENDING`, `IN_PROGRESS`, `COMPLETED`                                                                    | Replaces duplicate title-case and uppercase forms. Completed payloads are immutable.                                                                                             |
| Workflow state    | `DRAFT`, `PRINCIPAL_REVIEW`, `COORDINATOR_REVIEW`, `DIRECTOR_APPROVAL`, `APPROVED`, `ACTIVE`, `ARCHIVED` | Replaces parallel draft/review/approval status columns.                                                                                                                          |
| Workflow action   | `SUBMITTED`, `APPROVED`, `RETURNED`, `UPDATED`, `ACTIVATED`, `ARCHIVED`                                  | `RETURNED` is an event, not a current state.                                                                                                                                     |
| Audit result      | `SUCCEEDED`, `DENIED`, `FAILED`                                                                          | Records the outcome without storing secrets or full sensitive payloads.                                                                                                          |

## Entity mapping and lifecycle

| Prototype concept                                    | Database entities                                                                                                                 | Ownership and lifecycle                                                                                                                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`                                               | `User`, `Membership`, `OAuthAccount`, `Session`                                                                                   | Identity is global; memberships belong to an organization. Sessions store only a token hash and become invalid when expired, revoked, or when the user/membership is disabled.           |
| Unit/grade/subject arrays                            | `MembershipUnit`, `MembershipGrade`, `MembershipSubject`                                                                          | Explicit scope joins owned by the same organization.                                                                                                                                     |
| `Student`                                            | `Student`, `GuardianContact`, `Enrollment`                                                                                        | Basic listings do not expose guardian contact fields. Enrollment changes create dated rows so class/year history is retained.                                                            |
| `SpecialNeedsAssignment` and assigned-student arrays | `StaffStudentAssignment`                                                                                                          | Dated staff responsibility with a role context; ended assignments remain historical.                                                                                                     |
| `AttendanceRecord`                                   | `AttendanceRecord`                                                                                                                | One record per organization, student, class, and school date. Holidays are calendar data, not student attendance.                                                                        |
| `LearningJourney`                                    | `LearningJourney`, `LearningJourneyOwner`, `LearningJourneyProject`, `LearningGoal`, `CrossCurricularConnection`, `WorkflowEvent` | Project and goal positions are unique and deterministic. Ownership must reference organization memberships.                                                                              |
| `ObservationFormDefinition`                          | `ObservationDefinition`, `ObservationAssignment`                                                                                  | Definitions are versioned and immutable once used. Assignments point to the exact definition version.                                                                                    |
| Observation records                                  | `FEDCObservation`, `SensoryProfileObservation`, `SFAObservation`                                                                  | Student, definition version, observer, dates, status, and summary scores are relational; instrument-specific answers are validated JSON. Completed records are immutable.                |
| `IEPRecord`                                          | `IEP`, `IEPTeamMember`, `IEPPerformanceArea`, `IEPAccommodation`, `IEPGoal`, `IEPServiceSchedule`, `WorkflowEvent`                | IEPs are retained after replacement. Activation does not delete or rewrite historical IEPs.                                                                                              |
| `IEPReport`                                          | `WeeklyReport`, `WeeklyGoalProgress`, `GoalAchievementEvent`, `WorkflowEvent`                                                     | Every report belongs to exactly one IEP. Composite constraints prevent progress from referencing a goal on another IEP. Goal summaries are derived from progress and achievement events. |
| `WorkflowHistoryEntry`                               | `WorkflowEvent`                                                                                                                   | Append-only transition history with actor, previous state, next state, action, time, and optional comment.                                                                               |
| Security/activity history                            | `AuditEvent`                                                                                                                      | Append-only through API repositories. Metadata is an allowlisted JSON object and must never contain credentials, session tokens, contact payloads, or full record snapshots.             |

## Allowed transitions

### Learning Journey

```text
DRAFT --SUBMITTED--> PRINCIPAL_REVIEW
PRINCIPAL_REVIEW --RETURNED--> DRAFT
PRINCIPAL_REVIEW --APPROVED--> DIRECTOR_APPROVAL
DIRECTOR_APPROVAL --RETURNED--> DRAFT
DIRECTOR_APPROVAL --APPROVED--> APPROVED
APPROVED --ARCHIVED--> ARCHIVED
```

Learning Journey return commands require reviewer feedback. The aggregate returns to editable `DRAFT`, while the immutable `WorkflowEvent.fromState` identifies whether the Principal or Director requested the revision. Clients use the latest return event to display the reviewer, stage, and comment without introducing a parallel `RETURNED` aggregate state.

### IEP

```text
DRAFT --SUBMITTED--> COORDINATOR_REVIEW
COORDINATOR_REVIEW --RETURNED--> DRAFT
COORDINATOR_REVIEW --APPROVED--> DIRECTOR_APPROVAL
DIRECTOR_APPROVAL --RETURNED--> COORDINATOR_REVIEW
DIRECTOR_APPROVAL --APPROVED--> APPROVED
APPROVED --ACTIVATED--> ACTIVE
ACTIVE --ARCHIVED--> ARCHIVED
```

Only one IEP should be active for a student and applicable period. That policy is enforced transactionally by the application because PostgreSQL partial uniqueness is not represented directly by Prisma schema syntax.

### Weekly Report

```text
DRAFT --SUBMITTED--> COORDINATOR_REVIEW
COORDINATOR_REVIEW --RETURNED--> DRAFT
COORDINATOR_REVIEW --APPROVED--> DIRECTOR_APPROVAL
DIRECTOR_APPROVAL --RETURNED--> COORDINATOR_REVIEW
DIRECTOR_APPROVAL --APPROVED--> APPROVED
```

Approved reports are immutable except through a later explicit correction/versioning workflow.

## Relational fields versus JSON

### Relational

Organization ownership, identities, memberships and scopes; academic structure; students, guardians, enrollments and staff assignments; attendance; Learning Journey owners/projects/goals/order; observation definition identity/version, assignments, observers, dates, status and summary scores; IEP team members, performance areas, accommodations, goals and services; weekly reports and goal progress; workflow, goal-achievement and audit events.

Denormalized names in prototype objects (`studentName`, `teacherName`, and similar) are response projections, not duplicate source-of-truth columns unless an explicit historical snapshot is required.

### Validated JSON initially

- Observation definition item/schema bodies.
- FEDC responses and milestone score breakdown.
- Sensory response and section score breakdown.
- SFA respondents, participation, settings, task-support, activity-performance, and adaptation payloads.
- Safe audit metadata restricted by the API allowlist.

Each observation JSON payload must be validated against the selected instrument and definition version before persistence. Summary values used for querying remain relational.

## Prototype import decisions

- Mixed title-case and uppercase statuses are normalized to the enums above.
- `Not Started`, `On Progress`, and `Done` are UI progress labels and are not workflow states.
- `HOLIDAY` is moved to future academic-calendar data.
- Ambiguous `ABSENCE` records cannot be imported until classified as excused or unexcused.
- Mutable grade/class/unit strings become relations through dated `Enrollment` records.
- Embedded `IEPGoal.addressedHistory` is not imported as a goal field; it is reconstructed as weekly progress and achievement events.
