# Graph Report - MWS-Learnspace  (2026-10-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2995 nodes · 6734 edges · 198 communities (122 shown, 76 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 111 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e937927a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- vitest
- weekly-reports-service.ts
- api/observationService.ts
- people.ts
- sfa/SFAObservationView.tsx
- padding-line-between-statements.ts
- application/openapi.ts
- HttpError
- AppContext.tsx
- 20260819000000_initial/migration.sql
- oauth-service.ts
- express
- http-errors.ts
- prepare-local-import-rehearsal.ts
- iep.ts
- "public"."Organization"
- README.md
- App.tsx
- utils/resource-access.ts
- api/learningJourneyService.ts
- sfa.ts
- ObservationManagementPage.tsx
- learning-journeys.ts
- @prisma/client
- pages/WeeklyReportView.tsx
- anti-slop/index.ts
- utils/aggregates.queries.ts
- isRequestCancelled
- scripts
- fedc.ts
- types.ts
- observation-management.ts
- sensory-profile.ts
- exportFormat.ts
- weeklyReport.ts
- application/app.ts
- ieps-service.ts
- api/iepService.ts
- utils/ieps.policy.ts
- type-alias-resolution.ts
- dictionary-types.ts
- utils/authorization.ts
- import-service.ts
- useApp
- 20260827050000_aggregate_search_indexes/migration.sql
- "public"."IEP"
- sfa-observations-service.ts
- "public"."protect_tenant_ownership"
- SessionService
- "public"."Enrollment"
- no-known-value-widening.ts
- no-widen-then-assert.ts
- package.json
- scripts
- AttendancePage.tsx
- sensory-profile/SensoryProfileView.tsx
- aggregates.ts
- api/organizationAdministrationService.ts
- learning-journeys-controller.ts
- audit-service.ts
- pages/PeopleAccessView.tsx
- api/attendanceService.ts
- academics.ts
- learning-journeys-service.ts
- Prototype import rehearsal report — 2026-08-24 (local Docker)
- contracts/package.json
- ieps-controller.ts
- ref_node_fs
- pages/LearningJourneyCalendar.tsx
- compilerOptions
- organizations.ts
- sfa-scoring.ts
- packages_contracts_dist_index
- AppConfig
- attendance-service.ts
- learning-journeys-model.ts
- web/package.json
- @testing-library/react
- @playwright/test
- "public"."LearningJourney"
- observation-validation.ts
- "public"."validate_active_organization_user"
- fedc-scoring.ts
- e2e-seed.ts
- apiClient.ts
- devDependencies
- compilerOptions
- no-object-parameters.ts
- read-import-file.ts
- export-format-contracts.test.ts
- sensory-profile-scoring.ts
- 20260827000000_iep_contracts_and_immutability/migration.sql
- no-reduce-accumulator-copy.ts
- api/package.json
- compilerOptions
- compilerOptions
- no-unsafe-dictionary-type.ts
- compilerOptions
- dependencies
- src/index.ts
- require-safety-comment-for-type-assertion.ts
- devDependencies
- learning-journey-workflow.test.ts
- devDependencies
- scripts
- 20260820000000_google_oauth_authorization/migration.sql
- import-service.test.ts
- p5-ieps.spec.ts
- 20260827020000_weekly_report_workflow/migration.sql
- 20260827030000_transactional_iep_goal_projections/migration.sql
- no-chained-type-assertions.ts
- dependencies
- iep-goal-projection-model.ts
- anti-slop Vendored Rules README
- "public"."LearningJourneyProject"
- 20260826000000_observation_management/migration.sql
- p5-learning-journeys.spec.ts
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
- apps_api_package_json_ref_types_node
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
2. `vitest` - 84 edges
3. `@prisma/client` - 78 edges
4. `express` - 62 edges
5. `useApp()` - 53 edges
6. `SessionService` - 49 edges
7. `zod` - 43 edges
8. `react` - 41 edges
9. `isRequestCancelled()` - 37 edges
10. `createCsrfProtection()` - 36 edges

## Surprising Connections (you probably didn't know these)
- `Done, Commit, Next Skill Workflow` --semantically_similar_to--> `CI validate job`  [INFERRED] [semantically similar]
  .done-commit-next-SKILL.md → .github/workflows/ci.yml
- `compose.dev.yaml db override (publish 5432)` --semantically_similar_to--> `compose.import-local.yaml db override (publish 55432)`  [INFERRED] [semantically similar]
  compose.dev.yaml → compose.import-local.yaml
- `Done, Commit, Next Skill Workflow` --semantically_similar_to--> `Conventional Commit-style Messages`  [INFERRED] [semantically similar]
  .done-commit-next-SKILL.md → CONTRIBUTING.md
- `mutate()` --indirect_call--> `csrf()`  [INFERRED]
  apps/api/src/test/integration/sfa-observations.integration.test.ts → e2e/p5-weekly-reports.spec.ts
- `mutate()` --indirect_call--> `csrf()`  [INFERRED]
  apps/api/src/test/integration/fedc-observations.integration.test.ts → e2e/p5-weekly-reports.spec.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Prototype import rehearsal and rollback documentation pipeline** — docs_operations_prototype_import_rollout_doc, docs_operations_backup_and_restore_doc, docs_operations_prototype_import_rehearsal_2026_08_24_local_doc, docs_operations_prototype_import_rehearsal_template_doc [EXTRACTED 1.00]
