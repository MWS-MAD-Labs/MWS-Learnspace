# Graph Report - MWS-Learnspace  (2026-10-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3193 nodes · 7214 edges · 196 communities (120 shown, 76 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 123 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f19be49b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ref_vitest
- types.ts
- HttpError
- weekly-reports-service.ts
- openapi.ts
- express
- api/observationService.ts
- packages_contracts_dist_index
- api/learningJourneyService.ts
- people.ts
- ieps-service.ts
- padding-line-between-statements.ts
- react
- apiClient.ts
- 20260819000000_initial/migration.sql
- prepare-local-import-rehearsal.ts
- utils/resource-access.ts
- aggregates.queries.ts
- shared-session-shadow-service.ts
- AppContext.tsx
- iep.ts
- "public"."Organization"
- README.md
- auth-controller.ts
- sfa.ts
- useApp
- scripts
- learning-journeys.ts
- pages/PeopleAccessView.tsx
- auth/context/AuthContext.tsx
- ObservationManagementPage.tsx
- api/iepService.ts
- anti-slop/index.ts
- fedc.ts
- observation-management.ts
- sensory-profile.ts
- oauth-service.ts
- exportFormat.ts
- weeklyReport.ts
- learning-journeys-service.ts
- 20260827050000_aggregate_search_indexes/migration.sql
- type-alias-resolution.ts
- dictionary-types.ts
- import-service.ts
- "public"."IEP"
- scripts
- "public"."protect_tenant_ownership"
- app.ts
- @testing-library/react
- permissions-cli.ts
- sensory-profile/SensoryProfileView.tsx
- "public"."Enrollment"
- no-known-value-widening.ts
- no-widen-then-assert.ts
- package.json
- aggregates.ts
- ieps-controller.ts
- authorization.ts
- ref_node_fs
- academics.ts
- web/package.json
- contracts/package.json
- audit-service.ts
- Prototype import rehearsal report — 2026-08-24 (local Docker)
- shared-session-readiness-service.ts
- compilerOptions
- organizations.ts
- attendance-service.ts
- sfa-scoring.ts
- @playwright/test
- "public"."LearningJourney"
- api/package.json
- learning-journeys-controller.ts
- "public"."validate_active_organization_user"
- external-principal-backfill-service.ts
- aggregates-router.ts
- e2e-seed.ts
- devDependencies
- compilerOptions
- no-object-parameters.ts
- read-import-file.ts
- config.ts
- fedc-scoring.ts
- sensory-profile-scoring.ts
- dependencies
- api/aggregateService.ts
- 20260827000000_iep_contracts_and_immutability/migration.sql
- no-reduce-accumulator-copy.ts
- PrincipalContextLoader
- FireAndForgetShadowObserver
- compilerOptions
- compilerOptions
- no-unsafe-dictionary-type.ts
- compilerOptions
- shared-session-readiness-cli.ts
- src/index.ts
- require-safety-comment-for-type-assertion.ts
- devDependencies
- import-service.test.ts
- devDependencies
- scripts
- 20260820000000_google_oauth_authorization/migration.sql
- learning-journey-workflow.test.ts
- p5-ieps.spec.ts
- 20260827020000_weekly_report_workflow/migration.sql
- 20260827030000_transactional_iep_goal_projections/migration.sql
- no-chained-type-assertions.ts
- dependencies
- import.ts
- iep-goal-projection-model.ts
- anti-slop Vendored Rules README
- "public"."LearningJourneyProject"
- 20260826000000_observation_management/migration.sql
- "ExternalPrincipal"
- utils/weeklyReportDates.ts
- p5-observations.spec.ts
- "ImportRun"
- p5-weekly-reports.spec.ts
- "public"."reject_event_mutation"
- "public"."protect_completed_observation"
- "public"."validate_observation_context"
- "public"."validate_scope_tenant"
- db-backup.sh
- db-restore.sh
- vite-env.d.ts
- Google OAuth configuration
- engines
- .prettierrc.json
- IEP_one_active_per_student
- e2e-attendance.sh
- e2e-p5.sh
- apps/web/index.html Entry Point
- ADR 0001: Application architecture
- Rejected: self-contained JWT access tokens as primary session
- Schema and migration strategy
- Learnspace API conventions
- Learning Journey workflow commands (submit/review/approve)
- Canonical roles (MembershipRole enum)
- Deny-by-default authorization principle
- Authorization matrix
- Permission matrix by role/scope
- Learnspace domain model
- Backup/restore safety guarantees
- learnspace-export version 1 format
- Fixed implementation decisions table
- "AttendanceRecord_context"
- "LearningJourneyOwner_membership_scope"
- "Membership_user_immutable"
- "ObservationAssignment_assignee_scope"
- "ObservationDefinition_used_immutable"
- "StaffStudentAssignment_membership_scope"
- "WeeklyReport_context"
- "WorkflowEvent_tenant"
- test-integration-local.sh
- apps_web_src_services_weeklyreportdates_isoweekfordate
- Browser/API trust boundary
- PostgreSQL ownership as system of record
- Rejected: automatic schema synchronization on API startup
- Rejected: browser direct PostgreSQL access
- Rejected: browser storage as system of record
- Rejected: prisma db push or manual production edits
- Rejected: frontend role conditionals as authorization
- Rejected: adding Redis immediately for sessions
- Rejected: rewriting the frontend during workspace conversion
- Rejected: storing roles/identity claims in the session cookie
- Rejected: single frontend package with ad hoc server files
- Workspace layout and ownership
- Attendance optimistic concurrency (version derivation)
- Standard API error envelope
- OpenAPI generation from Zod schemas
- Authorization guard order
- Scope rules (organization/unit/grade/class/subject/student)
- OAuth verification checklist
- Entity mapping and lifecycle table
- Relational fields versus validated JSON fields
- Weekly Report allowed transitions
- Organization timezone backfill
- Rehearsal procedure (freeze, backup, dry run, apply, reconcile, rollback)
- Weekly-report ISO week normalization migration
- AI-executable production backlog (ROADMAP.md)
- Milestone 0 — Reproducible prototype baseline
- Milestone 1 — Workspace, API, and local Docker stack
- Milestone 2 — Prisma schema and database lifecycle
- Milestone 3 — Google OAuth and server-side authorization
- Milestone 4 — Versioned API and attendance vertical slice
- Milestone 5 — Migrate remaining product domains
- Milestone 8 — Stable self-hosted release
- P6-002 — Add a development-only browser export tool
- Production-ready definition checklist
- API versioning policy
- Conventional Commits convention
- Expand-and-contract migration phases
- Release identifiers (alpha/beta/rc)
- "public"."WeeklyReport"
- "public"."LearningJourney"

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 85 edges
2. `express` - 66 edges
3. `useApp()` - 53 edges
4. `SessionService` - 50 edges
5. `react` - 41 edges
6. `scripts` - 39 edges
7. `isRequestCancelled()` - 37 edges
8. `createCsrfProtection()` - 36 edges
9. `createAuditService()` - 35 edges
10. `parseRequest()` - 35 edges

