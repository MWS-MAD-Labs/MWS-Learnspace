# Graph Report - MWS-Learnspace  (2026-10-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2994 nodes · 6571 edges · 193 communities (120 shown, 73 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 96 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e937927a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- weekly-reports.service.ts
- aggregates.queries.ts
- ieps.service.ts
- vitest
- people.ts
- padding-line-between-statements.ts
- authorization.ts
- resourceRoutes.ts
- HttpError
- 20260819000000_initial/migration.sql
- api/observationService.ts
- app.ts
- AppContext.tsx
- iep.ts
- "public"."Organization"
- README.md
- learning-journeys.service.ts
- useApp
- openapi.ts
- sfa.ts
- pages/WeeklyReportView.tsx
- learning-journeys.ts
- importService.ts
- observationSchemas.ts
- ObservationManagementPage.tsx
- sensory-profile/SensoryProfileView.tsx
- anti-slop/index.ts
- scripts
- api/iepService.ts
- fedc.ts
- observation-management.ts
- sensory-profile.ts
- apps_api_src_sessionservice_sessionservice
- p5-ieps.spec.ts
- exportFormat.ts
- weeklyReport.ts
- packages_contracts_dist_index
- types.ts
- api/learningJourneyService.ts
- type-alias-resolution.ts
- dictionary-types.ts
- oauth.service.ts
- sfa/SFAObservationView.tsx
- iepManagement.integration.test.ts
- 20260827050000_aggregate_search_indexes/migration.sql
- "public"."IEP"
- auth.routes.ts
- express
- fedc/FEDCObservationView.tsx
- isRequestCancelled
- "public"."protect_tenant_ownership"
- audit.ts
- package.json
- "public"."Enrollment"
- prepare-local-import-rehearsal.ts
- no-known-value-widening.ts
- no-widen-then-assert.ts
- api/organizationAdministrationService.ts
- pages/PeopleAccessView.tsx
- scripts
- learning-journeys.controller.ts
- readImportFile.ts
- AttendancePage.tsx
- aggregates.ts
- academics.ts
- @prisma/client
- api/attendanceService.ts
- Prototype import rehearsal report — 2026-08-24 (local Docker)
- contracts/package.json
- sfaScoring.ts
- legacyStorageReader.ts
- apiClient.ts
- organizations.ts
- web/package.json
- learning-journeys/hooks/useLearningJourneys.ts
- compilerOptions
- compilerOptions
- "public"."LearningJourney"
- api/package.json
- oauthService.test.ts
- database.integration.test.ts
- "public"."validate_active_organization_user"
- devDependencies
- compilerOptions
- no-object-parameters.ts
- sensoryProfileScoring.ts
- 20260827000000_iep_contracts_and_immutability/migration.sql
- no-reduce-accumulator-copy.ts
- fedcScoring.ts
- @testing-library/react
- api/aggregateService.ts
- api/observationService.test.ts
- no-unsafe-dictionary-type.ts
- compilerOptions
- src/index.ts
- require-safety-comment-for-type-assertion.ts
- devDependencies
- sfaObservations.integration.test.ts
- dependencies
- devDependencies
- scripts
- 20260820000000_google_oauth_authorization/migration.sql
- importService.test.ts
- 20260827020000_weekly_report_workflow/migration.sql
- 20260827030000_transactional_iep_goal_projections/migration.sql
- no-chained-type-assertions.ts
- testAuthRoutes.test.ts
- dependencies
- browserPersistence.test.ts
- anti-slop Vendored Rules README
- "public"."LearningJourneyProject"
- 20260826000000_observation_management/migration.sql
- exportFormatContracts.test.ts
- main.tsx
- "ImportRun"
- "public"."reject_event_mutation"
- "public"."protect_completed_observation"
- "public"."validate_observation_context"
- "public"."validate_scope_tenant"
- db-backup.sh
- db-restore.sh
- authCleanup.test.ts
- vite-env.d.ts
- Google OAuth configuration
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
1. `@prisma/client` - 90 edges
2. `HttpError` - 86 edges
3. `vitest` - 77 edges
4. `useApp()` - 50 edges
5. `express` - 50 edges
6. `react` - 40 edges
7. `isRequestCancelled()` - 37 edges
8. `parseRequest()` - 35 edges
9. `scripts` - 35 edges
10. `MembershipScope` - 31 edges

## Surprising Connections (you probably didn't know these)
- `post()` --indirect_call--> `csrf()`  [INFERRED]
  apps/api/test/integration/learningJourneyWorkflow.integration.test.ts → e2e/p5-weekly-reports.spec.ts
- `mutate()` --indirect_call--> `csrf()`  [INFERRED]
  apps/api/test/integration/observationManagement.integration.test.ts → e2e/p5-weekly-reports.spec.ts
- `put()` --indirect_call--> `csrf()`  [INFERRED]
  apps/api/test/integration/resources.integration.test.ts → e2e/p5-weekly-reports.spec.ts
- `mutate()` --indirect_call--> `csrf()`  [INFERRED]
  apps/api/test/integration/fedcObservations.integration.test.ts → e2e/p5-weekly-reports.spec.ts
- `mutate()` --indirect_call--> `csrf()`  [INFERRED]
  apps/api/test/integration/sensoryProfileObservations.integration.test.ts → e2e/p5-weekly-reports.spec.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Prototype import rehearsal and rollback documentation pipeline** — docs_operations_prototype_import_rollout_doc, docs_operations_backup_and_restore_doc, docs_operations_prototype_import_rehearsal_2026_08_24_local_doc, docs_operations_prototype_import_rehearsal_template_doc [EXTRACTED 1.00]