- **Shared aggregate + append-only WorkflowEvent transition pattern** — docs_domain_model_learning_journey_transitions, docs_domain_model_iep_transitions, docs_domain_model_weekly_report_transitions, docs_api_conventions_learning_journey_workflow_commands [INFERRED 0.80]
- **Attendance E2E Compose Pipeline (CI-Driven)** — _github_workflows_ci_attendance_e2e_job, compose_e2e_db_service, compose_e2e_migrate_service, compose_e2e_fixture_service, compose_e2e_api_service, compose_e2e_web_service [INFERRED 0.85]
- **PostgreSQL db Service Pattern Across Compose Files** — compose_db_service, compose_dev_db_service, compose_e2e_db_service, compose_integration_db_service, compose_import_local_db_service [INFERRED 0.85]
- **Pre-merge Validation Command Set (format/lint/typecheck/test/build)** — _github_workflows_ci_validate_job, _github_pull_request_template_document, contributing_document [INFERRED 0.85]
- **Server-side trust boundary and deny-by-default enforcement pattern** — docs_adr_0001_application_architecture_browser_api_trust_boundary, docs_auth_authorization_matrix_doc, docs_auth_google_oauth_doc, docs_api_conventions_doc [INFERRED 0.85]

## Communities (198 total, 76 thin omitted)

### Community 0 - "vitest"
Cohesion: 0.05
Nodes (50): logLevels, placeholderValues, rawEnvironmentSchema, createRequestMiddleware(), DEFAULT_GPK_MAX_CASELOAD, config, csrfApp(), validEnvironment (+42 more)

### Community 1 - "weekly-reports-service.ts"
Cohesion: 0.06
Nodes (57): createWeeklyReportController(), decision(), organizationPathSchema, reportPathSchema, requireAuth(), mapWeeklyReport(), weeklyReportDate(), weeklyReportGoalProgressData() (+49 more)

### Community 2 - "api/observationService.ts"
Cohesion: 0.06
Nodes (53): ApiAssignment, ApiDefinition, asRecord(), ContractSchemas, dateOnly(), fallbackFedcCommandSchema, fallbackFedcObservationsResponseSchema, fallbackFedcResponseSchema (+45 more)

### Community 3 - "people.ts"
Cohesion: 0.03
Nodes (58): accountStatusSchema, activeGpkAssignmentSummarySchema, AttendanceBulkSaveCommand, attendanceBulkSaveCommandSchema, AttendanceBulkSaveResponse, attendanceBulkSaveResponseSchema, AttendanceQuery, attendanceQuerySchema (+50 more)

### Community 4 - "sfa/SFAObservationView.tsx"
Cohesion: 0.06
Nodes (44): ObservationReferenceDrawer, observationService, SensoryObservationReference, SFAObservationCommand, SFAObservationReference, ObservationHistoryViewer(), ObservationHistoryViewerProps, recordFedcMilestones() (+36 more)

### Community 5 - "padding-line-between-statements.ts"
Cohesion: 0.06
Nodes (47): isClosingBraceToken(), isFunction(), isNotSemicolonToken(), isParenthesized(), isSemicolonToken(), isSingleLine(), isTokenOnSameLine(), isTopLevelExpressionStatement() (+39 more)

### Community 6 - "application/openapi.ts"
Cohesion: 0.06
Nodes (49): assignmentParameter, classParameter, collectionOperation(), components, csrfParameter, definitionParameter, errorResponses, generateOpenApiDocument() (+41 more)

### Community 7 - "HttpError"
Cohesion: 0.14
Nodes (38): createFedcObservationsController(), createObservationAssignmentDeleteController(), createObservationAssignmentsController(), createObservationDefinitionsController(), createSensoryProfileObservationsController(), createSfaObservationsController(), HttpError, requireFedcRead() (+30 more)

### Community 8 - "AppContext.tsx"
Cohesion: 0.08
Nodes (39): AdministrationDataStatus, administrationErrorMessage(), useAuthorizedDirectory(), activeTabForPath(), instrumentFrom(), NavigationTab, ObservationManageTab, routeParam() (+31 more)

### Community 9 - "20260819000000_initial/migration.sql"
Cohesion: 0.07
Nodes (44): "AttendanceRecord_class_tenant", "AttendanceRecord_enrollment_tenant", "AttendanceRecord_student_tenant", "Enrollment_class_tenant", "Enrollment_student_tenant", "Enrollment_year_tenant", "FEDCObservation_assignment_tenant", "FEDCObservation_definition_tenant" (+36 more)

### Community 10 - "oauth-service.ts"
Cohesion: 0.09
Nodes (31): createAuthController(), secureCookies(), sessionPayload(), GoogleClaims, googleJwks, isUniqueConstraintError(), normalizeRedirectPath(), OAuthContext (+23 more)

### Community 11 - "express"
Cohesion: 0.14
Nodes (25): createAcademicsController(), DatabaseClient, IncompatibleDatabaseSchemaError, PrismaDatabaseClient, ReadinessTransaction, requiredMigration, createCsrfProtection(), createRequiredAuthentication() (+17 more)

### Community 12 - "http-errors.ts"
Cohesion: 0.09
Nodes (37): createGpkController(), createOrganizationAccountsController(), createOrganizationsController(), organizationPath, settingsResponse(), createStaffDirectoryController(), createStudentsController(), parseRequest() (+29 more)

### Community 13 - "prepare-local-import-rehearsal.ts"
Cohesion: 0.08
Nodes (29): LegacyExportTool(), buildLegacyExport(), downloadLegacyExport(), JSON_COLLECTION_KEYS, LEGACY_STORAGE_KEYS, LegacyExportError, parseCollection(), uniqueStrings() (+21 more)

### Community 14 - "iep.ts"
Cohesion: 0.05
Nodes (42): accommodationWriteSchema, actorSchema, addUniquePositions(), goalWriteSchema, Iep, iepAccommodationCategorySchema, iepAccommodationSchema, IepCreateCommand (+34 more)