## Surprising Connections (you probably didn't know these)
- `Done, Commit, Next Skill Workflow` --semantically_similar_to--> `CI validate job`  [INFERRED] [semantically similar]
  .done-commit-next-SKILL.md → .github/workflows/ci.yml
- `compose.dev.yaml db override (publish 5432)` --semantically_similar_to--> `compose.import-local.yaml db override (publish 55432)`  [INFERRED] [semantically similar]
  compose.dev.yaml → compose.import-local.yaml
- `Done, Commit, Next Skill Workflow` --semantically_similar_to--> `Conventional Commit-style Messages`  [INFERRED] [semantically similar]
  .done-commit-next-SKILL.md → CONTRIBUTING.md
- `Student_fullName_trgm_idx` --indexes--> `Student`  [EXTRACTED]
  prisma/migrations/20260827050000_aggregate_search_indexes/migration.sql → apps/web/src/types.ts
- `Student_nickname_trgm_idx` --indexes--> `Student`  [EXTRACTED]
  prisma/migrations/20260827050000_aggregate_search_indexes/migration.sql → apps/web/src/types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Prototype import rehearsal and rollback documentation pipeline** — docs_operations_prototype_import_rollout_doc, docs_operations_backup_and_restore_doc, docs_operations_prototype_import_rehearsal_2026_08_24_local_doc, docs_operations_prototype_import_rehearsal_template_doc [EXTRACTED 1.00]
- **Shared aggregate + append-only WorkflowEvent transition pattern** — docs_domain_model_learning_journey_transitions, docs_domain_model_iep_transitions, docs_domain_model_weekly_report_transitions, docs_api_conventions_learning_journey_workflow_commands [INFERRED 0.80]
- **Attendance E2E Compose Pipeline (CI-Driven)** — _github_workflows_ci_attendance_e2e_job, compose_e2e_db_service, compose_e2e_migrate_service, compose_e2e_fixture_service, compose_e2e_api_service, compose_e2e_web_service [INFERRED 0.85]
- **PostgreSQL db Service Pattern Across Compose Files** — compose_db_service, compose_dev_db_service, compose_e2e_db_service, compose_integration_db_service, compose_import_local_db_service [INFERRED 0.85]
- **Pre-merge Validation Command Set (format/lint/typecheck/test/build)** — _github_workflows_ci_validate_job, _github_pull_request_template_document, contributing_document [INFERRED 0.85]
- **Server-side trust boundary and deny-by-default enforcement pattern** — docs_adr_0001_application_architecture_browser_api_trust_boundary, docs_auth_authorization_matrix_doc, docs_auth_google_oauth_doc, docs_api_conventions_doc [INFERRED 0.85]

## Communities (196 total, 76 thin omitted)

### Community 0 - "ref_vitest"
Cohesion: 0.04
Nodes (66): createDatabase(), IncompatibleDatabaseSchemaError, PrismaDatabaseClient, ReadinessTransaction, requiredMigration, DEFAULT_GPK_MAX_CASELOAD, SessionService, authenticatedCookie() (+58 more)

### Community 1 - "types.ts"
Cohesion: 0.04
Nodes (70): ObservationReferenceDrawer, FEDCObservationReference, observationService, SFAObservationCommand, SFAObservationReference, FEDCObservationView(), Props, provisionalScores() (+62 more)

### Community 2 - "HttpError"
Cohesion: 0.09
Nodes (58): createFedcObservationsController(), createObservationAssignmentDeleteController(), createObservationAssignmentsController(), createObservationDefinitionsController(), createSensoryProfileObservationsController(), createSfaObservationsController(), HttpError, FedcObservationRow (+50 more)

### Community 3 - "weekly-reports-service.ts"
Cohesion: 0.05
Nodes (66): createWeeklyReportController(), decision(), organizationPathSchema, reportPathSchema, requireAuth(), mapWeeklyReport(), weeklyReportDate(), weeklyReportGoalProgressData() (+58 more)

### Community 4 - "openapi.ts"
Cohesion: 0.05
Nodes (64): arrayLimits(), assignmentParameter, classParameter, collectionOperation(), components, csrfParameter, definitionParameter, errorResponses (+56 more)

### Community 5 - "express"
Cohesion: 0.10
Nodes (36): DatabaseClient, createCsrfProtection(), createRequiredAuthentication(), safeError(), createAttendanceRouter(), createAuthRouter(), createGpkRouter(), createIepRouter() (+28 more)