- **Shared aggregate + append-only WorkflowEvent transition pattern** — docs_domain_model_learning_journey_transitions, docs_domain_model_iep_transitions, docs_domain_model_weekly_report_transitions, docs_api_conventions_learning_journey_workflow_commands [INFERRED 0.80]
- **Attendance E2E Compose Pipeline (CI-Driven)** — _github_workflows_ci_attendance_e2e_job, compose_e2e_db_service, compose_e2e_migrate_service, compose_e2e_fixture_service, compose_e2e_api_service, compose_e2e_web_service [INFERRED 0.85]
- **PostgreSQL db Service Pattern Across Compose Files** — compose_db_service, compose_dev_db_service, compose_e2e_db_service, compose_integration_db_service, compose_import_local_db_service [INFERRED 0.85]
- **Pre-merge Validation Command Set (format/lint/typecheck/test/build)** — _github_workflows_ci_validate_job, _github_pull_request_template_document, contributing_document [INFERRED 0.85]
- **Server-side trust boundary and deny-by-default enforcement pattern** — docs_adr_0001_application_architecture_browser_api_trust_boundary, docs_auth_authorization_matrix_doc, docs_auth_google_oauth_doc, docs_api_conventions_doc [INFERRED 0.85]

## Communities (193 total, 73 thin omitted)

### Community 0 - "weekly-reports.service.ts"
Cohesion: 0.05
Nodes (64): AchievementSource, appendReportAchievementEvents(), projectIepGoals(), utcDate(), createWeeklyReportController(), decision(), organizationPathSchema, reportPathSchema (+56 more)

### Community 1 - "aggregates.queries.ts"
Cohesion: 0.07
Nodes (53): apps_api_src_aggregateroutes_aggregateactiveassignedstudentids, apps_api_src_aggregateroutes_aggregateattendancesummary, apps_api_src_aggregateroutes_aggregatedatedobservationscope, apps_api_src_aggregateroutes_aggregatejourneyscopewhere, apps_api_src_aggregateroutes_aggregatenotifications, apps_api_src_aggregateroutes_aggregatesearchitems, apps_api_src_aggregateroutes_aggregatestudentscopewhere, apps_api_src_aggregateroutes_canreportobservationaggregates (+45 more)

### Community 2 - "ieps.service.ts"
Cohesion: 0.06
Nodes (58): isoDate(), mapIep(), mapIepCommon(), mapIepList(), stringArray(), activeAssignedStudentIds(), assertIepStudentScope(), assignedRoles (+50 more)

### Community 3 - "vitest"
Cohesion: 0.05
Nodes (45): apps_api_src_authroutes_createauthrouter, AppConfig, logLevels, placeholderValues, rawEnvironmentSchema, apps_api_src_httpcookies_appendcookie, config, csrfApp() (+37 more)

### Community 4 - "people.ts"
Cohesion: 0.03
Nodes (58): accountStatusSchema, activeGpkAssignmentSummarySchema, AttendanceBulkSaveCommand, attendanceBulkSaveCommandSchema, AttendanceBulkSaveResponse, attendanceBulkSaveResponseSchema, AttendanceQuery, attendanceQuerySchema (+50 more)

### Community 5 - "padding-line-between-statements.ts"
Cohesion: 0.06
Nodes (47): isClosingBraceToken(), isFunction(), isNotSemicolonToken(), isParenthesized(), isSemicolonToken(), isSingleLine(), isTokenOnSameLine(), isTopLevelExpressionStatement() (+39 more)

### Community 6 - "authorization.ts"
Cohesion: 0.08
Nodes (43): AuditAppender, AuthorizationDeniedError, authorizeWithAudit(), MembershipScope, Permission, permissionsByRole, requireOrganizationScope(), requirePermission() (+35 more)

### Community 7 - "resourceRoutes.ts"
Cohesion: 0.08
Nodes (39): createAcademicsController(), createAcademicsRouter(), createGpkController(), createGpkRouter(), createGpkService(), GpkService, createOrganizationAccountsController(), createOrganizationsController() (+31 more)

### Community 8 - "HttpError"
Cohesion: 0.20
Nodes (36): createAuditRepository(), apps_api_src_authroutes_createcsrfprotection, registerAssignmentDeleteRoute(), AssignmentRow, assignmentSelect, eligibleAssigneeRoles, hasObservationRecord(), mapAssignment() (+28 more)

### Community 9 - "20260819000000_initial/migration.sql"
Cohesion: 0.07
Nodes (44): "AttendanceRecord_class_tenant", "AttendanceRecord_enrollment_tenant", "AttendanceRecord_student_tenant", "Enrollment_class_tenant", "Enrollment_student_tenant", "Enrollment_year_tenant", "FEDCObservation_assignment_tenant", "FEDCObservation_definition_tenant" (+36 more)

### Community 10 - "api/observationService.ts"
Cohesion: 0.09
Nodes (44): ApiAssignment, ApiDefinition, asRecord(), booleanValue(), ContractSchemas, dateOnly(), fallbackFedcCommandSchema, fallbackFedcObservationsResponseSchema (+36 more)

### Community 11 - "app.ts"
Cohesion: 0.08
Nodes (30): apps_api_src_aggregateroutes_createaggregaterouter, AppDependencies, createApp(), loadConfig(), createDatabase(), Database, IncompatibleDatabaseSchemaError, PrismaDatabaseClient (+22 more)

### Community 12 - "AppContext.tsx"
Cohesion: 0.09
Nodes (34): AdministrationDataStatus, administrationErrorMessage(), useAuthorizedDirectory(), NavigationTab, ObservationTargets, SpecialEdSubTab, useNavigationState(), useObservationState() (+26 more)

### Community 13 - "iep.ts"
Cohesion: 0.05
Nodes (42): accommodationWriteSchema, actorSchema, addUniquePositions(), goalWriteSchema, Iep, iepAccommodationCategorySchema, iepAccommodationSchema, IepCreateCommand (+34 more)