### Community 15 - ""public"."Organization""
Cohesion: 0.07
Nodes (44): AuditEvent_organizationId_occurredAt_idx, AuditEvent_organizationId_targetType_targetId_occurredAt_idx, AuditEvent_requestId_idx, FEDCObservation_assignmentId_key, FEDCObservation_organizationId_studentId_observationDate_idx, GuardianContact_organizationId_studentId_idx, Membership_organizationId_role_status_idx, Membership_organizationId_userId_key (+36 more)

### Community 16 - "README.md"
Cohesion: 0.08
Nodes (39): Done, Commit, Next Skill Workflow, .env.example (Safe Environment Template), Pull Request Template, CI attendance-e2e job, CI validate job, CI Workflow (GitHub Actions), .nvmrc (Pinned Node.js Version), apps/api/Dockerfile (Multi-stage: runtime/migration targets) (+31 more)

### Community 17 - "App.tsx"
Cohesion: 0.07
Nodes (25): App(), ApplicationErrorBoundary, ApplicationLayout(), IEPPlanView, ProtectedLayout(), ReportsAnalyticsView, ToastContainer(), authService (+17 more)

### Community 18 - "utils/resource-access.ts"
Cohesion: 0.12
Nodes (33): activeGpkAssignmentSelect(), GPK_ROLE_CONTEXT, gpkAssignmentSelect, mapGpkAssignment(), SelectedGpkAssignment, enrollmentSelect(), mapStudent(), mapStudentDetail() (+25 more)

### Community 19 - "api/learningJourneyService.ts"
Cohesion: 0.09
Nodes (30): LearningJourneyEditor, journeyCommand(), learningJourneyService, mapJourneyToLegacy(), monthBoundary(), monthIndexes, monthLabel(), roleLabel() (+22 more)

### Community 20 - "sfa.ts"
Cohesion: 0.05
Nodes (39): sfaActivityPerformanceCommandSchema, SfaActivityPerformanceRating, sfaActivityPerformanceRatingSchema, sfaAdaptationsCommandSchema, SfaDefinitionBody, sfaDefinitionBodySchema, sfaDefinitionItemSchema, sfaDefinitionProjectionSchema (+31 more)

### Community 21 - "ObservationManagementPage.tsx"
Cohesion: 0.08
Nodes (27): ObservationPage, booleanValue(), definitionCreateCommand(), definitionVersionCommand(), mapObservationDefinition(), errorMessage(), ObservationDataStatus, useObservationData() (+19 more)

### Community 22 - "learning-journeys.ts"
Cohesion: 0.05
Nodes (37): addUniquePositionIssues(), connectionCommandSchema, learningJourneyBaseSchema, learningJourneyCollectionItemSchema, learningJourneyConnectionSchema, LearningJourneyCreateCommand, learningJourneyCreateCommandSchema, learningJourneyDecisionFields (+29 more)

### Community 23 - "@prisma/client"
Cohesion: 0.10
Nodes (20): createNotificationsController(), createAggregateRouter(), createNotificationsQueryService(), NotificationsQueryService, createOrganizationsService(), createAggregateSearchQueryService(), ActiveSession, expectedRoutes (+12 more)

### Community 24 - "pages/WeeklyReportView.tsx"
Cohesion: 0.09
Nodes (25): WeeklyReportView, StatusBadge(), StatusBadgeProps, WeeklyReport, clampIsoWeekForYear(), findWeeklyReportForStudent(), reportYearOptions(), UnpersistedWeeklyReport (+17 more)

### Community 25 - "anti-slop/index.ts"
Cohesion: 0.10
Nodes (25): @oxlint/plugins, antiSlopPlugin, noArrayFilterMapRule, isConditionalEmptyObjectSpread(), isEmptyObjectExpression(), noConditionalEmptyObjectSpreadRule, unwrapParentheses(), importedName() (+17 more)

### Community 26 - "utils/aggregates.queries.ts"
Cohesion: 0.15
Nodes (29): mapObservationAggregate(), ObservationGroups, createDashboardQueryService(), DashboardQueryService, createReportingQueryService(), ReportingQueryService, date, activeIepStates (+21 more)

### Community 27 - "isRequestCancelled"
Cohesion: 0.10
Nodes (24): AppShell(), aggregateService, LoadStatus, message(), useDashboardSummary(), useGlobalSearch(), useNotifications(), useReportingAggregate() (+16 more)

### Community 28 - "scripts"
Cohesion: 0.06
Nodes (35): scripts, build, clean, db:backup, db:import, db:import:prepare-local, db:migrate:deploy, db:migrate:dev (+27 more)

### Community 29 - "fedc.ts"
Cohesion: 0.06
Nodes (33): FedcDefinitionBody, fedcDefinitionBodySchema, fedcDefinitionItemSchema, fedcDefinitionMilestoneSchema, fedcDefinitionProjectionSchema, fedcMilestoneScoresSchema, FedcObservation, FedcObservationCompleteCommand (+25 more)

### Community 30 - "types.ts"
Cohesion: 0.09
Nodes (26): FEDCObservationCommand, FEDCObservationReference, FEDCObservationView(), Props, provisionalScores(), RATING_WEIGHTS, today(), LoadStatus (+18 more)

### Community 31 - "observation-management.ts"
Cohesion: 0.10
Nodes (31): strictBooleanSchema, jsonPrimitiveSchema, JsonValue, jsonValueSchema, observationAssigneeSummarySchema, ObservationAssignment, ObservationAssignmentCancelCommand, observationAssignmentCancelCommandSchema (+23 more)

### Community 32 - "sensory-profile.ts"
Cohesion: 0.06
Nodes (32): observationPersonSummarySchema, studentSummarySchema, SensoryProfileDefinitionBody, sensoryProfileDefinitionBodySchema, sensoryProfileDefinitionItemSchema, sensoryProfileDefinitionProjectionSchema, sensoryProfileDraftWriteFields, SensoryProfileObservation (+24 more)