### Community 6 - "api/observationService.ts"
Cohesion: 0.06
Nodes (56): ApiAssignment, ApiDefinition, asRecord(), booleanValue(), ContractSchemas, dateOnly(), fallbackFedcCommandSchema, fallbackFedcObservationsResponseSchema (+48 more)

### Community 7 - "packages_contracts_dist_index"
Cohesion: 0.07
Nodes (48): aggregateOrganizationId(), organizationPathSchema, createAttendanceController(), requireAuth(), createGpkController(), createOrganizationAccountsController(), createOrganizationsController(), organizationPath (+40 more)

### Community 8 - "api/learningJourneyService.ts"
Cohesion: 0.06
Nodes (40): LearningJourneyCalendar, LearningJourneyStatusTracker, journeyCommand(), learningJourneyService, mapJourneyToLegacy(), monthBoundary(), monthIndexes, monthLabel() (+32 more)

### Community 9 - "people.ts"
Cohesion: 0.03
Nodes (58): accountStatusSchema, activeGpkAssignmentSummarySchema, AttendanceBulkSaveCommand, attendanceBulkSaveCommandSchema, AttendanceBulkSaveResponse, attendanceBulkSaveResponseSchema, AttendanceQuery, attendanceQuerySchema (+50 more)

### Community 10 - "ieps-service.ts"
Cohesion: 0.07
Nodes (49): iepDate(), IepListRow, iepListSelect, IepRow, iepSelect, IepWorkflowEvent, isoDate(), mapIep() (+41 more)

### Community 11 - "padding-line-between-statements.ts"
Cohesion: 0.06
Nodes (47): isClosingBraceToken(), isFunction(), isNotSemicolonToken(), isParenthesized(), isSemicolonToken(), isSingleLine(), isTokenOnSameLine(), isTopLevelExpressionStatement() (+39 more)

### Community 12 - "react"
Cohesion: 0.07
Nodes (38): WeeklyReportView, StatusBadge(), StatusBadgeProps, iepService, IEPStatusTracker(), IEPStatusTrackerProps, errorMessage(), LoadStatus (+30 more)

### Community 13 - "apiClient.ts"
Cohesion: 0.06
Nodes (38): AttendancePage, attendanceService, AttendancePage(), displaySchoolDate(), DraftMap, DraftRecord, draftsFromRoster(), errorMessage() (+30 more)

### Community 14 - "20260819000000_initial/migration.sql"
Cohesion: 0.07
Nodes (44): "AttendanceRecord_class_tenant", "AttendanceRecord_enrollment_tenant", "AttendanceRecord_student_tenant", "Enrollment_class_tenant", "Enrollment_student_tenant", "Enrollment_year_tenant", "FEDCObservation_assignment_tenant", "FEDCObservation_definition_tenant" (+36 more)

### Community 15 - "prepare-local-import-rehearsal.ts"
Cohesion: 0.07
Nodes (32): LegacyExportTool(), buildLegacyExport(), downloadLegacyExport(), JSON_COLLECTION_KEYS, LEGACY_STORAGE_KEYS, LegacyExportError, parseCollection(), uniqueStrings() (+24 more)

### Community 16 - "utils/resource-access.ts"
Cohesion: 0.10
Nodes (37): createAcademicsController(), activeGpkAssignmentSelect(), GPK_ROLE_CONTEXT, gpkAssignmentSelect, mapGpkAssignment(), SelectedGpkAssignment, enrollmentSelect(), mapStudent() (+29 more)

### Community 17 - "aggregates.queries.ts"
Cohesion: 0.12
Nodes (35): mapObservationAggregate(), ObservationGroups, createDashboardQueryService(), DashboardQueryService, createNotificationsQueryService(), NotificationsQueryService, createOrganizationsService(), createReportingQueryService() (+27 more)

### Community 18 - "shared-session-shadow-service.ts"
Cohesion: 0.07
Nodes (34): main(), loadConfig(), createLogger(), scheduleAuthCleanup(), createSharedSessionAuthentication(), knownPermissions, knownRoles, membershipSelect (+26 more)

### Community 19 - "AppContext.tsx"
Cohesion: 0.08
Nodes (32): AdministrationDataStatus, administrationErrorMessage(), useAuthorizedDirectory(), activeTabForPath(), instrumentFrom(), NavigationTab, ObservationManageTab, routeParam() (+24 more)

### Community 20 - "iep.ts"
Cohesion: 0.05
Nodes (42): accommodationWriteSchema, actorSchema, addUniquePositions(), goalWriteSchema, Iep, iepAccommodationCategorySchema, iepAccommodationSchema, IepCreateCommand (+34 more)

### Community 21 - ""public"."Organization""
Cohesion: 0.07
Nodes (44): AuditEvent_organizationId_occurredAt_idx, AuditEvent_organizationId_targetType_targetId_occurredAt_idx, AuditEvent_requestId_idx, FEDCObservation_assignmentId_key, FEDCObservation_organizationId_studentId_observationDate_idx, GuardianContact_organizationId_studentId_idx, Membership_organizationId_role_status_idx, Membership_organizationId_userId_key (+36 more)

### Community 22 - "README.md"
Cohesion: 0.08
Nodes (39): Done, Commit, Next Skill Workflow, .env.example (Safe Environment Template), Pull Request Template, CI attendance-e2e job, CI validate job, CI Workflow (GitHub Actions), .nvmrc (Pinned Node.js Version), apps/api/Dockerfile (Multi-stage: runtime/migration targets) (+31 more)

### Community 23 - "auth-controller.ts"
Cohesion: 0.10
Nodes (27): createAuthController(), secureCookies(), sessionPayload(), sharedSessionPayload(), createTestAuthController(), e2eAuthHeaderName, e2eAuthUserHeaderName, AppConfig (+19 more)