### Community 14 - ""public"."Organization""
Cohesion: 0.07
Nodes (44): AuditEvent_organizationId_occurredAt_idx, AuditEvent_organizationId_targetType_targetId_occurredAt_idx, AuditEvent_requestId_idx, FEDCObservation_assignmentId_key, FEDCObservation_organizationId_studentId_observationDate_idx, GuardianContact_organizationId_studentId_idx, Membership_organizationId_role_status_idx, Membership_organizationId_userId_key (+36 more)

### Community 15 - "README.md"
Cohesion: 0.08
Nodes (39): Done, Commit, Next Skill Workflow, .env.example (Safe Environment Template), Pull Request Template, CI attendance-e2e job, CI validate job, CI Workflow (GitHub Actions), .nvmrc (Pinned Node.js Version), apps/api/Dockerfile (Multi-stage: runtime/migration targets) (+31 more)

### Community 16 - "learning-journeys.service.ts"
Cohesion: 0.08
Nodes (37): isoDate(), LearningJourneyWorkflowEvent, mapLearningJourney(), assertLearningJourneyWriteScope(), denyLearningJourneyAccess(), learningJourneyScopeWhere(), requireLearningJourneyPermission(), dateAtUtcMidnight() (+29 more)

### Community 17 - "useApp"
Cohesion: 0.09
Nodes (27): AuthenticatedApplication(), LearningJourneyCalendar, MainContent(), ObservationReferenceDrawer, ReportsAnalyticsView, ToastContainer(), useApp(), AuthGate() (+19 more)

### Community 18 - "openapi.ts"
Cohesion: 0.07
Nodes (38): assignmentParameter, classParameter, collectionOperation(), components, csrfParameter, definitionParameter, errorResponses, generateOpenApiDocument() (+30 more)

### Community 19 - "sfa.ts"
Cohesion: 0.05
Nodes (39): sfaActivityPerformanceCommandSchema, SfaActivityPerformanceRating, sfaActivityPerformanceRatingSchema, sfaAdaptationsCommandSchema, SfaDefinitionBody, sfaDefinitionBodySchema, sfaDefinitionItemSchema, sfaDefinitionProjectionSchema (+31 more)

### Community 20 - "pages/WeeklyReportView.tsx"
Cohesion: 0.09
Nodes (26): WeeklyReportView, StatusBadge(), StatusBadgeProps, WeeklyReport, clampIsoWeekForYear(), findWeeklyReportForStudent(), testState, reportYearOptions() (+18 more)

### Community 21 - "learning-journeys.ts"
Cohesion: 0.05
Nodes (37): addUniquePositionIssues(), connectionCommandSchema, learningJourneyBaseSchema, learningJourneyCollectionItemSchema, learningJourneyConnectionSchema, LearningJourneyCreateCommand, learningJourneyCreateCommandSchema, learningJourneyDecisionFields (+29 more)

### Community 22 - "importService.ts"
Cohesion: 0.12
Nodes (32): apps_api_src_iepgoalprojection_appendreportachievementevents, apps_api_src_iepgoalprojection_projectiepgoals, addCount(), addRepeatSkips(), dateOnly(), dateTime(), DryRunRollback, findImportRun() (+24 more)

### Community 23 - "observationSchemas.ts"
Cohesion: 0.08
Nodes (33): fedcCompletePayloadSchema, fedcCreateDraftPayloadSchema, fedcPayloadSchema, fedcSaveDraftPayloadSchema, sensoryProfileCompletePayloadSchema, sensoryProfileCreateDraftPayloadSchema, sensoryProfilePayloadSchema, sensoryProfileSaveDraftPayloadSchema (+25 more)

### Community 24 - "ObservationManagementPage.tsx"
Cohesion: 0.09
Nodes (27): ObservationPage, definitionCreateCommand(), definitionVersionCommand(), errorMessage(), ObservationDataStatus, useObservationData(), CoordinatorTab, ObservationManagementPage() (+19 more)

### Community 25 - "sensory-profile/SensoryProfileView.tsx"
Cohesion: 0.09
Nodes (28): observationService, SensoryObservationCommand, SensoryObservationReference, ObservationHistoryViewer(), recordFedcMilestones(), recordSensorySections(), recordSfaDefinition(), ObservationReferenceDrawer() (+20 more)

### Community 26 - "anti-slop/index.ts"
Cohesion: 0.10
Nodes (25): @oxlint/plugins, antiSlopPlugin, noArrayFilterMapRule, isConditionalEmptyObjectSpread(), isEmptyObjectExpression(), noConditionalEmptyObjectSpreadRule, unwrapParentheses(), importedName() (+17 more)

### Community 27 - "scripts"
Cohesion: 0.06
Nodes (35): scripts, build, clean, db:backup, db:import, db:import:prepare-local, db:migrate:deploy, db:migrate:dev (+27 more)

### Community 28 - "api/iepService.ts"
Cohesion: 0.14
Nodes (30): accommodationCommand(), accommodations(), arrayValue(), asRecord(), booleanValue(), commandFor(), ContractSchemas, dateOnly() (+22 more)

### Community 29 - "fedc.ts"
Cohesion: 0.06
Nodes (33): FedcDefinitionBody, fedcDefinitionBodySchema, fedcDefinitionItemSchema, fedcDefinitionMilestoneSchema, fedcDefinitionProjectionSchema, fedcMilestoneScoresSchema, FedcObservation, FedcObservationCompleteCommand (+25 more)

### Community 30 - "observation-management.ts"
Cohesion: 0.10
Nodes (31): strictBooleanSchema, jsonPrimitiveSchema, JsonValue, jsonValueSchema, observationAssigneeSummarySchema, ObservationAssignment, ObservationAssignmentCancelCommand, observationAssignmentCancelCommandSchema (+23 more)

### Community 31 - "sensory-profile.ts"
Cohesion: 0.06
Nodes (32): observationPersonSummarySchema, studentSummarySchema, SensoryProfileDefinitionBody, sensoryProfileDefinitionBodySchema, sensoryProfileDefinitionItemSchema, sensoryProfileDefinitionProjectionSchema, sensoryProfileDraftWriteFields, SensoryProfileObservation (+24 more)