### Community 33 - "exportFormat.ts"
Cohesion: 0.06
Nodes (30): addDuplicateIssues(), dateSchema, dateTimeSchema, LEARNSPACE_EXPORT_FORMAT, LEARNSPACE_EXPORT_LIMITS, LEARNSPACE_EXPORT_MAX_BYTES, LEARNSPACE_EXPORT_VERSION, LearnspaceExport (+22 more)

### Community 34 - "weeklyReport.ts"
Cohesion: 0.08
Nodes (31): packages_contracts_src_resources_collectionmetaschema, packages_contracts_src_resources_schooldateschema, packages_contracts_src_resources_staffmembershiproleschema, packages_contracts_src_resources_uuidschema, packages_contracts_src_resources_workflowstateschema, actorSchema, isoWeekForDate(), isoWeekMonday() (+23 more)

### Community 35 - "application/app.ts"
Cohesion: 0.12
Nodes (21): AppDependencies, createApp(), main(), loadConfig(), createDatabase(), Database, createLogger(), LogFields (+13 more)

### Community 36 - "ieps-service.ts"
Cohesion: 0.11
Nodes (27): iepDate(), IepListRow, iepListSelect, IepRow, iepSelect, IepWorkflowEvent, isoDate(), mapIep() (+19 more)

### Community 37 - "api/iepService.ts"
Cohesion: 0.17
Nodes (27): accommodationCommand(), accommodations(), arrayValue(), asRecord(), booleanValue(), commandFor(), ContractSchemas, dateOnly() (+19 more)

### Community 38 - "utils/ieps.policy.ts"
Cohesion: 0.13
Nodes (24): createIepService(), base, onDate, roles, workflowRoleTable, command(), membership, run() (+16 more)

### Community 39 - "type-alias-resolution.ts"
Cohesion: 0.11
Nodes (25): FunctionWithReturnType, noUnknownReturnsRule, noUnknownTypeAliasesRule, collectInferTypeParameterNames(), isNode(), lexicalTypeParameterNames(), VisitorKeys, aliasSubstitutions() (+17 more)

### Community 40 - "dictionary-types.ts"
Cohesion: 0.18
Nodes (27): aliasSubstitution(), BUILT_INS, classifyAliasBroadTarget(), classifyWideningTarget(), createTypeEnvironment(), declaredStatement(), dictionaryValueTypes(), hasBroadRecordKey() (+19 more)

### Community 41 - "utils/authorization.ts"
Cohesion: 0.15
Nodes (19): createAttendanceController(), requireAuth(), AttendanceService, CreateAuditEventInput, teacher, AuthenticatedRequest, attendanceMembershipFor(), deny() (+11 more)

### Community 42 - "import-service.ts"
Cohesion: 0.16
Nodes (25): addCount(), addRepeatSkips(), dateOnly(), dateTime(), findImportRun(), gender(), importExport(), jsonValue() (+17 more)

### Community 43 - "useApp"
Cohesion: 0.14
Nodes (18): useApp(), iepService, IEPStatusTracker(), IEPStatusTrackerProps, errorMessage(), LoadStatus, useIEPs(), IEP_TABS (+10 more)

### Community 44 - "20260827050000_aggregate_search_indexes/migration.sql"
Cohesion: 0.11
Nodes (24): apps_web_src_services_weeklyreportservice_weeklyreport, IEPGoal, LearningJourney, "IEP", "ObservationAssignment", "prevent_non_draft_weekly_report_change", WeeklyReport_organizationId_studentId_year_weekNumber_key, "WeeklyReport_prevent_non_draft_update" (+16 more)

### Community 45 - ""public"."IEP""
Cohesion: 0.09
Nodes (26): GoalAchievementEvent_organizationId_goalId_occurredAt_idx, IEP_organizationId_academicYearId_idx, IEP_organizationId_studentId_state_idx, IEPAccommodation_iepId_category_position_key, IEPGoal_id_iepId_key, IEPGoal_iepId_code_key, IEPGoal_iepId_position_key, IEPPerformanceArea_iepId_position_key (+18 more)

### Community 46 - "sfa-observations-service.ts"
Cohesion: 0.15
Nodes (19): FedcObservationRow, fedcObservationSelect, mapFedcObservation(), DefinitionRow, definitionSelect, mapDefinition(), mapSensoryProfileObservation(), SensoryProfileObservationRow (+11 more)

### Community 47 - ""public"."protect_tenant_ownership""
Cohesion: 0.08
Nodes (24): "AcademicYear_tenant_immutable", "AttendanceRecord_tenant_immutable", "AuditEvent_tenant_immutable", "Enrollment_tenant_immutable", "FEDCObservation_tenant_immutable", "GoalAchievementEvent_tenant_immutable", "Grade_tenant_immutable", "GuardianContact_tenant_immutable" (+16 more)

### Community 48 - "SessionService"
Cohesion: 0.13
Nodes (15): SessionService, authenticatedCookie(), cookie(), authenticatedCookie(), authenticatedCookie(), authenticatedCookie(), authenticatedCookie(), authenticatedCookie() (+7 more)

### Community 49 - ""public"."Enrollment""
Cohesion: 0.10
Nodes (22): AttendanceRecord_organizationId_schoolDate_classId_idx, AttendanceRecord_organizationId_studentId_classId_schoolDat_key, AttendanceRecord_organizationId_studentId_schoolDate_idx, Enrollment_organizationId_classId_startsOn_endsOn_idx, Enrollment_organizationId_studentId_startsOn_endsOn_idx, Enrollment_studentId_academicYearId_classId_startsOn_key, Grade_organizationId_code_key, Grade_organizationId_unitId_idx (+14 more)

