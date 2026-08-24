# Authorization matrix

Server authorization is deny-by-default. Browser fields such as `role`, `permissions`, `isGPK`, `isSpecialEdCoordinator`, organization IDs, or actor IDs are never accepted as identity. The API loads active memberships and scopes from the authenticated PostgreSQL session.

## Canonical roles

| Product role                    | `MembershipRole`         |
| ------------------------------- | ------------------------ |
| Director                        | `DIRECTOR`               |
| Principal                       | `PRINCIPAL`              |
| Grade Teacher                   | `GRADE_TEACHER`          |
| Subject Teacher                 | `SUBJECT_TEACHER`        |
| Special Education Coordinator   | `SPECIAL_ED_COORDINATOR` |
| GPK / Special Education Teacher | `SPECIAL_ED_TEACHER`     |
| Specialist                      | `SPECIALIST`             |

`roleTitle` is display-only and must not grant permissions. GPK and coordinator behavior formerly represented by `isGPK` and `isSpecialEdCoordinator` is mapped to canonical server roles above.

## Permission matrix

Legend: **O** organization scope, **U** assigned unit, **G** assigned grade, **C** assigned class through grade/unit or an explicit future class assignment, **S** assigned subject, **A** assigned student, **—** denied.

| Capability                                   | Director | Principal | Grade Teacher | Subject Teacher | SE Coordinator | SE Teacher / GPK | Specialist |
| -------------------------------------------- | -------- | --------- | ------------- | --------------- | -------------- | ---------------- | ---------- |
| List available organizations                 | O        | O         | O             | O               | O              | O                | O          |
| Read academic years                          | O        | O         | O             | O               | —              | —                | —          |
| Read units, grades, and classes              | O        | O         | U/G/C         | —               | —              | —                | —          |
| Read subjects                                | O        | O         | —             | S               | —              | —                | —          |
| Read general student list/detail             | O        | O         | U/G/C         | —               | A              | A                | A          |
| Read attendance                              | O        | O         | G/C           | —               | A              | A                | —          |
| Write attendance                             | —        | —         | G/C           | —               | —              | —                | —          |
| Read Learning Journeys                       | O        | O         | G/C           | S/C             | A              | A                | —          |
| Write/submit Learning Journeys               | —        | —         | G/C           | S/C             | —              | —                | —          |
| Review Learning Journeys                     | —        | O         | —             | —               | —              | —                | —          |
| Approve Learning Journeys                    | O        | —         | —             | —               | —              | —                | —          |
| Read observations/IEPs/reports               | O        | O         | —             | —               | O/A            | A                | A          |
| Write special-education records              | —        | —         | —             | —               | O/A            | A                | A          |
| Review special-education workflows           | O        | O         | —             | —               | O              | —                | —          |
| Approve final special-education workflow     | O        | —         | —             | —               | —              | —                | —          |
| Export reports                               | O        | O         | —             | —               | O              | —                | —          |
| Manage organization membership/configuration | O        | —         | —             | —               | —              | —                | —          |

The initial authorization primitives expose these coarse permissions:

- `attendance:read`, `attendance:write`
- `journey:read`, `journey:write`, `journey:review`, `journey:approve`
- `special-ed:read`, `special-ed:write`, `special-ed:review`
- `report:export`
- `organization:admin`

A permission alone is insufficient. Every tenant-owned repository query must also include `organizationId`, and scoped roles must pass the applicable unit, grade, subject, class, or assigned-student check.

Academic collection and general student reads use explicit endpoint policies in addition to the coarse permission set. They do not add browser-controlled permissions: leadership is organization-wide, Grade Teachers are constrained to assigned units/grades/classes, Subject Teachers can read only assigned subjects plus organization academic-year context, and assigned-student roles can read only active dated assignments. Finer capabilities — subject/class-scoped attendance reads for Subject Teachers, team-scoped special-education reads for Grade and Subject Teachers, and separating observation writes from IEP and weekly-report writes — remain denied until those permissions are introduced.

## Scope rules

1. **Organization:** a request can act only within an active membership's `organizationId`. A client-provided organization ID is compared to the session membership; it never selects another identity.
2. **Unit and grade:** grade teachers can access records attached to their `MembershipUnit` or `MembershipGrade` assignments as required by the endpoint.
3. **Class:** until a direct membership-to-class relation exists, class access must be derived from an authorized grade/unit and the current enrollment. Never authorize by a class name supplied by the browser.
4. **Subject:** subject teachers require a matching `MembershipSubject` and any endpoint-specific class/grade relationship.
5. **Assigned student:** special-education teachers and specialists require an active `StaffStudentAssignment` for the student and appropriate `roleContext`. Dates must include the action date.
6. **Leadership:** Director and Principal organization-wide read/review powers do not imply write or approval powers not listed above.
7. **No policy:** when an endpoint or record type has no explicit rule, deny it.

## Mapping current prototype checks

| Prototype check                              | Server mapping                                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `currentUser.role === 'DIRECTOR'`            | Active `DIRECTOR` membership plus the endpoint permission and organization scope.                                     |
| `currentUser.role === 'PRINCIPAL'`           | Active `PRINCIPAL` membership plus the endpoint permission and organization scope.                                    |
| `currentUser.role === 'GRADE_TEACHER'`       | `GRADE_TEACHER` membership plus grade/unit/class scope.                                                               |
| `currentUser.role === 'SUBJECT_TEACHER'`     | `SUBJECT_TEACHER` membership plus subject and class/grade scope.                                                      |
| `currentUser.isSpecialEdCoordinator`         | Replace with `SPECIAL_ED_COORDINATOR`; the boolean is presentation compatibility only.                                |
| `currentUser.isGPK`                          | Replace with `SPECIAL_ED_TEACHER` plus active assigned-student scope; the boolean is presentation compatibility only. |
| `currentUser.permissions`                    | Display hints only. The API computes permissions from `MembershipRole`; browser permission arrays are ignored.        |
| Prototype role switcher/localStorage user ID | Development-only fake-data tool. It is unavailable in production and cannot change API identity.                      |

## Guard order

For protected operations, apply checks in this order:

1. load and validate the server-side session;
2. reject disabled users, organizations, or memberships;
3. resolve the active organization membership;
4. require the named permission;
5. apply record scope in the repository query itself;
6. perform the operation;
7. append a safe audit event for privileged success or denial.

Authorization failures should return a consistent `403` without revealing whether a record exists in another organization. Unauthenticated requests return `401`. Logs and audit metadata must omit cookies, tokens, email addresses, request payloads, and sensitive student data.