### Community 32 - "apps_api_src_sessionservice_sessionservice"
Cohesion: 0.12
Nodes (19): apps_api_src_authroutes_createrequiredauthentication, AggregateSearchQueryService, createIepRepository(), createIepRouter(), createLearningJourneyController(), requireAuth(), createLearningJourneyRepository(), createLearningJourneyRouter() (+11 more)

### Community 33 - "p5-ieps.spec.ts"
Cohesion: 0.06
Nodes (7): fixture, fixture, fixture, fixture, fixture, fixture, @playwright/test

### Community 34 - "exportFormat.ts"
Cohesion: 0.06
Nodes (30): addDuplicateIssues(), dateSchema, dateTimeSchema, LEARNSPACE_EXPORT_FORMAT, LEARNSPACE_EXPORT_LIMITS, LEARNSPACE_EXPORT_MAX_BYTES, LEARNSPACE_EXPORT_VERSION, LearnspaceExport (+22 more)

### Community 35 - "weeklyReport.ts"
Cohesion: 0.08
Nodes (31): packages_contracts_src_resources_collectionmetaschema, packages_contracts_src_resources_schooldateschema, packages_contracts_src_resources_staffmembershiproleschema, packages_contracts_src_resources_uuidschema, packages_contracts_src_resources_workflowstateschema, actorSchema, isoWeekForDate(), isoWeekMonday() (+23 more)

### Community 36 - "packages_contracts_dist_index"
Cohesion: 0.14
Nodes (21): createAttendanceController(), requireAuth(), attendanceVersion(), mapAttendanceRoster(), attendanceMembershipFor(), deny(), leadershipRoles, requireAttendanceClassScope() (+13 more)

### Community 37 - "types.ts"
Cohesion: 0.11
Nodes (23): IEPPlanView, IEPStatusTracker(), IEPStatusTrackerProps, errorMessage(), LoadStatus, useIEPs(), IEP_TABS, IEPPlanView() (+15 more)

### Community 38 - "api/learningJourneyService.ts"
Cohesion: 0.12
Nodes (20): LearningJourneyEditor, journeyCommand(), mapJourneyToLegacy(), monthBoundary(), monthIndexes, monthLabel(), roleLabel(), id (+12 more)

### Community 39 - "type-alias-resolution.ts"
Cohesion: 0.11
Nodes (25): FunctionWithReturnType, noUnknownReturnsRule, noUnknownTypeAliasesRule, collectInferTypeParameterNames(), isNode(), lexicalTypeParameterNames(), VisitorKeys, aliasSubstitutions() (+17 more)

### Community 40 - "dictionary-types.ts"
Cohesion: 0.18
Nodes (27): aliasSubstitution(), BUILT_INS, classifyAliasBroadTarget(), classifyWideningTarget(), createTypeEnvironment(), declaredStatement(), dictionaryValueTypes(), hasBroadRecordKey() (+19 more)

### Community 41 - "oauth.service.ts"
Cohesion: 0.15
Nodes (15): GoogleClaims, googleJwks, isUniqueConstraintError(), normalizeRedirectPath(), OAuthContext, OAuthDeniedError, OAuthService, verifyGoogleIdToken() (+7 more)

### Community 42 - "sfa/SFAObservationView.tsx"
Cohesion: 0.12
Nodes (21): SFAObservationCommand, SFAObservationReference, cleanRespondents(), errorMessage(), Props, provisionalParticipation(), SFAObservationView(), SfaTab (+13 more)

### Community 43 - "iepManagement.integration.test.ts"
Cohesion: 0.10
Nodes (20): apps_api_src_resourceroutes_default_gpk_max_caseload, config, cookie(), logger, postIep(), putIep(), workflow(), authenticatedCookie() (+12 more)

### Community 44 - "20260827050000_aggregate_search_indexes/migration.sql"
Cohesion: 0.11
Nodes (24): apps_web_src_services_weeklyreportservice_weeklyreport, IEPGoal, LearningJourney, "IEP", "ObservationAssignment", "prevent_non_draft_weekly_report_change", WeeklyReport_organizationId_studentId_year_weekNumber_key, "WeeklyReport_prevent_non_draft_update" (+16 more)

### Community 45 - ""public"."IEP""
Cohesion: 0.09
Nodes (26): GoalAchievementEvent_organizationId_goalId_occurredAt_idx, IEP_organizationId_academicYearId_idx, IEP_organizationId_studentId_state_idx, IEPAccommodation_iepId_category_position_key, IEPGoal_id_iepId_key, IEPGoal_iepId_code_key, IEPGoal_iepId_position_key, IEPPerformanceArea_iepId_position_key (+18 more)

### Community 46 - "auth.routes.ts"
Cohesion: 0.19
Nodes (21): permissionsForRole(), AuthenticatedRequest, createAuthRouter(), createCsrfProtection(), createRequiredAuthentication(), safeError(), secureCookies(), sessionPayload() (+13 more)

### Community 47 - "express"
Cohesion: 0.16
Nodes (19): apps_api_src_authroutes_authenticatedrequest, aggregateOrganizationId(), organizationPathSchema, aggregateMembershipFor(), requireAggregateAuth(), createAggregateSearchController(), createIepController(), iepPathSchema (+11 more)

### Community 48 - "fedc/FEDCObservationView.tsx"
Cohesion: 0.12
Nodes (19): FEDCObservationCommand, FEDCObservationReference, FEDCObservationView(), Props, provisionalScores(), RATING_WEIGHTS, assignment, definitionBody (+11 more)

### Community 49 - "isRequestCancelled"
Cohesion: 0.16
Nodes (18): AppShell(), currentGradeIds, currentPermissions, navigateToAttendanceStudent, navigateToIEP, navigateToObservation, navigateToWeeklyReport, setSearchQuery (+10 more)