### Community 50 - "no-known-value-widening.ts"
Cohesion: 0.19
Nodes (19): annotationTarget(), FunctionExpression, functionName(), hasInformativeType(), hasKnownCallArgumentEvidence(), hasKnownEvidence(), isDictionaryAccumulatorTarget(), isEmptyObjectExpression() (+11 more)

### Community 51 - "no-widen-then-assert.ts"
Cohesion: 0.23
Nodes (21): assertedExpression(), assertionFromExpression(), assertionIsNarrower(), BroadTypeKind, functionBoundary(), functionBoundaryTypes, isBroadRecordKeyType(), isBroadRecordType() (+13 more)

### Community 52 - "package.json"
Cohesion: 0.12
Nodes (17): apps_api_package_json_ref_prisma, apps_api_package_json_ref_typescript, dependencies, @prisma/client, name, private, type, version (+9 more)

### Community 53 - "scripts"
Cohesion: 0.10
Nodes (20): scripts, build, db:import, db:migrate:deploy, db:migrate:dev, db:migrate:status, db:seed, db:seed:e2e (+12 more)

### Community 54 - "AttendancePage.tsx"
Cohesion: 0.14
Nodes (15): AttendancePage, AttendancePage(), displaySchoolDate(), DraftMap, DraftRecord, draftsFromRoster(), errorMessage(), formatDateParts() (+7 more)

### Community 55 - "sensory-profile/SensoryProfileView.tsx"
Cohesion: 0.13
Nodes (16): SensoryObservationCommand, fallbackSensoryDefinitionBodySchema, pinnedSections(), Props, provisionalScores(), SensoryContractSchemas, SensoryProfileView(), SensorySection (+8 more)

### Community 56 - "aggregates.ts"
Cohesion: 0.10
Nodes (19): AggregateNotification, aggregateNotificationSchema, AggregateNotificationsResponse, aggregateNotificationsResponseSchema, AggregateSearchItem, aggregateSearchItemSchema, AggregateSearchQuery, aggregateSearchQuerySchema (+11 more)

### Community 57 - "api/organizationAdministrationService.ts"
Cohesion: 0.12
Nodes (14): AcademicsService, organizationAdministrationService, account, packages_contracts_dist_index_academicyearsresponseschema, packages_contracts_dist_index_gradesresponse, packages_contracts_dist_index_gradesresponseschema, packages_contracts_dist_index_organizationaccountmutationresponse, packages_contracts_dist_index_organizationaccountsresponse (+6 more)

### Community 58 - "learning-journeys-controller.ts"
Cohesion: 0.15
Nodes (17): createLearningJourneyController(), journeyPathSchema, organizationPathSchema, requireAuth(), LearningJourneyService, learningJourneyMembershipFor(), packages_contracts_dist_index_attendancestatusschema, packages_contracts_dist_index_learningjourneycreatecommandschema (+9 more)

### Community 59 - "audit-service.ts"
Cohesion: 0.12
Nodes (14): mapOrganizationAccount(), organizationAccountSelect, SelectedOrganizationAccount, AuditMetadata, auditMetadataSchema, AuditResultValue, fieldName, safeText (+6 more)

### Community 60 - "pages/PeopleAccessView.tsx"
Cohesion: 0.13
Nodes (15): PeopleAccessView, apps_web_src_context_authcontext_useauth, Account, emptyForm, Feedback, formForAccount(), FormState, Option (+7 more)

### Community 61 - "api/attendanceService.ts"
Cohesion: 0.12
Nodes (15): attendanceService, classesResponse, mockedAttendanceService, mockedUseApp, mockedUseAuth, rosterResponse, schoolClass, setAttendanceTarget (+7 more)

### Community 62 - "academics.ts"
Cohesion: 0.11
Nodes (18): academicYearSchema, AcademicYearsResponse, academicYearsResponseSchema, ClassesResponse, classesResponseSchema, classSchema, gradeSchema, GradesResponse (+10 more)

### Community 63 - "learning-journeys-service.ts"
Cohesion: 0.18
Nodes (16): createLearningJourneyService(), duplicateJourneyError(), findWorkflowEvents(), invalidTransition(), LearningJourneyPrisma, mapWithEvents(), transitionJourneyWithPrisma(), validateReferences() (+8 more)

### Community 64 - "Prototype import rehearsal report — 2026-08-24 (local Docker)"
Cohesion: 0.13
Nodes (18): Docker Compose services (web/api/db), Prototype data migration approach, npm run db:backup script, npm run db:restore script, PostgreSQL backup and restore runbook, Prototype import rehearsal report — 2026-08-24 (local Docker), Prototype import rehearsal template, Administrative importer CLI (db:import) (+10 more)

### Community 65 - "contracts/package.json"
Cohesion: 0.11
Nodes (17): dependencies, zod, devDependencies, typescript, exports, files, typescript, zod (+9 more)

### Community 66 - "ieps-controller.ts"
Cohesion: 0.15
Nodes (15): createIepController(), iepPathSchema, organizationPathSchema, requireAuth(), IepService, ids, iepMembershipFor(), packages_contracts_dist_index_iepcreatecommandschema (+7 more)

### Community 67 - "ref_node_fs"
Cohesion: 0.15
Nodes (9): temporaryDirectories, temporaryDirectories, allowedLegacyReaders, sensitiveLegacyKeys, sourceExtensions, sourceRoot, ref_node_fs, ref_node_os (+1 more)

### Community 68 - "pages/LearningJourneyCalendar.tsx"
Cohesion: 0.16
Nodes (10): LearningJourneyCalendar, LearningJourneyStatusTracker, useLearningJourneys(), ALL_MONTHS, LearningJourneyCalendar(), SEMESTER_1_MONTHS, SEMESTER_2_MONTHS, LearningJourneyStatusTracker() (+2 more)