### Community 24 - "sfa.ts"
Cohesion: 0.05
Nodes (39): sfaActivityPerformanceCommandSchema, SfaActivityPerformanceRating, sfaActivityPerformanceRatingSchema, sfaAdaptationsCommandSchema, SfaDefinitionBody, sfaDefinitionBodySchema, sfaDefinitionItemSchema, sfaDefinitionProjectionSchema (+31 more)

### Community 25 - "useApp"
Cohesion: 0.11
Nodes (24): ApplicationLayout(), IEPPlanView, LearningJourneyEditor, ReportsAnalyticsView, ToastContainer(), AppShell(), useApp(), LoadStatus (+16 more)

### Community 26 - "scripts"
Cohesion: 0.05
Nodes (39): scripts, build, clean, db:backfill-central-principals, db:backup, db:import, db:import:prepare-local, db:migrate:deploy (+31 more)

### Community 27 - "learning-journeys.ts"
Cohesion: 0.05
Nodes (37): addUniquePositionIssues(), connectionCommandSchema, learningJourneyBaseSchema, learningJourneyCollectionItemSchema, learningJourneyConnectionSchema, LearningJourneyCreateCommand, learningJourneyCreateCommandSchema, learningJourneyDecisionFields (+29 more)

### Community 28 - "pages/PeopleAccessView.tsx"
Cohesion: 0.07
Nodes (28): PeopleAccessView, apps_web_src_context_authcontext_useauth, organizationAdministrationService, Account, emptyForm, Feedback, formForAccount(), FormState (+20 more)

### Community 29 - "auth/context/AuthContext.tsx"
Cohesion: 0.10
Nodes (26): ProtectedLayout(), authService, sharedRestoreUrl(), BrowserSessionLifecycle, fullCurrentRoute(), goToHub(), noOpBrowserSessionLifecycle, sharedBrowserSessionLifecycle (+18 more)

### Community 30 - "ObservationManagementPage.tsx"
Cohesion: 0.09
Nodes (25): ObservationPage, definitionCreateCommand(), definitionVersionCommand(), errorMessage(), ObservationDataStatus, useObservationData(), CoordinatorTab, ObservationManagementPage() (+17 more)

### Community 31 - "api/iepService.ts"
Cohesion: 0.13
Nodes (32): accommodationCommand(), accommodations(), arrayValue(), asRecord(), booleanValue(), commandFor(), ContractSchemas, dateOnly() (+24 more)

### Community 32 - "anti-slop/index.ts"
Cohesion: 0.10
Nodes (25): @oxlint/plugins, antiSlopPlugin, noArrayFilterMapRule, isConditionalEmptyObjectSpread(), isEmptyObjectExpression(), noConditionalEmptyObjectSpreadRule, unwrapParentheses(), importedName() (+17 more)

### Community 33 - "fedc.ts"
Cohesion: 0.06
Nodes (33): FedcDefinitionBody, fedcDefinitionBodySchema, fedcDefinitionItemSchema, fedcDefinitionMilestoneSchema, fedcDefinitionProjectionSchema, fedcMilestoneScoresSchema, FedcObservation, FedcObservationCompleteCommand (+25 more)

### Community 34 - "observation-management.ts"
Cohesion: 0.10
Nodes (31): strictBooleanSchema, jsonPrimitiveSchema, JsonValue, jsonValueSchema, observationAssigneeSummarySchema, ObservationAssignment, ObservationAssignmentCancelCommand, observationAssignmentCancelCommandSchema (+23 more)

### Community 35 - "sensory-profile.ts"
Cohesion: 0.06
Nodes (32): observationPersonSummarySchema, studentSummarySchema, SensoryProfileDefinitionBody, sensoryProfileDefinitionBodySchema, sensoryProfileDefinitionItemSchema, sensoryProfileDefinitionProjectionSchema, sensoryProfileDraftWriteFields, SensoryProfileObservation (+24 more)

### Community 36 - "oauth-service.ts"
Cohesion: 0.12
Nodes (18): GoogleClaims, googleJwks, isUniqueConstraintError(), normalizeRedirectPath(), OAuthContext, OAuthDeniedError, OAuthService, verifyGoogleIdToken() (+10 more)

### Community 37 - "exportFormat.ts"
Cohesion: 0.06
Nodes (30): addDuplicateIssues(), dateSchema, dateTimeSchema, LEARNSPACE_EXPORT_FORMAT, LEARNSPACE_EXPORT_LIMITS, LEARNSPACE_EXPORT_MAX_BYTES, LEARNSPACE_EXPORT_VERSION, LearnspaceExport (+22 more)

### Community 38 - "weeklyReport.ts"
Cohesion: 0.08
Nodes (31): packages_contracts_src_resources_collectionmetaschema, packages_contracts_src_resources_schooldateschema, packages_contracts_src_resources_staffmembershiproleschema, packages_contracts_src_resources_uuidschema, packages_contracts_src_resources_workflowstateschema, actorSchema, isoWeekForDate(), isoWeekMonday() (+23 more)

### Community 39 - "learning-journeys-service.ts"
Cohesion: 0.13
Nodes (27): isoDate(), learningJourneyDate(), learningJourneySelect, LearningJourneyWorkflowEvent, mapLearningJourney(), nestedLearningJourneyProjects(), actorMembershipId(), createLearningJourneyService() (+19 more)

### Community 40 - "20260827050000_aggregate_search_indexes/migration.sql"
Cohesion: 0.10
Nodes (27): apps_web_src_services_weeklyreportservice_weeklyreport, IEPGoal, LearningJourney, "IEP", "ObservationAssignment", "prevent_non_draft_weekly_report_change", WeeklyReport_organizationId_studentId_year_weekNumber_key, "WeeklyReport_prevent_non_draft_update" (+19 more)