### Community 50 - ""public"."protect_tenant_ownership""
Cohesion: 0.08
Nodes (24): "AcademicYear_tenant_immutable", "AttendanceRecord_tenant_immutable", "AuditEvent_tenant_immutable", "Enrollment_tenant_immutable", "FEDCObservation_tenant_immutable", "GoalAchievementEvent_tenant_immutable", "Grade_tenant_immutable", "GuardianContact_tenant_immutable" (+16 more)

### Community 51 - "audit.ts"
Cohesion: 0.12
Nodes (16): AuditMetadata, auditMetadataSchema, AuditResultValue, CreateAuditEventInput, fieldName, safeText, sanitizeAuditMetadata(), mapOrganizationAccount() (+8 more)

### Community 52 - "package.json"
Cohesion: 0.11
Nodes (19): prisma, dependencies, @prisma/client, engines, node, npm, name, private (+11 more)

### Community 53 - ""public"."Enrollment""
Cohesion: 0.10
Nodes (22): AttendanceRecord_organizationId_schoolDate_classId_idx, AttendanceRecord_organizationId_studentId_classId_schoolDat_key, AttendanceRecord_organizationId_studentId_schoolDate_idx, Enrollment_organizationId_classId_startsOn_endsOn_idx, Enrollment_organizationId_studentId_startsOn_endsOn_idx, Enrollment_studentId_academicYearId_classId_startsOn_key, Grade_organizationId_code_key, Grade_organizationId_unitId_idx (+14 more)

### Community 54 - "prepare-local-import-rehearsal.ts"
Cohesion: 0.15
Nodes (14): REHEARSAL_FEDC_OBSERVATIONS, REHEARSAL_IEPS, REHEARSAL_LEARNING_JOURNEYS, REHEARSAL_OBSERVATION_ASSIGNMENTS, REHEARSAL_OBSERVATION_DEFINITIONS, REHEARSAL_SENSORY_PROFILE_OBSERVATIONS, REHEARSAL_SFA_OBSERVATIONS, REHEARSAL_STUDENTS (+6 more)

### Community 55 - "no-known-value-widening.ts"
Cohesion: 0.19
Nodes (19): annotationTarget(), FunctionExpression, functionName(), hasInformativeType(), hasKnownCallArgumentEvidence(), hasKnownEvidence(), isDictionaryAccumulatorTarget(), isEmptyObjectExpression() (+11 more)

### Community 56 - "no-widen-then-assert.ts"
Cohesion: 0.23
Nodes (21): assertedExpression(), assertionFromExpression(), assertionIsNarrower(), BroadTypeKind, functionBoundary(), functionBoundaryTypes, isBroadRecordKeyType(), isBroadRecordType() (+13 more)

### Community 57 - "api/organizationAdministrationService.ts"
Cohesion: 0.11
Nodes (16): AcademicsService, organizationAdministrationService, account, packages_contracts_dist_index_academicyearsresponseschema, packages_contracts_dist_index_classesresponseschema, packages_contracts_dist_index_gradesresponseschema, packages_contracts_dist_index_organizationaccountmutationresponse, packages_contracts_dist_index_organizationaccountmutationresponseschema (+8 more)

### Community 58 - "pages/PeopleAccessView.tsx"
Cohesion: 0.11
Nodes (16): PeopleAccessView, Account, emptyForm, Feedback, formForAccount(), FormState, Option, PeopleAccessView() (+8 more)

### Community 59 - "scripts"
Cohesion: 0.10
Nodes (20): scripts, build, db:import, db:migrate:deploy, db:migrate:dev, db:migrate:status, db:seed, db:seed:e2e (+12 more)

### Community 60 - "learning-journeys.controller.ts"
Cohesion: 0.13
Nodes (18): journeyPathSchema, organizationPathSchema, LearningJourneyService, packages_contracts_dist_index_attendancestatusschema, packages_contracts_dist_index_learningjourneycreatecommandschema, packages_contracts_dist_index_learningjourneydetailresponseschema, packages_contracts_dist_index_learningjourneydirectorreviewcommandschema, packages_contracts_dist_index_learningjourneylistqueryschema (+10 more)

### Community 61 - "readImportFile.ts"
Cohesion: 0.17
Nodes (13): parseJson(), readExportFile(), readImportManifest(), Arguments, parseImportArguments(), runImportCli(), temporaryDirectories, valid (+5 more)

### Community 62 - "AttendancePage.tsx"
Cohesion: 0.14
Nodes (15): AttendancePage, AttendancePage(), displaySchoolDate(), DraftMap, DraftRecord, draftsFromRoster(), errorMessage(), formatDateParts() (+7 more)

### Community 63 - "aggregates.ts"
Cohesion: 0.10
Nodes (19): AggregateNotification, aggregateNotificationSchema, AggregateNotificationsResponse, aggregateNotificationsResponseSchema, AggregateSearchItem, aggregateSearchItemSchema, AggregateSearchQuery, aggregateSearchQuerySchema (+11 more)

### Community 64 - "academics.ts"
Cohesion: 0.11
Nodes (18): academicYearSchema, AcademicYearsResponse, academicYearsResponseSchema, ClassesResponse, classesResponseSchema, classSchema, gradeSchema, GradesResponse (+10 more)

### Community 65 - "@prisma/client"
Cohesion: 0.22
Nodes (14): DefinitionRow, definitionSelect, mapDefinition(), FedcObservationRow, fedcObservationSelect, mapFedcObservation(), isoDate(), mapSensoryProfileObservation() (+6 more)

### Community 66 - "api/attendanceService.ts"
Cohesion: 0.12
Nodes (14): attendanceService, classesResponse, mockedAttendanceService, mockedUseApp, mockedUseAuth, rosterResponse, schoolClass, setAttendanceTarget (+6 more)