### Community 69 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+8 more)

### Community 70 - "organizations.ts"
Cohesion: 0.14
Nodes (15): collectionMetaSchema, nullableTrimmedText(), schoolDateSchema, uuidSchema, ianaTimezoneSchema, OrganizationSchoolDateResponse, organizationSchoolDateResponseSchema, OrganizationSettingsResponse (+7 more)

### Community 71 - "sfa-scoring.ts"
Cohesion: 0.18
Nodes (13): completeInput, definitionBody, parseDefinition(), parseResponses(), scoreSfaResponses(), SfaScoringError, packages_contracts_dist_index_sfaactivityperformancecommandschema, packages_contracts_dist_index_sfaadaptationscommandschema (+5 more)

### Community 72 - "packages_contracts_dist_index"
Cohesion: 0.28
Nodes (11): aggregateOrganizationId(), aggregateRequestContext(), organizationPathSchema, createDashboardController(), createReportingController(), createAggregateSearchController(), AggregateSearchQueryService, aggregateMembershipFor() (+3 more)

### Community 73 - "AppConfig"
Cohesion: 0.27
Nodes (11): createTestAuthController(), e2eAuthHeaderName, e2eAuthUserHeaderName, AppConfig, createTestAuthRouter(), apps_api_src_routes_test_auth_router_e2eauthheadername, apps_api_src_routes_test_auth_router_e2eauthuserheadername, createTestAuthService() (+3 more)

### Community 74 - "attendance-service.ts"
Cohesion: 0.25
Nodes (10): AttendanceClass, attendanceClassSelect, AttendanceRecords, AttendanceRoster, attendanceRosterSelect, attendanceVersion(), mapAttendanceRoster(), createAttendanceService() (+2 more)

### Community 75 - "learning-journeys-model.ts"
Cohesion: 0.17
Nodes (11): isoDate(), learningJourneyDate(), LearningJourneyRow, learningJourneySelect, LearningJourneyWorkflowEvent, mapLearningJourney(), nestedLearningJourneyProjects(), packages_contracts_dist_index_learningjourneycreatecommand (+3 more)

### Community 76 - "web/package.json"
Cohesion: 0.15
Nodes (13): name, private, type, version, jsdom, @learnspace/contracts, ref_path, @tailwindcss/vite (+5 more)

### Community 77 - "@testing-library/react"
Cohesion: 0.14
Nodes (11): currentGradeIds, currentPermissions, navigateToAttendanceStudent, navigateToIEP, navigateToObservation, navigateToWeeklyReport, setSearchQuery, routerState (+3 more)

### Community 78 - "@playwright/test"
Cohesion: 0.13
Nodes (4): fixture, fixture, fixture, @playwright/test

### Community 79 - ""public"."LearningJourney""
Cohesion: 0.14
Nodes (15): AcademicYear_organizationId_name_key, AcademicYear_organizationId_startsOn_endsOn_idx, LearningJourney_organizationId_academicYearId_semesterId_gr_key, LearningJourney_organizationId_state_idx, "public"."AcademicYear", "public"."LearningJourney", "public"."LearningJourneyOwner", "public"."MembershipSubject" (+7 more)

### Community 80 - "observation-validation.ts"
Cohesion: 0.25
Nodes (12): fedcCompletePayloadSchema, fedcCreateDraftPayloadSchema, fedcPayloadSchema, fedcSaveDraftPayloadSchema, sensoryProfileCompletePayloadSchema, sensoryProfileCreateDraftPayloadSchema, sensoryProfilePayloadSchema, sensoryProfileSaveDraftPayloadSchema (+4 more)

### Community 81 - ""public"."validate_active_organization_user""
Cohesion: 0.14
Nodes (14): "AttendanceRecord_recorder_membership", "AuditEvent_actor_membership", "FEDCObservation_observer_membership", "GoalAchievementEvent_actor_membership", "IEP_creator_membership", "IEP_updater_membership", "LearningJourney_creator_membership", "LearningJourney_updater_membership" (+6 more)

### Community 82 - "fedc-scoring.ts"
Cohesion: 0.21
Nodes (10): definition, FedcScoringError, parseDefinition(), ratingScores, scoreFedcResponses(), packages_contracts_dist_index_fedcdefinitionbody, packages_contracts_dist_index_fedcdefinitionbodyschema, packages_contracts_dist_index_fedcrating (+2 more)

### Community 83 - "e2e-seed.ts"
Cohesion: 0.24
Nodes (9): assertSeedAllowed(), seedEnvironmentSchema, e2eFixture, main(), seedE2eDatabase(), sfaDefinitionBody, main(), seedDatabase() (+1 more)

### Community 84 - "apiClient.ts"
Cohesion: 0.24
Nodes (10): apiClient, ApiClientError, ApiErrorCategory, apiRequest(), ApiRequestOptions, categoryForStatus(), parseJson(), readCookie() (+2 more)

### Community 85 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-unused-imports, oxlint, @oxlint/plugins (+5 more)

### Community 86 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, declaration, declarationMap, module, moduleResolution, outDir, rootDir, skipLibCheck (+4 more)

### Community 87 - "no-object-parameters.ts"
Cohesion: 0.29
Nodes (10): typePredicateSubjectIndex(), noObjectParametersRule, ParameterOwner, isTypePredicateSubject(), noUnknownParametersRule, ParameterOwner, containsUnknownType(), FunctionParameter (+2 more)

### Community 88 - "read-import-file.ts"
Cohesion: 0.32
Nodes (8): Arguments, parseImportArguments(), runImportCli(), valid, parseJson(), readExportFile(), readImportManifest(), packages_contracts_dist_index_learnspace_export_max_bytes