### Community 41 - "type-alias-resolution.ts"
Cohesion: 0.11
Nodes (25): FunctionWithReturnType, noUnknownReturnsRule, noUnknownTypeAliasesRule, collectInferTypeParameterNames(), isNode(), lexicalTypeParameterNames(), VisitorKeys, aliasSubstitutions() (+17 more)

### Community 42 - "dictionary-types.ts"
Cohesion: 0.18
Nodes (27): aliasSubstitution(), BUILT_INS, classifyAliasBroadTarget(), classifyWideningTarget(), createTypeEnvironment(), declaredStatement(), dictionaryValueTypes(), hasBroadRecordKey() (+19 more)

### Community 43 - "import-service.ts"
Cohesion: 0.16
Nodes (25): addCount(), addRepeatSkips(), dateOnly(), dateTime(), findImportRun(), gender(), importExport(), jsonValue() (+17 more)

### Community 44 - ""public"."IEP""
Cohesion: 0.09
Nodes (26): GoalAchievementEvent_organizationId_goalId_occurredAt_idx, IEP_organizationId_academicYearId_idx, IEP_organizationId_studentId_state_idx, IEPAccommodation_iepId_category_position_key, IEPGoal_id_iepId_key, IEPGoal_iepId_code_key, IEPGoal_iepId_position_key, IEPPerformanceArea_iepId_position_key (+18 more)

### Community 45 - "scripts"
Cohesion: 0.08
Nodes (24): scripts, build, db:backfill-central-principals, db:import, db:migrate:deploy, db:migrate:dev, db:migrate:status, db:seed (+16 more)

### Community 46 - ""public"."protect_tenant_ownership""
Cohesion: 0.08
Nodes (24): "AcademicYear_tenant_immutable", "AttendanceRecord_tenant_immutable", "AuditEvent_tenant_immutable", "Enrollment_tenant_immutable", "FEDCObservation_tenant_immutable", "GoalAchievementEvent_tenant_immutable", "Grade_tenant_immutable", "GuardianContact_tenant_immutable" (+16 more)

### Community 47 - "app.ts"
Cohesion: 0.16
Nodes (16): AppDependencies, createApp(), Database, LogFields, Logger, LogLevel, priorities, createErrorMiddleware() (+8 more)

### Community 48 - "@testing-library/react"
Cohesion: 0.09
Nodes (17): App(), ApplicationErrorBoundary, authLogin, dashboard, session, backToHub, currentGradeIds, currentPermissions (+9 more)

### Community 49 - "permissions-cli.ts"
Cohesion: 0.16
Nodes (15): Mode, normalizeCentralApiBaseUrl(), parsePermissionArguments(), PermissionCliArguments, PermissionClient, PermissionCliEnvironment, PermissionCliOutput, printCheck() (+7 more)

### Community 50 - "sensory-profile/SensoryProfileView.tsx"
Cohesion: 0.12
Nodes (18): SensoryObservationCommand, SensoryObservationReference, fallbackSensoryDefinitionBodySchema, pinnedSections(), Props, provisionalScores(), SensoryContractSchemas, SensoryProfileView() (+10 more)

### Community 51 - ""public"."Enrollment""
Cohesion: 0.10
Nodes (22): AttendanceRecord_organizationId_schoolDate_classId_idx, AttendanceRecord_organizationId_studentId_classId_schoolDat_key, AttendanceRecord_organizationId_studentId_schoolDate_idx, Enrollment_organizationId_classId_startsOn_endsOn_idx, Enrollment_organizationId_studentId_startsOn_endsOn_idx, Enrollment_studentId_academicYearId_classId_startsOn_key, Grade_organizationId_code_key, Grade_organizationId_unitId_idx (+14 more)

### Community 52 - "no-known-value-widening.ts"
Cohesion: 0.19
Nodes (19): annotationTarget(), FunctionExpression, functionName(), hasInformativeType(), hasKnownCallArgumentEvidence(), hasKnownEvidence(), isDictionaryAccumulatorTarget(), isEmptyObjectExpression() (+11 more)

### Community 53 - "no-widen-then-assert.ts"
Cohesion: 0.23
Nodes (21): assertedExpression(), assertionFromExpression(), assertionIsNarrower(), BroadTypeKind, functionBoundary(), functionBoundaryTypes, isBroadRecordKeyType(), isBroadRecordType() (+13 more)

### Community 54 - "package.json"
Cohesion: 0.12
Nodes (17): prisma, dependencies, @prisma/client, @prisma/client, name, private, type, version (+9 more)

### Community 55 - "aggregates.ts"
Cohesion: 0.10
Nodes (19): AggregateNotification, aggregateNotificationSchema, AggregateNotificationsResponse, aggregateNotificationsResponseSchema, AggregateSearchItem, aggregateSearchItemSchema, AggregateSearchQuery, aggregateSearchQuerySchema (+11 more)

### Community 56 - "ieps-controller.ts"
Cohesion: 0.13
Nodes (17): createIepController(), iepPathSchema, organizationPathSchema, requireAuth(), IepService, command(), ids, iepMembershipFor() (+9 more)

### Community 57 - "authorization.ts"
Cohesion: 0.21
Nodes (14): CreateAuditEventInput, teacher, attendanceMembershipFor(), deny(), leadershipRoles, requireAttendanceClassScope(), AuditAppender, AuthorizationDeniedError (+6 more)

### Community 58 - "ref_node_fs"
Cohesion: 0.13
Nodes (10): temporaryDirectories, root, temporaryDirectories, allowedLegacyReaders, sensitiveLegacyKeys, sourceExtensions, sourceRoot, ref_node_fs (+2 more)

### Community 59 - "academics.ts"
Cohesion: 0.11
Nodes (18): academicYearSchema, AcademicYearsResponse, academicYearsResponseSchema, ClassesResponse, classesResponseSchema, classSchema, gradeSchema, GradesResponse (+10 more)