### Community 67 - "Prototype import rehearsal report — 2026-08-24 (local Docker)"
Cohesion: 0.13
Nodes (18): Docker Compose services (web/api/db), Prototype data migration approach, npm run db:backup script, npm run db:restore script, PostgreSQL backup and restore runbook, Prototype import rehearsal report — 2026-08-24 (local Docker), Prototype import rehearsal template, Administrative importer CLI (db:import) (+10 more)

### Community 68 - "contracts/package.json"
Cohesion: 0.11
Nodes (17): dependencies, zod, devDependencies, typescript, exports, files, typescript, zod (+9 more)

### Community 69 - "sfaScoring.ts"
Cohesion: 0.17
Nodes (14): parseDefinition(), parseResponses(), scoreSfaResponses(), SfaScoringError, completeInput, definitionBody, packages_contracts_dist_index_schooldateschema, packages_contracts_dist_index_sfaactivityperformancecommandschema (+6 more)

### Community 70 - "legacyStorageReader.ts"
Cohesion: 0.21
Nodes (12): LegacyExportTool(), buildLegacyExport(), downloadLegacyExport(), JSON_COLLECTION_KEYS, LEGACY_STORAGE_KEYS, LegacyExportError, parseCollection(), student (+4 more)

### Community 71 - "apiClient.ts"
Cohesion: 0.18
Nodes (12): authService, apiClient, ApiClientError, ApiErrorCategory, apiRequest(), ApiRequestOptions, categoryForStatus(), parseJson() (+4 more)

### Community 72 - "organizations.ts"
Cohesion: 0.14
Nodes (15): collectionMetaSchema, nullableTrimmedText(), schoolDateSchema, uuidSchema, ianaTimezoneSchema, OrganizationSchoolDateResponse, organizationSchoolDateResponseSchema, OrganizationSettingsResponse (+7 more)

### Community 73 - "web/package.json"
Cohesion: 0.14
Nodes (14): @types/node, typescript, name, private, type, version, jsdom, @learnspace/contracts (+6 more)

### Community 74 - "learning-journeys/hooks/useLearningJourneys.ts"
Cohesion: 0.17
Nodes (12): LearningJourneyStatusTracker, learningJourneyService, emptyMetadata, LearningJourneyFilterInput, LearningJourneyMetadata, metadataCache, useLearningJourneys(), LearningJourneyStatusTracker() (+4 more)

### Community 75 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+7 more)

### Community 76 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, rootDir (+6 more)

### Community 77 - ""public"."LearningJourney""
Cohesion: 0.14
Nodes (15): AcademicYear_organizationId_name_key, AcademicYear_organizationId_startsOn_endsOn_idx, LearningJourney_organizationId_academicYearId_semesterId_gr_key, LearningJourney_organizationId_state_idx, "public"."AcademicYear", "public"."LearningJourney", "public"."LearningJourneyOwner", "public"."MembershipSubject" (+7 more)

### Community 78 - "api/package.json"
Cohesion: 0.14
Nodes (13): @learnspace/contracts, @prisma/client, vitest, zod, main, name, private, type (+5 more)

### Community 79 - "oauthService.test.ts"
Cohesion: 0.14
Nodes (8): apps_api_src_authcrypto_hashtoken, apps_api_src_authcrypto_openjson, apps_api_src_oauthservice_oauthcontext, apps_api_src_oauthservice_oauthdeniederror, apps_api_src_oauthservice_oauthservice, config, fetchTokens, verifyIdToken

### Community 80 - "database.integration.test.ts"
Cohesion: 0.23
Nodes (9): assertSeedAllowed(), seedEnvironmentSchema, e2eFixture, main(), seedE2eDatabase(), sfaDefinitionBody, main(), seedDatabase() (+1 more)

### Community 81 - ""public"."validate_active_organization_user""
Cohesion: 0.14
Nodes (14): "AttendanceRecord_recorder_membership", "AuditEvent_actor_membership", "FEDCObservation_observer_membership", "GoalAchievementEvent_actor_membership", "IEP_creator_membership", "IEP_updater_membership", "LearningJourney_creator_membership", "LearningJourney_updater_membership" (+6 more)

### Community 82 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-unused-imports, oxlint, @oxlint/plugins (+5 more)

### Community 83 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, declaration, declarationMap, module, moduleResolution, outDir, rootDir, skipLibCheck (+4 more)

### Community 84 - "no-object-parameters.ts"
Cohesion: 0.29
Nodes (10): typePredicateSubjectIndex(), noObjectParametersRule, ParameterOwner, isTypePredicateSubject(), noUnknownParametersRule, ParameterOwner, containsUnknownType(), FunctionParameter (+2 more)

### Community 85 - "sensoryProfileScoring.ts"
Cohesion: 0.24
Nodes (9): parseDefinition(), scoreSensoryProfileResponses(), sectionKeys, SensoryProfileScoringError, definitionBody, packages_contracts_dist_index_sensoryprofiledefinitionbody, packages_contracts_dist_index_sensoryprofiledefinitionbodyschema, packages_contracts_dist_index_sensoryprofileresponsescommandschema (+1 more)

### Community 86 - "20260827000000_iep_contracts_and_immutability/migration.sql"
Cohesion: 0.23
Nodes (10): "IEP_historical_immutable", "IEPAccommodation_historical_immutable", "IEPGoal_historical_immutable", "IEPPerformanceArea_historical_immutable", "IEPServiceSchedule_historical_immutable", "IEPTeamMember_historical_immutable", "public"."protect_historical_iep_child"(), "public"."IEP" (+2 more)

### Community 87 - "no-reduce-accumulator-copy.ts"
Cohesion: 0.45
Nodes (9): enclosingReducer(), isGlobalCopyOwner(), noReduceAccumulatorCopyRule, referencesAccumulator(), arrayMethodTarget(), isArrayAnnotation(), isKnownArrayExpression(), resolveArrayBinding() (+1 more)