### Community 89 - "export-format-contracts.test.ts"
Cohesion: 0.17
Nodes (8): DryRunRollback, ImportCounts, ImportMode, ImportReport, packages_contracts_dist_index_learnspace_export_limits, packages_contracts_dist_index_learnspaceexportschema, packages_contracts_dist_index_learnspaceexportv1, packages_contracts_dist_index_learnspaceexportv1schema

### Community 90 - "sensory-profile-scoring.ts"
Cohesion: 0.24
Nodes (9): definitionBody, parseDefinition(), scoreSensoryProfileResponses(), sectionKeys, SensoryProfileScoringError, packages_contracts_dist_index_sensoryprofiledefinitionbody, packages_contracts_dist_index_sensoryprofiledefinitionbodyschema, packages_contracts_dist_index_sensoryprofileresponsescommandschema (+1 more)

### Community 91 - "20260827000000_iep_contracts_and_immutability/migration.sql"
Cohesion: 0.23
Nodes (10): "IEP_historical_immutable", "IEPAccommodation_historical_immutable", "IEPGoal_historical_immutable", "IEPPerformanceArea_historical_immutable", "IEPServiceSchedule_historical_immutable", "IEPTeamMember_historical_immutable", "public"."protect_historical_iep_child"(), "public"."IEP" (+2 more)

### Community 92 - "no-reduce-accumulator-copy.ts"
Cohesion: 0.45
Nodes (9): enclosingReducer(), isGlobalCopyOwner(), noReduceAccumulatorCopyRule, referencesAccumulator(), arrayMethodTarget(), isArrayAnnotation(), isKnownArrayExpression(), resolveArrayBinding() (+1 more)

### Community 93 - "api/package.json"
Cohesion: 0.18
Nodes (10): main, name, private, type, version, jose, prisma, tsx (+2 more)

### Community 94 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noEmit, skipLibCheck, strict (+2 more)

### Community 95 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, declaration, noEmit, outDir, rootDir, sourceMap, exclude, extends (+2 more)

### Community 96 - "no-unsafe-dictionary-type.ts"
Cohesion: 0.33
Nodes (10): isInsideTypeAliasDeclaration(), isInsideTypeParameterConstraint(), isPlainAliasConsumerUse(), isTypeNode(), noUnsafeDictionaryTypeRule, shouldReportType(), typeNodeKinds, typeReferenceName() (+2 more)

### Community 97 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 98 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, @learnspace/contracts, lucide-react, motion, react, react-dom, react-router-dom, @tailwindcss/vite (+2 more)

### Community 99 - "src/index.ts"
Cohesion: 0.20
Nodes (9): ApiError, apiErrorSchema, CurrentSessionResponse, currentSessionResponseSchema, HealthResponse, healthResponseSchema, membershipRoleSchema, VersionResponse (+1 more)

### Community 100 - "require-safety-comment-for-type-assertion.ts"
Cohesion: 0.31
Nodes (9): commentOwnerKinds, configuredSafetyMarkers(), DEFAULT_SAFETY_MARKERS, hasSafetyComment(), hasSafetyJustificationBefore(), isConstAssertion(), markerPattern(), requireSafetyCommentForTypeAssertionRule (+1 more)

### Community 101 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, prisma, supertest, tsx, @types/express, @types/node, @types/supertest, typescript (+1 more)

### Community 102 - "learning-journey-workflow.test.ts"
Cohesion: 0.28
Nodes (8): actorMembershipId(), JourneyTransition, transitionJourney(), journeyRow(), membership, run(), transactionFor(), validTransitions

### Community 103 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, jsdom, @testing-library/jest-dom, @testing-library/react, @types/node, @types/react, @types/react-dom, typescript (+1 more)

### Community 104 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, prebuild, pretest, pretypecheck, preview, test (+1 more)

### Community 105 - "20260820000000_google_oauth_authorization/migration.sql"
Cohesion: 0.33
Nodes (8): OAuthLoginTransaction_expiresAt_consumedAt_idx, OAuthLoginTransaction_stateHash_key, "public"."OAuthLoginTransaction", "public"."UserInvitation", "public"."User", UserInvitation_email_expiresAt_acceptedAt_idx, UserInvitation_organizationId_email_idx, "public"."Organization"

### Community 106 - "import-service.test.ts"
Cohesion: 0.29
Nodes (5): document, manifest, ImportManifest, importManifestSchema, uuidMapSchema

### Community 108 - "20260827020000_weekly_report_workflow/migration.sql"
Cohesion: 0.25
Nodes (4): "WeeklyReport_prevent_non_draft_update", "WorkflowEvent_prevent_weekly_report_history_change", "public"."prevent_non_draft_weekly_report_change", "public"."prevent_weekly_report_workflow_event_change"

### Community 109 - "20260827030000_transactional_iep_goal_projections/migration.sql"
Cohesion: 0.29
Nodes (7): GoalAchievementEvent_weeklyReportId_goalId_sourceReportVersion_key, IEPGoal_achievedEventId_key, "public"."protect_historical_iep_child"(), "public"."IEP", "public"."WeeklyReport", "public"."GoalAchievementEvent", "public"."IEPGoal"

### Community 110 - "no-chained-type-assertions.ts"
Cohesion: 0.46
Nodes (7): isConstAssertion(), isForbiddenAssertionChain(), isOutermostAssertionInChain(), isTypeAssertionExpression(), noChainedTypeAssertionsRule, TypeAssertionExpression, unwrapParenthesizedExpression()

### Community 111 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, express, jose, @learnspace/contracts, @prisma/client, zod