### Community 60 - "web/package.json"
Cohesion: 0.12
Nodes (15): mws-central-auth, vitest, zod, name, private, type, version, jsdom (+7 more)

### Community 61 - "contracts/package.json"
Cohesion: 0.11
Nodes (17): typescript, dependencies, zod, devDependencies, typescript, exports, files, zod (+9 more)

### Community 62 - "audit-service.ts"
Cohesion: 0.14
Nodes (13): mapOrganizationAccount(), organizationAccountSelect, SelectedOrganizationAccount, AuditMetadata, auditMetadataSchema, AuditResultValue, fieldName, safeText (+5 more)

### Community 63 - "Prototype import rehearsal report — 2026-08-24 (local Docker)"
Cohesion: 0.13
Nodes (18): Docker Compose services (web/api/db), Prototype data migration approach, npm run db:backup script, npm run db:restore script, PostgreSQL backup and restore runbook, Prototype import rehearsal report — 2026-08-24 (local Docker), Prototype import rehearsal template, Administrative importer CLI (db:import) (+10 more)

### Community 64 - "shared-session-readiness-service.ts"
Cohesion: 0.17
Nodes (12): increment(), inspectSharedSessionReadiness(), ReadinessPrisma, SharedSessionReadinessCounts, SharedSessionReadinessReasonCode, sharedSessionReadinessReasonCodes, SharedSessionReadinessReport, compareCentralAuthorization() (+4 more)

### Community 65 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+8 more)

### Community 66 - "organizations.ts"
Cohesion: 0.14
Nodes (15): collectionMetaSchema, nullableTrimmedText(), schoolDateSchema, uuidSchema, ianaTimezoneSchema, OrganizationSchoolDateResponse, organizationSchoolDateResponseSchema, OrganizationSettingsResponse (+7 more)

### Community 67 - "attendance-service.ts"
Cohesion: 0.22
Nodes (11): AttendanceClass, attendanceClassSelect, AttendanceRecords, AttendanceRoster, attendanceRosterSelect, attendanceVersion(), mapAttendanceRoster(), createAttendanceService() (+3 more)

### Community 68 - "sfa-scoring.ts"
Cohesion: 0.18
Nodes (13): completeInput, definitionBody, parseDefinition(), parseResponses(), scoreSfaResponses(), SfaScoringError, packages_contracts_dist_index_schooldateschema, packages_contracts_dist_index_sfaactivityperformancecommandschema (+5 more)

### Community 69 - "@playwright/test"
Cohesion: 0.13
Nodes (4): fixture, fixture, fixture, @playwright/test

### Community 70 - ""public"."LearningJourney""
Cohesion: 0.14
Nodes (15): AcademicYear_organizationId_name_key, AcademicYear_organizationId_startsOn_endsOn_idx, LearningJourney_organizationId_academicYearId_semesterId_gr_key, LearningJourney_organizationId_state_idx, "public"."AcademicYear", "public"."LearningJourney", "public"."LearningJourneyOwner", "public"."MembershipSubject" (+7 more)

### Community 71 - "api/package.json"
Cohesion: 0.14
Nodes (13): @learnspace/contracts, @types/node, vitest, zod, main, name, private, type (+5 more)

### Community 72 - "learning-journeys-controller.ts"
Cohesion: 0.18
Nodes (10): createLearningJourneyController(), journeyPathSchema, organizationPathSchema, requireAuth(), LearningJourneyRow, LearningJourneyService, packages_contracts_dist_index_learningjourneydetailresponseschema, packages_contracts_dist_index_learningjourneydirectorreviewcommandschema (+2 more)

### Community 73 - ""public"."validate_active_organization_user""
Cohesion: 0.14
Nodes (14): "AttendanceRecord_recorder_membership", "AuditEvent_actor_membership", "FEDCObservation_observer_membership", "GoalAchievementEvent_actor_membership", "IEP_creator_membership", "IEP_updater_membership", "LearningJourney_creator_membership", "LearningJourney_updater_membership" (+6 more)

### Community 74 - "external-principal-backfill-service.ts"
Cohesion: 0.23
Nodes (9): parseBackfillArguments(), runExternalPrincipalBackfillCli(), backfillConflictCodes, backfillExternalPrincipals(), BackfillReport, ConflictCode, increment(), normalizeEmail() (+1 more)

### Community 75 - "aggregates-router.ts"
Cohesion: 0.31
Nodes (7): aggregateRequestContext(), createDashboardController(), createNotificationsController(), createReportingController(), createAggregateRouter(), expectedRoutes, RouterLayer

### Community 76 - "e2e-seed.ts"
Cohesion: 0.24
Nodes (9): assertSeedAllowed(), seedEnvironmentSchema, e2eFixture, main(), seedE2eDatabase(), sfaDefinitionBody, main(), seedDatabase() (+1 more)

### Community 77 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-unused-imports, oxlint, @oxlint/plugins (+5 more)

### Community 78 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, declaration, declarationMap, module, moduleResolution, outDir, rootDir, skipLibCheck (+4 more)

### Community 79 - "no-object-parameters.ts"
Cohesion: 0.29
Nodes (10): typePredicateSubjectIndex(), noObjectParametersRule, ParameterOwner, isTypePredicateSubject(), noUnknownParametersRule, ParameterOwner, containsUnknownType(), FunctionParameter (+2 more)

### Community 80 - "read-import-file.ts"
Cohesion: 0.32
Nodes (8): Arguments, parseImportArguments(), runImportCli(), valid, parseJson(), readExportFile(), readImportManifest(), packages_contracts_dist_index_learnspace_export_max_bytes

### Community 81 - "config.ts"
Cohesion: 0.18
Nodes (9): booleanString, isValidCentralApiUrl(), logLevels, optionalString, optionalUrl, optionalUuid, placeholderValues, rawEnvironmentSchema (+1 more)