### Community 88 - "fedcScoring.ts"
Cohesion: 0.24
Nodes (9): FedcScoringError, parseDefinition(), ratingScores, scoreFedcResponses(), packages_contracts_dist_index_fedcdefinitionbody, packages_contracts_dist_index_fedcdefinitionbodyschema, packages_contracts_dist_index_fedcrating, packages_contracts_dist_index_fedcresponsescommandschema (+1 more)

### Community 89 - "@testing-library/react"
Cohesion: 0.18
Nodes (8): App(), dashboard, session, navigateToWeeklyReportTracker, payload, setActiveTab, @testing-library/jest-dom, @testing-library/react

### Community 90 - "api/aggregateService.ts"
Cohesion: 0.20
Nodes (8): aggregateService, packages_contracts_dist_index_aggregatenotificationsresponse, packages_contracts_dist_index_aggregatesearchresponse, packages_contracts_dist_index_aggregatesearchresponseschema, packages_contracts_dist_index_dashboardsummaryresponse, packages_contracts_dist_index_dashboardsummaryresponseschema, packages_contracts_dist_index_reportingaggregateresponse, packages_contracts_dist_index_reportingaggregateresponseschema

### Community 91 - "api/observationService.test.ts"
Cohesion: 0.18
Nodes (9): assignment, definition, fedcCommand, fedcObservation, sensoryCommand, sensoryObservation, sfaCommand, sfaObservation (+1 more)

### Community 92 - "no-unsafe-dictionary-type.ts"
Cohesion: 0.33
Nodes (10): isInsideTypeAliasDeclaration(), isInsideTypeParameterConstraint(), isPlainAliasConsumerUse(), isTypeNode(), noUnsafeDictionaryTypeRule, shouldReportType(), typeNodeKinds, typeReferenceName() (+2 more)

### Community 93 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 94 - "src/index.ts"
Cohesion: 0.20
Nodes (9): ApiError, apiErrorSchema, CurrentSessionResponse, currentSessionResponseSchema, HealthResponse, healthResponseSchema, membershipRoleSchema, VersionResponse (+1 more)

### Community 95 - "require-safety-comment-for-type-assertion.ts"
Cohesion: 0.31
Nodes (9): commentOwnerKinds, configuredSafetyMarkers(), DEFAULT_SAFETY_MARKERS, hasSafetyComment(), hasSafetyJustificationBefore(), isConstAssertion(), markerPattern(), requireSafetyCommentForTypeAssertionRule (+1 more)

### Community 96 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, prisma, supertest, tsx, @types/express, @types/node, @types/supertest, typescript (+1 more)

### Community 97 - "sfaObservations.integration.test.ts"
Cohesion: 0.22
Nodes (6): authenticatedCookie(), completeResponses, config, definitionBody, logger, mutate()

### Community 98 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, @learnspace/contracts, lucide-react, motion, react, react-dom, @tailwindcss/vite, vite (+1 more)

### Community 99 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, jsdom, @testing-library/jest-dom, @testing-library/react, @types/node, @types/react, @types/react-dom, typescript (+1 more)

### Community 100 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, prebuild, pretest, pretypecheck, preview, test (+1 more)

### Community 101 - "20260820000000_google_oauth_authorization/migration.sql"
Cohesion: 0.33
Nodes (8): OAuthLoginTransaction_expiresAt_consumedAt_idx, OAuthLoginTransaction_stateHash_key, "public"."OAuthLoginTransaction", "public"."UserInvitation", "public"."User", UserInvitation_email_expiresAt_acceptedAt_idx, UserInvitation_organizationId_email_idx, "public"."Organization"

### Community 102 - "importService.test.ts"
Cohesion: 0.29
Nodes (5): ImportManifest, importManifestSchema, uuidMapSchema, document, manifest

### Community 103 - "20260827020000_weekly_report_workflow/migration.sql"
Cohesion: 0.25
Nodes (4): "WeeklyReport_prevent_non_draft_update", "WorkflowEvent_prevent_weekly_report_history_change", "public"."prevent_non_draft_weekly_report_change", "public"."prevent_weekly_report_workflow_event_change"

### Community 104 - "20260827030000_transactional_iep_goal_projections/migration.sql"
Cohesion: 0.29
Nodes (7): GoalAchievementEvent_weeklyReportId_goalId_sourceReportVersion_key, IEPGoal_achievedEventId_key, "public"."protect_historical_iep_child"(), "public"."IEP", "public"."WeeklyReport", "public"."GoalAchievementEvent", "public"."IEPGoal"

### Community 105 - "no-chained-type-assertions.ts"
Cohesion: 0.46
Nodes (7): isConstAssertion(), isForbiddenAssertionChain(), isOutermostAssertionInChain(), isTypeAssertionExpression(), noChainedTypeAssertionsRule, TypeAssertionExpression, unwrapParenthesizedExpression()

### Community 106 - "testAuthRoutes.test.ts"
Cohesion: 0.33
Nodes (5): apps_api_src_testauthroutes_createtestauthrouter, apps_api_src_testauthroutes_e2eauthheadername, apps_api_src_testauthroutes_e2eauthuserheadername, testApp(), testConfig

### Community 107 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, express, jose, @learnspace/contracts, @prisma/client, zod

### Community 108 - "browserPersistence.test.ts"
Cohesion: 0.33
Nodes (4): allowedLegacyReaders, sensitiveLegacyKeys, sourceExtensions, sourceRoot

### Community 109 - "anti-slop Vendored Rules README"
Cohesion: 0.33
Nodes (6): oxlint.config.ts jsPlugins Registration, anti-slop Vendored Rules README, Vendoring Pattern (Effect-specific rules/tests omitted), Vendored padding-line-between-statements Upstream Notes, Local Adaptations for Oxlint Compatibility, require-readable-spacing Oxlint Rule Policy