### Community 112 - "iep-goal-projection-model.ts"
Cohesion: 0.53
Nodes (4): AchievementSource, appendReportAchievementEvents(), projectIepGoals(), utcDate()

### Community 113 - "anti-slop Vendored Rules README"
Cohesion: 0.33
Nodes (6): oxlint.config.ts jsPlugins Registration, anti-slop Vendored Rules README, Vendoring Pattern (Effect-specific rules/tests omitted), Vendored padding-line-between-statements Upstream Notes, Local Adaptations for Oxlint Compatibility, require-readable-spacing Oxlint Rule Policy

### Community 114 - ""public"."LearningJourneyProject""
Cohesion: 0.33
Nodes (6): CrossCurricularConnection_projectId_position_key, LearningGoal_projectId_position_key, LearningJourneyProject_learningJourneyId_position_key, "public"."CrossCurricularConnection", "public"."LearningGoal", "public"."LearningJourneyProject"

### Community 115 - "20260826000000_observation_management/migration.sql"
Cohesion: 0.33
Nodes (5): ObservationAssignment_cancelledById_idx, "ObservationAssignment_canceller_membership", "public"."User", "public"."validate_active_organization_user", "public"."ObservationAssignment"

### Community 117 - ""ImportRun""
Cohesion: 0.60
Nodes (4): "Organization", "ImportRun", ImportRun_organizationId_appliedAt_idx, ImportRun_organizationId_sourceKey_key

### Community 119 - ""public"."reject_event_mutation""
Cohesion: 0.50
Nodes (4): "AuditEvent_append_only", "GoalAchievementEvent_append_only", "WorkflowEvent_append_only", "public"."reject_event_mutation"

### Community 120 - ""public"."protect_completed_observation""
Cohesion: 0.50
Nodes (4): "FEDCObservation_completed_immutable", "SensoryProfileObservation_completed_immutable", "SFAObservation_completed_immutable", "public"."protect_completed_observation"

### Community 121 - ""public"."validate_observation_context""
Cohesion: 0.50
Nodes (4): "FEDCObservation_context", "SensoryProfileObservation_context", "SFAObservation_context", "public"."validate_observation_context"

### Community 122 - ""public"."validate_scope_tenant""
Cohesion: 0.50
Nodes (4): "MembershipGrade_tenant", "MembershipSubject_tenant", "MembershipUnit_tenant", "public"."validate_scope_tenant"

### Community 126 - "Google OAuth configuration"
Cohesion: 0.67
Nodes (3): Server-side opaque cookie sessions, Google OAuth configuration, P3-001 — Document Google OAuth setup

### Community 127 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

## Ambiguous Edges - Review These
- `Milestone 7 — Production hardening` → `PostgreSQL backup and restore runbook`  [AMBIGUOUS]
  docs/ROADMAP.md · relation: conceptually_related_to

## Knowledge Gaps
- **1001 isolated node(s):** `WeeklyReportGoalProgress`, `WeeklyReportRecord`, `WeeklyReportResponse`, `WeeklyReportWorkflowEvent`, `WeeklyReportWorkflowEvent` (+996 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1269 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **76 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Milestone 7 — Production hardening` and `PostgreSQL backup and restore runbook`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `zod` connect `http-errors.ts` to `vitest`, `weekly-reports-service.ts`, `api/observationService.ts`, `people.ts`, `application/openapi.ts`, `HttpError`, `iep.ts`, `sfa.ts`, `learning-journeys.ts`, `fedc.ts`, `observation-management.ts`, `sensory-profile.ts`, `exportFormat.ts`, `weeklyReport.ts`, `ieps-service.ts`, `api/iepService.ts`, `sfa-observations-service.ts`, `sensory-profile/SensoryProfileView.tsx`, `aggregates.ts`, `learning-journeys-controller.ts`, `audit-service.ts`, `academics.ts`, `ieps-controller.ts`, `organizations.ts`, `packages_contracts_dist_index`, `observation-validation.ts`, `e2e-seed.ts`, `apiClient.ts`, `api/package.json`, `src/index.ts`, `import-service.test.ts`?**
  _High betweenness centrality (0.239) - this node is a cross-community bridge._
- **Why does `@prisma/client` connect `@prisma/client` to `vitest`, `weekly-reports-service.ts`, `application/openapi.ts`, `HttpError`, `oauth-service.ts`, `express`, `prepare-local-import-rehearsal.ts`, `utils/resource-access.ts`, `utils/aggregates.queries.ts`, `ieps-service.ts`, `utils/ieps.policy.ts`, `utils/authorization.ts`, `import-service.ts`, `sfa-observations-service.ts`, `SessionService`, `package.json`, `audit-service.ts`, `learning-journeys-service.ts`, `attendance-service.ts`, `learning-journeys-model.ts`, `e2e-seed.ts`, `read-import-file.ts`, `api/package.json`, `learning-journey-workflow.test.ts`, `import-service.test.ts`, `iep-goal-projection-model.ts`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Why does `@oxlint/plugins` connect `anti-slop/index.ts` to `no-unsafe-dictionary-type.ts`, `require-safety-comment-for-type-assertion.ts`, `padding-line-between-statements.ts`, `type-alias-resolution.ts`, `dictionary-types.ts`, `no-chained-type-assertions.ts`, `no-known-value-widening.ts`, `no-widen-then-assert.ts`, `package.json`, `no-object-parameters.ts`, `no-reduce-accumulator-copy.ts`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **What connects `WeeklyReportGoalProgress`, `WeeklyReportRecord`, `WeeklyReportResponse` to the rest of the system?**
  _1001 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `vitest` be split into smaller, more focused modules?**
  _Cohesion score 0.04680365296803653 - nodes in this community are weakly interconnected._
- **Should `weekly-reports-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06057945566286216 - nodes in this community are weakly interconnected._