### Community 82 - "fedc-scoring.ts"
Cohesion: 0.23
Nodes (9): definition, FedcScoringError, parseDefinition(), ratingScores, scoreFedcResponses(), packages_contracts_dist_index_fedcdefinitionbody, packages_contracts_dist_index_fedcrating, packages_contracts_dist_index_fedcresponsescommandschema (+1 more)

### Community 83 - "sensory-profile-scoring.ts"
Cohesion: 0.24
Nodes (9): definitionBody, parseDefinition(), scoreSensoryProfileResponses(), sectionKeys, SensoryProfileScoringError, packages_contracts_dist_index_sensoryprofiledefinitionbody, packages_contracts_dist_index_sensoryprofiledefinitionbodyschema, packages_contracts_dist_index_sensoryprofileresponsescommandschema (+1 more)

### Community 84 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @learnspace/contracts, lucide-react, motion, mws-central-auth, react, react-dom, react-router-dom (+4 more)

### Community 85 - "api/aggregateService.ts"
Cohesion: 0.18
Nodes (9): aggregateService, packages_contracts_dist_index_aggregatenotificationsresponse, packages_contracts_dist_index_aggregatenotificationsresponseschema, packages_contracts_dist_index_aggregatesearchresponse, packages_contracts_dist_index_aggregatesearchresponseschema, packages_contracts_dist_index_dashboardsummaryresponse, packages_contracts_dist_index_dashboardsummaryresponseschema, packages_contracts_dist_index_reportingaggregateresponse (+1 more)

### Community 86 - "20260827000000_iep_contracts_and_immutability/migration.sql"
Cohesion: 0.23
Nodes (10): "IEP_historical_immutable", "IEPAccommodation_historical_immutable", "IEPGoal_historical_immutable", "IEPPerformanceArea_historical_immutable", "IEPServiceSchedule_historical_immutable", "IEPTeamMember_historical_immutable", "public"."protect_historical_iep_child"(), "public"."IEP" (+2 more)

### Community 87 - "no-reduce-accumulator-copy.ts"
Cohesion: 0.45
Nodes (9): enclosingReducer(), isGlobalCopyOwner(), noReduceAccumulatorCopyRule, referencesAccumulator(), arrayMethodTarget(), isArrayAnnotation(), isKnownArrayExpression(), resolveArrayBinding() (+1 more)

### Community 88 - "PrincipalContextLoader"
Cohesion: 0.22
Nodes (5): CentralEntitlementClient, PrincipalContextLoader, entitlement(), loader(), membership()

### Community 90 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noEmit, skipLibCheck, strict (+2 more)

### Community 91 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, declaration, noEmit, outDir, rootDir, sourceMap, exclude, extends (+2 more)

### Community 92 - "no-unsafe-dictionary-type.ts"
Cohesion: 0.33
Nodes (10): isInsideTypeAliasDeclaration(), isInsideTypeParameterConstraint(), isPlainAliasConsumerUse(), isTypeNode(), noUnsafeDictionaryTypeRule, shouldReportType(), typeNodeKinds, typeReferenceName() (+2 more)

### Community 93 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 94 - "shared-session-readiness-cli.ts"
Cohesion: 0.27
Nodes (6): parseSharedSessionReadinessArguments(), ReadinessEnvironment, ReadinessOutput, runSharedSessionReadinessCli(), environment, ref_mws_central_auth

### Community 95 - "src/index.ts"
Cohesion: 0.20
Nodes (9): ApiError, apiErrorSchema, CurrentSessionResponse, currentSessionResponseSchema, HealthResponse, healthResponseSchema, membershipRoleSchema, VersionResponse (+1 more)

### Community 96 - "require-safety-comment-for-type-assertion.ts"
Cohesion: 0.31
Nodes (9): commentOwnerKinds, configuredSafetyMarkers(), DEFAULT_SAFETY_MARKERS, hasSafetyComment(), hasSafetyJustificationBefore(), isConstAssertion(), markerPattern(), requireSafetyCommentForTypeAssertionRule (+1 more)

### Community 97 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, prisma, supertest, tsx, @types/express, @types/node, @types/supertest, typescript (+1 more)

### Community 98 - "import-service.test.ts"
Cohesion: 0.25
Nodes (6): document, manifest, ImportManifest, importManifestSchema, uuidMapSchema, uuidSchema

### Community 99 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, jsdom, @testing-library/jest-dom, @testing-library/react, @types/node, @types/react, @types/react-dom, typescript (+1 more)

### Community 100 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, prebuild, pretest, pretypecheck, preview, test (+1 more)

### Community 101 - "20260820000000_google_oauth_authorization/migration.sql"
Cohesion: 0.33
Nodes (8): OAuthLoginTransaction_expiresAt_consumedAt_idx, OAuthLoginTransaction_stateHash_key, "public"."OAuthLoginTransaction", "public"."UserInvitation", "public"."User", UserInvitation_email_expiresAt_acceptedAt_idx, UserInvitation_organizationId_email_idx, "public"."Organization"

### Community 102 - "learning-journey-workflow.test.ts"
Cohesion: 0.32
Nodes (7): JourneyTransition, transitionJourney(), journeyRow(), membership, run(), transactionFor(), validTransitions

### Community 104 - "20260827020000_weekly_report_workflow/migration.sql"
Cohesion: 0.25
Nodes (4): "WeeklyReport_prevent_non_draft_update", "WorkflowEvent_prevent_weekly_report_history_change", "public"."prevent_non_draft_weekly_report_change", "public"."prevent_weekly_report_workflow_event_change"

### Community 105 - "20260827030000_transactional_iep_goal_projections/migration.sql"
Cohesion: 0.29
Nodes (7): GoalAchievementEvent_weeklyReportId_goalId_sourceReportVersion_key, IEPGoal_achievedEventId_key, "public"."protect_historical_iep_child"(), "public"."IEP", "public"."WeeklyReport", "public"."GoalAchievementEvent", "public"."IEPGoal"