### Community 110 - ""public"."LearningJourneyProject""
Cohesion: 0.33
Nodes (6): CrossCurricularConnection_projectId_position_key, LearningGoal_projectId_position_key, LearningJourneyProject_learningJourneyId_position_key, "public"."CrossCurricularConnection", "public"."LearningGoal", "public"."LearningJourneyProject"

### Community 111 - "20260826000000_observation_management/migration.sql"
Cohesion: 0.33
Nodes (5): ObservationAssignment_cancelledById_idx, "ObservationAssignment_canceller_membership", "public"."User", "public"."validate_active_organization_user", "public"."ObservationAssignment"

### Community 112 - "exportFormatContracts.test.ts"
Cohesion: 0.40
Nodes (3): packages_contracts_dist_index_learnspace_export_limits, packages_contracts_dist_index_learnspaceexportschema, packages_contracts_dist_index_learnspaceexportv1schema

### Community 113 - "main.tsx"
Cohesion: 0.40
Nodes (3): apps_web_src_index, root, react-dom

### Community 114 - ""ImportRun""
Cohesion: 0.60
Nodes (4): "Organization", "ImportRun", ImportRun_organizationId_appliedAt_idx, ImportRun_organizationId_sourceKey_key

### Community 115 - ""public"."reject_event_mutation""
Cohesion: 0.50
Nodes (4): "AuditEvent_append_only", "GoalAchievementEvent_append_only", "WorkflowEvent_append_only", "public"."reject_event_mutation"

### Community 116 - ""public"."protect_completed_observation""
Cohesion: 0.50
Nodes (4): "FEDCObservation_completed_immutable", "SensoryProfileObservation_completed_immutable", "SFAObservation_completed_immutable", "public"."protect_completed_observation"

### Community 117 - ""public"."validate_observation_context""
Cohesion: 0.50
Nodes (4): "FEDCObservation_context", "SensoryProfileObservation_context", "SFAObservation_context", "public"."validate_observation_context"

### Community 118 - ""public"."validate_scope_tenant""
Cohesion: 0.50
Nodes (4): "MembershipGrade_tenant", "MembershipSubject_tenant", "MembershipUnit_tenant", "public"."validate_scope_tenant"

### Community 123 - "Google OAuth configuration"
Cohesion: 0.67
Nodes (3): Server-side opaque cookie sessions, Google OAuth configuration, P3-001 — Document Google OAuth setup

## Ambiguous Edges - Review These
- `Milestone 7 — Production hardening` → `PostgreSQL backup and restore runbook`  [AMBIGUOUS]
  docs/ROADMAP.md · relation: conceptually_related_to

## Knowledge Gaps
- **993 isolated node(s):** `WeeklyReportDatabase`, `WeeklyReportListQuery`, `WeeklyReportGoalProgress`, `WeeklyReportRecord`, `WeeklyReportResponse` (+988 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1276 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **73 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Milestone 7 — Production hardening` and `PostgreSQL backup and restore runbook`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `@prisma/client` connect `@prisma/client` to `weekly-reports.service.ts`, `aggregates.queries.ts`, `ieps.service.ts`, `vitest`, `authorization.ts`, `resourceRoutes.ts`, `HttpError`, `app.ts`, `learning-journeys.service.ts`, `importService.ts`, `apps_api_src_sessionservice_sessionservice`, `packages_contracts_dist_index`, `oauth.service.ts`, `iepManagement.integration.test.ts`, `auth.routes.ts`, `audit.ts`, `package.json`, `prepare-local-import-rehearsal.ts`, `readImportFile.ts`, `database.integration.test.ts`, `sfaObservations.integration.test.ts`, `importService.test.ts`?**
  _High betweenness centrality (0.195) - this node is a cross-community bridge._
- **Why does `@oxlint/plugins` connect `anti-slop/index.ts` to `padding-line-between-statements.ts`, `type-alias-resolution.ts`, `dictionary-types.ts`, `no-chained-type-assertions.ts`, `no-object-parameters.ts`, `package.json`, `no-reduce-accumulator-copy.ts`, `no-known-value-widening.ts`, `no-widen-then-assert.ts`, `no-unsafe-dictionary-type.ts`, `require-safety-comment-for-type-assertion.ts`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `vitest` connect `vitest` to `weekly-reports.service.ts`, `aggregates.queries.ts`, `ieps.service.ts`, `authorization.ts`, `app.ts`, `AppContext.tsx`, `learning-journeys.service.ts`, `openapi.ts`, `pages/WeeklyReportView.tsx`, `importService.ts`, `observationSchemas.ts`, `ObservationManagementPage.tsx`, `sensory-profile/SensoryProfileView.tsx`, `api/iepService.ts`, `apps_api_src_sessionservice_sessionservice`, `packages_contracts_dist_index`, `types.ts`, `api/learningJourneyService.ts`, `sfa/SFAObservationView.tsx`, `iepManagement.integration.test.ts`, `fedc/FEDCObservationView.tsx`, `isRequestCancelled`, `audit.ts`, `api/organizationAdministrationService.ts`, `pages/PeopleAccessView.tsx`, `learning-journeys.controller.ts`, `readImportFile.ts`, `api/attendanceService.ts`, `sfaScoring.ts`, `legacyStorageReader.ts`, `apiClient.ts`, `web/package.json`, `oauthService.test.ts`, `database.integration.test.ts`, `sensoryProfileScoring.ts`, `@testing-library/react`, `api/observationService.test.ts`, `sfaObservations.integration.test.ts`, `importService.test.ts`, `testAuthRoutes.test.ts`, `browserPersistence.test.ts`, `exportFormatContracts.test.ts`, `authCleanup.test.ts`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `useApp()` (e.g. with `AttendancePage.test.tsx` and `pages/IEPPlanView.test.tsx`) actually correct?**
  _`useApp()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `WeeklyReportDatabase`, `WeeklyReportListQuery`, `WeeklyReportGoalProgress` to the rest of the system?**
  _993 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `weekly-reports.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05228105228105228 - nodes in this community are weakly interconnected._