### Community 106 - "no-chained-type-assertions.ts"
Cohesion: 0.46
Nodes (7): isConstAssertion(), isForbiddenAssertionChain(), isOutermostAssertionInChain(), isTypeAssertionExpression(), noChainedTypeAssertionsRule, TypeAssertionExpression, unwrapParenthesizedExpression()

### Community 107 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, express, jose, @learnspace/contracts, mws-central-auth, @prisma/client, zod

### Community 108 - "import.ts"
Cohesion: 0.29
Nodes (5): DryRunRollback, ImportCounts, ImportMode, ImportReport, packages_contracts_dist_index_learnspaceexportv1

### Community 109 - "iep-goal-projection-model.ts"
Cohesion: 0.53
Nodes (4): AchievementSource, appendReportAchievementEvents(), projectIepGoals(), utcDate()

### Community 110 - "anti-slop Vendored Rules README"
Cohesion: 0.33
Nodes (6): oxlint.config.ts jsPlugins Registration, anti-slop Vendored Rules README, Vendoring Pattern (Effect-specific rules/tests omitted), Vendored padding-line-between-statements Upstream Notes, Local Adaptations for Oxlint Compatibility, require-readable-spacing Oxlint Rule Policy

### Community 111 - ""public"."LearningJourneyProject""
Cohesion: 0.33
Nodes (6): CrossCurricularConnection_projectId_position_key, LearningGoal_projectId_position_key, LearningJourneyProject_learningJourneyId_position_key, "public"."CrossCurricularConnection", "public"."LearningGoal", "public"."LearningJourneyProject"

### Community 112 - "20260826000000_observation_management/migration.sql"
Cohesion: 0.33
Nodes (5): ObservationAssignment_cancelledById_idx, "ObservationAssignment_canceller_membership", "public"."User", "public"."validate_active_organization_user", "public"."ObservationAssignment"

### Community 113 - ""ExternalPrincipal""
Cohesion: 0.53
Nodes (5): "ExternalPrincipal", ExternalPrincipal_issuer_subject_key, ExternalPrincipal_userId_idx, ExternalPrincipal_userId_issuer_key, "User"

### Community 114 - "utils/weeklyReportDates.ts"
Cohesion: 0.40
Nodes (3): packages_contracts_dist_index_isoweekfordate, packages_contracts_dist_index_isoweeksinyear, packages_contracts_dist_index_weeklyreportdaterange

### Community 116 - ""ImportRun""
Cohesion: 0.60
Nodes (4): "Organization", "ImportRun", ImportRun_organizationId_appliedAt_idx, ImportRun_organizationId_sourceKey_key

### Community 118 - ""public"."reject_event_mutation""
Cohesion: 0.50
Nodes (4): "AuditEvent_append_only", "GoalAchievementEvent_append_only", "WorkflowEvent_append_only", "public"."reject_event_mutation"

### Community 119 - ""public"."protect_completed_observation""
Cohesion: 0.50
Nodes (4): "FEDCObservation_completed_immutable", "SensoryProfileObservation_completed_immutable", "SFAObservation_completed_immutable", "public"."protect_completed_observation"

### Community 120 - ""public"."validate_observation_context""
Cohesion: 0.50
Nodes (4): "FEDCObservation_context", "SensoryProfileObservation_context", "SFAObservation_context", "public"."validate_observation_context"

### Community 121 - ""public"."validate_scope_tenant""
Cohesion: 0.50
Nodes (4): "MembershipGrade_tenant", "MembershipSubject_tenant", "MembershipUnit_tenant", "public"."validate_scope_tenant"

### Community 125 - "Google OAuth configuration"
Cohesion: 0.67
Nodes (3): Server-side opaque cookie sessions, Google OAuth configuration, P3-001 — Document Google OAuth setup

### Community 126 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

## Ambiguous Edges - Review These
- `Milestone 7 — Production hardening` → `PostgreSQL backup and restore runbook`  [AMBIGUOUS]
  docs/ROADMAP.md · relation: conceptually_related_to

## Knowledge Gaps
- **1064 isolated node(s):** `RouterLayer`, `PrismaDatabaseClient`, `ReadinessTransaction`, `ObservationHistoryViewerProps`, `ObservationReferenceDrawerProps` (+1059 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1345 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **76 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Milestone 7 — Production hardening` and `PostgreSQL backup and restore runbook`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `express` connect `express` to `ref_vitest`, `HttpError`, `weekly-reports-service.ts`, `openapi.ts`, `packages_contracts_dist_index`, `api/package.json`, `learning-journeys-controller.ts`, `aggregates-router.ts`, `app.ts`, `utils/resource-access.ts`, `shared-session-shadow-service.ts`, `auth-controller.ts`, `ieps-controller.ts`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Why does `@oxlint/plugins` connect `anti-slop/index.ts` to `require-safety-comment-for-type-assertion.ts`, `type-alias-resolution.ts`, `no-chained-type-assertions.ts`, `dictionary-types.ts`, `padding-line-between-statements.ts`, `no-object-parameters.ts`, `no-known-value-widening.ts`, `no-widen-then-assert.ts`, `package.json`, `no-reduce-accumulator-copy.ts`, `no-unsafe-dictionary-type.ts`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `typescript` connect `contracts/package.json` to `web/package.json`, `package.json`, `api/package.json`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **What connects `RouterLayer`, `PrismaDatabaseClient`, `ReadinessTransaction` to the rest of the system?**
  _1064 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ref_vitest` be split into smaller, more focused modules?**
  _Cohesion score 0.036237623762376235 - nodes in this community are weakly interconnected._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0431960049937578 - nodes in this community are weakly interconnected._