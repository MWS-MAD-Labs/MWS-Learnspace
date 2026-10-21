# Graph Report - MWS-Learnspace  (2026-10-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2961 nodes · 6641 edges · 190 communities (115 shown, 75 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 104 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e937927a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- fedc-observations-service.ts
- HttpError
- lib/config.ts
- useApp
- utils/aggregates.queries.ts
- api/observationService.ts
- people.ts
- padding-line-between-statements.ts
- api/weeklyReportService.ts
- AttendancePage.tsx
- isRequestCancelled
- 20260819000000_initial/migration.sql
- AppContext.tsx
- web/package.json
- prepare-local-import-rehearsal.ts
- iep.ts
- "public"."Organization"
- README.md
- students-service.ts
- fedc/FEDCObservationView.tsx
- sfa.ts
- application/openapi.ts
- packages_contracts_dist_index
- learning-journeys.ts
- types.ts
- express
- anti-slop/index.ts
- auth-controller.ts
- ObservationManagementPage.tsx
- scripts
- oauth-service.ts
- fedc.ts
- weekly-reports-service.ts
- api/iepService.ts
- observation-management.ts
- sensory-profile.ts
- exportFormat.ts
- weeklyReport.ts
- utils/authorization.ts
- @prisma/client
- learning-journeys-service.ts
- type-alias-resolution.ts
- dictionary-types.ts
- learning-journeys-controller.ts
- api/learningJourneyService.ts
- sfa/SFAObservationView.tsx
- import-service.ts
- "public"."IEP"
- apiClient.ts
- "public"."protect_tenant_ownership"
- SessionService
- 20260827050000_aggregate_search_indexes/migration.sql
- "public"."Enrollment"
- no-known-value-widening.ts
- no-widen-then-assert.ts
- scripts
- audit-service.ts
- read-import-file.test.ts
- aggregates.ts
- package.json
- application/app.ts
- vitest
- api/organizationAdministrationService.ts
- observation-management.test.ts
- academics.ts
- Prototype import rehearsal report — 2026-08-24 (local Docker)
- observation-validation.ts
- sfa-scoring.ts
- compilerOptions
- organizations.ts
- @playwright/test
- contracts/package.json
- "public"."LearningJourney"
- "public"."validate_active_organization_user"
- api/package.json
- fedc-scoring.ts
- e2e-seed.ts
- devDependencies
- compilerOptions
- no-object-parameters.ts
- export-format-contracts.test.ts
- sensory-profile-scoring.ts
- 20260827000000_iep_contracts_and_immutability/migration.sql
- no-reduce-accumulator-copy.ts
- compilerOptions
- compilerOptions
- no-unsafe-dictionary-type.ts
- compilerOptions
- read-import-file.ts
- learning-journeys/hooks/useLearningJourneys.ts
- src/index.ts
- require-safety-comment-for-type-assertion.ts
- devDependencies
- learning-journey-workflow.test.ts
- 20260820000000_google_oauth_authorization/migration.sql
- import-service.test.ts
- p5-ieps.spec.ts
- 20260827020000_weekly_report_workflow/migration.sql
- 20260827030000_transactional_iep_goal_projections/migration.sql
- no-chained-type-assertions.ts
- iep-contracts.test.ts
- dependencies
- iep-goal-projection-model.ts
- anti-slop Vendored Rules README
- "public"."LearningJourneyProject"
- 20260826000000_observation_management/migration.sql
- utils/weeklyReportDates.ts
- p5-observations.spec.ts
- "ImportRun"
- p5-weekly-reports.spec.ts
- 20260827040000_authorized_aggregates/migration.sql
- "public"."reject_event_mutation"
- "public"."protect_completed_observation"
- "public"."validate_observation_context"
- "public"."validate_scope_tenant"
- db-backup.sh
- db-restore.sh
- vite-env.d.ts
- Google OAuth configuration
- engines
- scripts
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
2. `vitest` - 79 edges
3. `@prisma/client` - 78 edges
4. `express` - 62 edges
5. `useApp()` - 50 edges
6. `SessionService` - 49 edges
7. `zod` - 43 edges
8. `react` - 40 edges
9. `isRequestCancelled()` - 37 edges
10. `createCsrfProtection()` - 36 edges

## Surprising Connections (you probably didn't know these)
- `mutate()` --indirect_call--> `csrf()`  [INFERRED]
  apps/api/src/test/integration/sfa-observations.integration.test.ts → e2e/p5-weekly-reports.spec.ts
- `Done, Commit, Next Skill Workflow` --semantically_similar_to--> `CI validate job`  [INFERRED] [semantically similar]
  .done-commit-next-SKILL.md → .github/workflows/ci.yml
- `compose.dev.yaml db override (publish 5432)` --semantically_similar_to--> `compose.import-local.yaml db override (publish 55432)`  [INFERRED] [semantically similar]
  compose.dev.yaml → compose.import-local.yaml
- `Done, Commit, Next Skill Workflow` --semantically_similar_to--> `Conventional Commit-style Messages`  [INFERRED] [semantically similar]
  .done-commit-next-SKILL.md → CONTRIBUTING.md
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

## Communities (190 total, 75 thin omitted)

### Community 0 - "fedc-observations-service.ts"
Cohesion: 0.10
Nodes (52): createFedcObservationsController(), createObservationAssignmentDeleteController(), createObservationAssignmentsController(), createObservationDefinitionsController(), createSensoryProfileObservationsController(), createSfaObservationsController(), FedcObservationRow, fedcObservationSelect (+44 more)

### Community 1 - "HttpError"
Cohesion: 0.06
Nodes (61): createIepController(), iepPathSchema, organizationPathSchema, requireAuth(), HttpError, iepDate(), IepListRow, iepListSelect (+53 more)

### Community 2 - "lib/config.ts"
Cohesion: 0.05
Nodes (47): logLevels, placeholderValues, rawEnvironmentSchema, DEFAULT_GPK_MAX_CASELOAD, config, logger, config, definitionBody (+39 more)

### Community 3 - "useApp"
Cohesion: 0.06
Nodes (43): AuthenticatedApplication(), IEPPlanView, LearningJourneyCalendar, LearningJourneyEditor, LearningJourneyStatusTracker, MainContent(), ReportsAnalyticsView, WeeklyReportView (+35 more)

### Community 4 - "utils/aggregates.queries.ts"
Cohesion: 0.07
Nodes (48): aggregateOrganizationId(), aggregateRequestContext(), organizationPathSchema, createDashboardController(), createReportingController(), createAggregateSearchController(), mapObservationAggregate(), ObservationGroups (+40 more)

### Community 5 - "api/observationService.ts"
Cohesion: 0.06
Nodes (55): ApiAssignment, ApiDefinition, asRecord(), booleanValue(), ContractSchemas, dateOnly(), fallbackFedcCommandSchema, fallbackFedcObservationsResponseSchema (+47 more)

### Community 6 - "people.ts"
Cohesion: 0.03
Nodes (58): accountStatusSchema, activeGpkAssignmentSummarySchema, AttendanceBulkSaveCommand, attendanceBulkSaveCommandSchema, AttendanceBulkSaveResponse, attendanceBulkSaveResponseSchema, AttendanceQuery, attendanceQuerySchema (+50 more)

### Community 7 - "padding-line-between-statements.ts"
Cohesion: 0.06
Nodes (47): isClosingBraceToken(), isFunction(), isNotSemicolonToken(), isParenthesized(), isSemicolonToken(), isSingleLine(), isTokenOnSameLine(), isTopLevelExpressionStatement() (+39 more)

### Community 8 - "api/weeklyReportService.ts"
Cohesion: 0.06
Nodes (40): mapGoalProgress(), mapWeeklyReportToView(), mapWorkflowHistory(), organizationPath(), parseCommand(), weeklyGoalRating(), WeeklyReport, WeeklyReportGoalProgress (+32 more)

### Community 9 - "AttendancePage.tsx"
Cohesion: 0.06
Nodes (39): AttendanceClass, attendanceClassSelect, AttendanceRecords, AttendanceRoster, attendanceRosterSelect, attendanceVersion(), mapAttendanceRoster(), createAttendanceService() (+31 more)

### Community 10 - "isRequestCancelled"
Cohesion: 0.07
Nodes (38): PeopleAccessView, AppShell(), apps_web_src_context_authcontext_useauth, organizationAdministrationService, Account, emptyForm, Feedback, formForAccount() (+30 more)

### Community 11 - "20260819000000_initial/migration.sql"
Cohesion: 0.07
Nodes (44): "AttendanceRecord_class_tenant", "AttendanceRecord_enrollment_tenant", "AttendanceRecord_student_tenant", "Enrollment_class_tenant", "Enrollment_student_tenant", "Enrollment_year_tenant", "FEDCObservation_assignment_tenant", "FEDCObservation_definition_tenant" (+36 more)

### Community 12 - "AppContext.tsx"
Cohesion: 0.08
Nodes (35): AdministrationDataStatus, administrationErrorMessage(), useAuthorizedDirectory(), NavigationTab, ObservationTargets, SpecialEdSubTab, useNavigationState(), useObservationState() (+27 more)

### Community 13 - "web/package.json"
Cohesion: 0.05
Nodes (41): apps_api_package_json_ref_types_node, apps_api_package_json_ref_typescript, dependencies, @learnspace/contracts, lucide-react, motion, react, react-dom (+33 more)

### Community 14 - "prepare-local-import-rehearsal.ts"
Cohesion: 0.08
Nodes (29): LegacyExportTool(), buildLegacyExport(), downloadLegacyExport(), JSON_COLLECTION_KEYS, LEGACY_STORAGE_KEYS, LegacyExportError, parseCollection(), uniqueStrings() (+21 more)

### Community 15 - "iep.ts"
Cohesion: 0.05
Nodes (42): accommodationWriteSchema, actorSchema, addUniquePositions(), goalWriteSchema, Iep, iepAccommodationCategorySchema, iepAccommodationSchema, IepCreateCommand (+34 more)

### Community 16 - ""public"."Organization""
Cohesion: 0.07
Nodes (44): AuditEvent_organizationId_occurredAt_idx, AuditEvent_organizationId_targetType_targetId_occurredAt_idx, AuditEvent_requestId_idx, FEDCObservation_assignmentId_key, FEDCObservation_organizationId_studentId_observationDate_idx, GuardianContact_organizationId_studentId_idx, Membership_organizationId_role_status_idx, Membership_organizationId_userId_key (+36 more)

### Community 17 - "README.md"
Cohesion: 0.08
Nodes (39): Done, Commit, Next Skill Workflow, .env.example (Safe Environment Template), Pull Request Template, CI attendance-e2e job, CI validate job, CI Workflow (GitHub Actions), .nvmrc (Pinned Node.js Version), apps/api/Dockerfile (Multi-stage: runtime/migration targets) (+31 more)

### Community 18 - "students-service.ts"
Cohesion: 0.11
Nodes (34): activeGpkAssignmentSelect(), GPK_ROLE_CONTEXT, gpkAssignmentSelect, mapGpkAssignment(), SelectedGpkAssignment, enrollmentSelect(), mapStudent(), mapStudentDetail() (+26 more)

### Community 19 - "fedc/FEDCObservationView.tsx"
Cohesion: 0.08
Nodes (30): ObservationReferenceDrawer, FEDCObservationCommand, FEDCObservationReference, FEDCObservationView(), Props, provisionalScores(), RATING_WEIGHTS, today() (+22 more)

### Community 20 - "sfa.ts"
Cohesion: 0.05
Nodes (39): sfaActivityPerformanceCommandSchema, SfaActivityPerformanceRating, sfaActivityPerformanceRatingSchema, sfaAdaptationsCommandSchema, SfaDefinitionBody, sfaDefinitionBodySchema, sfaDefinitionItemSchema, sfaDefinitionProjectionSchema (+31 more)

### Community 21 - "application/openapi.ts"
Cohesion: 0.07
Nodes (37): assignmentParameter, classParameter, collectionOperation(), components, csrfParameter, definitionParameter, errorResponses, generateOpenApiDocument() (+29 more)

### Community 22 - "packages_contracts_dist_index"
Cohesion: 0.13
Nodes (29): createGpkController(), createOrganizationAccountsController(), createOrganizationsController(), organizationPath, settingsResponse(), createStaffDirectoryController(), createStudentsController(), createWeeklyReportController() (+21 more)

### Community 23 - "learning-journeys.ts"
Cohesion: 0.05
Nodes (37): addUniquePositionIssues(), connectionCommandSchema, learningJourneyBaseSchema, learningJourneyCollectionItemSchema, learningJourneyConnectionSchema, LearningJourneyCreateCommand, learningJourneyCreateCommandSchema, learningJourneyDecisionFields (+29 more)

### Community 24 - "types.ts"
Cohesion: 0.08
Nodes (30): SensoryObservationCommand, SensoryObservationReference, fallbackSensoryDefinitionBodySchema, pinnedSections(), Props, provisionalScores(), SensoryContractSchemas, SensoryProfileView() (+22 more)

### Community 25 - "express"
Cohesion: 0.18
Nodes (22): createAcademicsController(), DatabaseClient, PrismaDatabaseClient, ReadinessTransaction, createCsrfProtection(), createRequiredAuthentication(), safeError(), createAcademicsRouter() (+14 more)

### Community 26 - "anti-slop/index.ts"
Cohesion: 0.10
Nodes (25): @oxlint/plugins, antiSlopPlugin, noArrayFilterMapRule, isConditionalEmptyObjectSpread(), isEmptyObjectExpression(), noConditionalEmptyObjectSpreadRule, unwrapParentheses(), importedName() (+17 more)

### Community 27 - "auth-controller.ts"
Cohesion: 0.13
Nodes (27): createAuthController(), secureCookies(), sessionPayload(), createTestAuthController(), e2eAuthHeaderName, e2eAuthUserHeaderName, AppConfig, createTestAuthRouter() (+19 more)

### Community 28 - "ObservationManagementPage.tsx"
Cohesion: 0.09
Nodes (26): ObservationPage, definitionCreateCommand(), definitionVersionCommand(), errorMessage(), ObservationDataStatus, useObservationData(), CoordinatorTab, ObservationManagementPage() (+18 more)

### Community 29 - "scripts"
Cohesion: 0.06
Nodes (35): scripts, build, clean, db:backup, db:import, db:import:prepare-local, db:migrate:deploy, db:migrate:dev (+27 more)

### Community 30 - "oauth-service.ts"
Cohesion: 0.11
Nodes (18): GoogleClaims, googleJwks, isUniqueConstraintError(), normalizeRedirectPath(), OAuthContext, OAuthDeniedError, OAuthService, verifyGoogleIdToken() (+10 more)

### Community 31 - "fedc.ts"
Cohesion: 0.06
Nodes (33): FedcDefinitionBody, fedcDefinitionBodySchema, fedcDefinitionItemSchema, fedcDefinitionMilestoneSchema, fedcDefinitionProjectionSchema, fedcMilestoneScoresSchema, FedcObservation, FedcObservationCompleteCommand (+25 more)

### Community 32 - "weekly-reports-service.ts"
Cohesion: 0.16
Nodes (28): mapWeeklyReport(), weeklyReportDate(), weeklyReportGoalProgressData(), weeklyReportIsoDate(), WeeklyReportRow, weeklyReportSelect, WeeklyReportWorkflowEvent, createWeeklyReportService() (+20 more)

### Community 33 - "api/iepService.ts"
Cohesion: 0.15
Nodes (29): accommodationCommand(), accommodations(), arrayValue(), asRecord(), booleanValue(), commandFor(), ContractSchemas, dateOnly() (+21 more)

### Community 34 - "observation-management.ts"
Cohesion: 0.10
Nodes (31): strictBooleanSchema, jsonPrimitiveSchema, JsonValue, jsonValueSchema, observationAssigneeSummarySchema, ObservationAssignment, ObservationAssignmentCancelCommand, observationAssignmentCancelCommandSchema (+23 more)

### Community 35 - "sensory-profile.ts"
Cohesion: 0.06
Nodes (32): observationPersonSummarySchema, studentSummarySchema, SensoryProfileDefinitionBody, sensoryProfileDefinitionBodySchema, sensoryProfileDefinitionItemSchema, sensoryProfileDefinitionProjectionSchema, sensoryProfileDraftWriteFields, SensoryProfileObservation (+24 more)

### Community 36 - "exportFormat.ts"
Cohesion: 0.06
Nodes (30): addDuplicateIssues(), dateSchema, dateTimeSchema, LEARNSPACE_EXPORT_FORMAT, LEARNSPACE_EXPORT_LIMITS, LEARNSPACE_EXPORT_MAX_BYTES, LEARNSPACE_EXPORT_VERSION, LearnspaceExport (+22 more)

### Community 37 - "weeklyReport.ts"
Cohesion: 0.08
Nodes (31): packages_contracts_src_resources_collectionmetaschema, packages_contracts_src_resources_schooldateschema, packages_contracts_src_resources_staffmembershiproleschema, packages_contracts_src_resources_uuidschema, packages_contracts_src_resources_workflowstateschema, actorSchema, isoWeekForDate(), isoWeekMonday() (+23 more)

### Community 38 - "utils/authorization.ts"
Cohesion: 0.15
Nodes (20): createAttendanceController(), requireAuth(), AttendanceService, teacher, AuthenticatedRequest, attendanceMembershipFor(), deny(), leadershipRoles (+12 more)

### Community 39 - "@prisma/client"
Cohesion: 0.12
Nodes (16): createNotificationsController(), createAggregateRouter(), createNotificationsQueryService(), NotificationsQueryService, createOrganizationsService(), createAggregateSearchQueryService(), ActiveSession, expectedRoutes (+8 more)

### Community 40 - "learning-journeys-service.ts"
Cohesion: 0.13
Nodes (26): isoDate(), learningJourneyDate(), LearningJourneyRow, learningJourneySelect, LearningJourneyWorkflowEvent, mapLearningJourney(), nestedLearningJourneyProjects(), createLearningJourneyService() (+18 more)

### Community 41 - "type-alias-resolution.ts"
Cohesion: 0.11
Nodes (25): FunctionWithReturnType, noUnknownReturnsRule, noUnknownTypeAliasesRule, collectInferTypeParameterNames(), isNode(), lexicalTypeParameterNames(), VisitorKeys, aliasSubstitutions() (+17 more)

### Community 42 - "dictionary-types.ts"
Cohesion: 0.18
Nodes (27): aliasSubstitution(), BUILT_INS, classifyAliasBroadTarget(), classifyWideningTarget(), createTypeEnvironment(), declaredStatement(), dictionaryValueTypes(), hasBroadRecordKey() (+19 more)

### Community 43 - "learning-journeys-controller.ts"
Cohesion: 0.09
Nodes (26): createLearningJourneyController(), journeyPathSchema, organizationPathSchema, requireAuth(), LearningJourneyService, packages_contracts_dist_index_attendancestatusschema, packages_contracts_dist_index_gpkassignmentendcommandschema, packages_contracts_dist_index_gpkassignmentupsertcommandschema (+18 more)

### Community 44 - "api/learningJourneyService.ts"
Cohesion: 0.13
Nodes (19): journeyCommand(), mapJourneyToLegacy(), monthBoundary(), monthIndexes, monthLabel(), roleLabel(), workflowAction(), workflowStage() (+11 more)

### Community 45 - "sfa/SFAObservationView.tsx"
Cohesion: 0.12
Nodes (22): observationService, SFAObservationCommand, SFAObservationReference, cleanRespondents(), errorMessage(), Props, provisionalParticipation(), SFAObservationView() (+14 more)

### Community 46 - "import-service.ts"
Cohesion: 0.16
Nodes (25): addCount(), addRepeatSkips(), dateOnly(), dateTime(), findImportRun(), gender(), importExport(), jsonValue() (+17 more)

### Community 47 - ""public"."IEP""
Cohesion: 0.09
Nodes (26): GoalAchievementEvent_organizationId_goalId_occurredAt_idx, IEP_organizationId_academicYearId_idx, IEP_organizationId_studentId_state_idx, IEPAccommodation_iepId_category_position_key, IEPGoal_id_iepId_key, IEPGoal_iepId_code_key, IEPGoal_iepId_position_key, IEPPerformanceArea_iepId_position_key (+18 more)

### Community 48 - "apiClient.ts"
Cohesion: 0.12
Nodes (19): authService, AuthContext, AuthContextValue, AuthProvider(), AuthStatus, mapSessionToUser(), apiClient, ApiClientError (+11 more)

### Community 49 - ""public"."protect_tenant_ownership""
Cohesion: 0.08
Nodes (24): "AcademicYear_tenant_immutable", "AttendanceRecord_tenant_immutable", "AuditEvent_tenant_immutable", "Enrollment_tenant_immutable", "FEDCObservation_tenant_immutable", "GoalAchievementEvent_tenant_immutable", "Grade_tenant_immutable", "GuardianContact_tenant_immutable" (+16 more)

### Community 50 - "SessionService"
Cohesion: 0.13
Nodes (16): SessionService, authenticatedCookie(), cookie(), authenticatedCookie(), authenticatedCookie(), authenticatedCookie(), authenticatedCookie(), authenticatedCookie() (+8 more)

### Community 51 - "20260827050000_aggregate_search_indexes/migration.sql"
Cohesion: 0.14
Nodes (21): apps_web_src_services_weeklyreportservice_weeklyreport, IEPGoal, LearningJourney, "IEP", "ObservationAssignment", IEP_currentPlacement_trgm_idx, IEP_organizationId_state_updatedAt_idx, IEP_primaryClassification_trgm_idx (+13 more)

### Community 52 - ""public"."Enrollment""
Cohesion: 0.10
Nodes (22): AttendanceRecord_organizationId_schoolDate_classId_idx, AttendanceRecord_organizationId_studentId_classId_schoolDat_key, AttendanceRecord_organizationId_studentId_schoolDate_idx, Enrollment_organizationId_classId_startsOn_endsOn_idx, Enrollment_organizationId_studentId_startsOn_endsOn_idx, Enrollment_studentId_academicYearId_classId_startsOn_key, Grade_organizationId_code_key, Grade_organizationId_unitId_idx (+14 more)

### Community 53 - "no-known-value-widening.ts"
Cohesion: 0.19
Nodes (19): annotationTarget(), FunctionExpression, functionName(), hasInformativeType(), hasKnownCallArgumentEvidence(), hasKnownEvidence(), isDictionaryAccumulatorTarget(), isEmptyObjectExpression() (+11 more)

### Community 54 - "no-widen-then-assert.ts"
Cohesion: 0.23
Nodes (21): assertedExpression(), assertionFromExpression(), assertionIsNarrower(), BroadTypeKind, functionBoundary(), functionBoundaryTypes, isBroadRecordKeyType(), isBroadRecordType() (+13 more)

### Community 55 - "scripts"
Cohesion: 0.10
Nodes (20): scripts, build, db:import, db:migrate:deploy, db:migrate:dev, db:migrate:status, db:seed, db:seed:e2e (+12 more)

### Community 56 - "audit-service.ts"
Cohesion: 0.12
Nodes (15): mapOrganizationAccount(), organizationAccountSelect, SelectedOrganizationAccount, AuditMetadata, auditMetadataSchema, AuditResultValue, CreateAuditEventInput, fieldName (+7 more)

### Community 57 - "read-import-file.test.ts"
Cohesion: 0.13
Nodes (11): temporaryDirectories, valid, temporaryDirectories, allowedLegacyReaders, sensitiveLegacyKeys, sourceExtensions, sourceRoot, packages_contracts_dist_index_learnspace_export_max_bytes (+3 more)

### Community 58 - "aggregates.ts"
Cohesion: 0.10
Nodes (19): AggregateNotification, aggregateNotificationSchema, AggregateNotificationsResponse, aggregateNotificationsResponseSchema, AggregateSearchItem, aggregateSearchItemSchema, AggregateSearchQuery, aggregateSearchQuerySchema (+11 more)

### Community 59 - "package.json"
Cohesion: 0.13
Nodes (16): apps_api_package_json_ref_prisma, dependencies, @prisma/client, name, private, type, version, workspaces (+8 more)

### Community 60 - "application/app.ts"
Cohesion: 0.19
Nodes (13): AppDependencies, createApp(), Database, LogFields, Logger, LogLevel, priorities, createErrorMiddleware() (+5 more)

### Community 61 - "vitest"
Cohesion: 0.16
Nodes (11): main(), loadConfig(), createDatabase(), IncompatibleDatabaseSchemaError, requiredMigration, createLogger(), scheduleAuthCleanup(), validEnvironment (+3 more)

### Community 62 - "api/organizationAdministrationService.ts"
Cohesion: 0.12
Nodes (15): AcademicsService, packages_contracts_dist_index_academicyearsresponseschema, packages_contracts_dist_index_classesresponseschema, packages_contracts_dist_index_gradesresponseschema, packages_contracts_dist_index_organizationaccountmutationresponse, packages_contracts_dist_index_organizationaccountmutationresponseschema, packages_contracts_dist_index_organizationaccountsresponseschema, packages_contracts_dist_index_organizationsettingsresponse (+7 more)

### Community 63 - "observation-management.test.ts"
Cohesion: 0.11
Nodes (18): assignment, definition, scorableFedcBody, sensoryProfileBody, packages_contracts_dist_index_fedcobservationcompletecommandschema, packages_contracts_dist_index_fedcobservationcreatedraftcommandschema, packages_contracts_dist_index_fedcobservationresponseschema, packages_contracts_dist_index_fedcobservationsavedraftcommandschema (+10 more)

### Community 64 - "academics.ts"
Cohesion: 0.11
Nodes (18): academicYearSchema, AcademicYearsResponse, academicYearsResponseSchema, ClassesResponse, classesResponseSchema, classSchema, gradeSchema, GradesResponse (+10 more)

### Community 65 - "Prototype import rehearsal report — 2026-08-24 (local Docker)"
Cohesion: 0.13
Nodes (18): Docker Compose services (web/api/db), Prototype data migration approach, npm run db:backup script, npm run db:restore script, PostgreSQL backup and restore runbook, Prototype import rehearsal report — 2026-08-24 (local Docker), Prototype import rehearsal template, Administrative importer CLI (db:import) (+10 more)

### Community 66 - "observation-validation.ts"
Cohesion: 0.19
Nodes (15): fedcCompletePayloadSchema, fedcCreateDraftPayloadSchema, fedcPayloadSchema, fedcSaveDraftPayloadSchema, sensoryProfileCompletePayloadSchema, sensoryProfileCreateDraftPayloadSchema, sensoryProfilePayloadSchema, sensoryProfileSaveDraftPayloadSchema (+7 more)

### Community 67 - "sfa-scoring.ts"
Cohesion: 0.17
Nodes (14): completeInput, definitionBody, parseDefinition(), parseResponses(), scoreSfaResponses(), SfaScoringError, packages_contracts_dist_index_schooldateschema, packages_contracts_dist_index_sfaactivityperformancecommandschema (+6 more)

### Community 68 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+8 more)

### Community 69 - "organizations.ts"
Cohesion: 0.14
Nodes (15): collectionMetaSchema, nullableTrimmedText(), schoolDateSchema, uuidSchema, ianaTimezoneSchema, OrganizationSchoolDateResponse, organizationSchoolDateResponseSchema, OrganizationSettingsResponse (+7 more)

### Community 70 - "@playwright/test"
Cohesion: 0.13
Nodes (4): fixture, fixture, fixture, @playwright/test

### Community 71 - "contracts/package.json"
Cohesion: 0.13
Nodes (14): dependencies, zod, devDependencies, typescript, exports, files, typescript, zod (+6 more)

### Community 72 - ""public"."LearningJourney""
Cohesion: 0.14
Nodes (15): AcademicYear_organizationId_name_key, AcademicYear_organizationId_startsOn_endsOn_idx, LearningJourney_organizationId_academicYearId_semesterId_gr_key, LearningJourney_organizationId_state_idx, "public"."AcademicYear", "public"."LearningJourney", "public"."LearningJourneyOwner", "public"."MembershipSubject" (+7 more)

### Community 73 - ""public"."validate_active_organization_user""
Cohesion: 0.14
Nodes (14): "AttendanceRecord_recorder_membership", "AuditEvent_actor_membership", "FEDCObservation_observer_membership", "GoalAchievementEvent_actor_membership", "IEP_creator_membership", "IEP_updater_membership", "LearningJourney_creator_membership", "LearningJourney_updater_membership" (+6 more)

### Community 74 - "api/package.json"
Cohesion: 0.15
Nodes (12): main, name, private, type, version, jose, @learnspace/contracts, prisma (+4 more)

### Community 75 - "fedc-scoring.ts"
Cohesion: 0.21
Nodes (10): definition, FedcScoringError, parseDefinition(), ratingScores, scoreFedcResponses(), packages_contracts_dist_index_fedcdefinitionbody, packages_contracts_dist_index_fedcdefinitionbodyschema, packages_contracts_dist_index_fedcrating (+2 more)

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

### Community 80 - "export-format-contracts.test.ts"
Cohesion: 0.17
Nodes (8): DryRunRollback, ImportCounts, ImportMode, ImportReport, packages_contracts_dist_index_learnspace_export_limits, packages_contracts_dist_index_learnspaceexportschema, packages_contracts_dist_index_learnspaceexportv1, packages_contracts_dist_index_learnspaceexportv1schema

### Community 81 - "sensory-profile-scoring.ts"
Cohesion: 0.24
Nodes (9): definitionBody, parseDefinition(), scoreSensoryProfileResponses(), sectionKeys, SensoryProfileScoringError, packages_contracts_dist_index_sensoryprofiledefinitionbody, packages_contracts_dist_index_sensoryprofiledefinitionbodyschema, packages_contracts_dist_index_sensoryprofileresponsescommandschema (+1 more)

### Community 82 - "20260827000000_iep_contracts_and_immutability/migration.sql"
Cohesion: 0.23
Nodes (10): "IEP_historical_immutable", "IEPAccommodation_historical_immutable", "IEPGoal_historical_immutable", "IEPPerformanceArea_historical_immutable", "IEPServiceSchedule_historical_immutable", "IEPTeamMember_historical_immutable", "public"."protect_historical_iep_child"(), "public"."IEP" (+2 more)

### Community 83 - "no-reduce-accumulator-copy.ts"
Cohesion: 0.45
Nodes (9): enclosingReducer(), isGlobalCopyOwner(), noReduceAccumulatorCopyRule, referencesAccumulator(), arrayMethodTarget(), isArrayAnnotation(), isKnownArrayExpression(), resolveArrayBinding() (+1 more)

### Community 84 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noEmit, skipLibCheck, strict (+2 more)

### Community 85 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, declaration, noEmit, outDir, rootDir, sourceMap, exclude, extends (+2 more)

### Community 86 - "no-unsafe-dictionary-type.ts"
Cohesion: 0.33
Nodes (10): isInsideTypeAliasDeclaration(), isInsideTypeParameterConstraint(), isPlainAliasConsumerUse(), isTypeNode(), noUnsafeDictionaryTypeRule, shouldReportType(), typeNodeKinds, typeReferenceName() (+2 more)

### Community 87 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 88 - "read-import-file.ts"
Cohesion: 0.38
Nodes (7): Arguments, parseImportArguments(), runImportCli(), parseJson(), readExportFile(), readImportManifest(), ref_node_url

### Community 89 - "learning-journeys/hooks/useLearningJourneys.ts"
Cohesion: 0.22
Nodes (8): emptyMetadata, LearningJourneyFilterInput, LearningJourneyMetadata, metadataCache, packages_contracts_dist_index_academicyearsresponse, packages_contracts_dist_index_gradesresponse, packages_contracts_dist_index_learningjourneylistquery, packages_contracts_dist_index_semestersresponse

### Community 90 - "src/index.ts"
Cohesion: 0.20
Nodes (9): ApiError, apiErrorSchema, CurrentSessionResponse, currentSessionResponseSchema, HealthResponse, healthResponseSchema, membershipRoleSchema, VersionResponse (+1 more)

### Community 91 - "require-safety-comment-for-type-assertion.ts"
Cohesion: 0.31
Nodes (9): commentOwnerKinds, configuredSafetyMarkers(), DEFAULT_SAFETY_MARKERS, hasSafetyComment(), hasSafetyJustificationBefore(), isConstAssertion(), markerPattern(), requireSafetyCommentForTypeAssertionRule (+1 more)

### Community 92 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, prisma, supertest, tsx, @types/express, @types/node, @types/supertest, typescript (+1 more)

### Community 93 - "learning-journey-workflow.test.ts"
Cohesion: 0.28
Nodes (8): actorMembershipId(), JourneyTransition, transitionJourney(), journeyRow(), membership, run(), transactionFor(), validTransitions

### Community 94 - "20260820000000_google_oauth_authorization/migration.sql"
Cohesion: 0.33
Nodes (8): OAuthLoginTransaction_expiresAt_consumedAt_idx, OAuthLoginTransaction_stateHash_key, "public"."OAuthLoginTransaction", "public"."UserInvitation", "public"."User", UserInvitation_email_expiresAt_acceptedAt_idx, UserInvitation_organizationId_email_idx, "public"."Organization"

### Community 95 - "import-service.test.ts"
Cohesion: 0.29
Nodes (5): document, manifest, ImportManifest, importManifestSchema, uuidMapSchema

### Community 97 - "20260827020000_weekly_report_workflow/migration.sql"
Cohesion: 0.25
Nodes (4): "WeeklyReport_prevent_non_draft_update", "WorkflowEvent_prevent_weekly_report_history_change", "public"."prevent_non_draft_weekly_report_change", "public"."prevent_weekly_report_workflow_event_change"

### Community 98 - "20260827030000_transactional_iep_goal_projections/migration.sql"
Cohesion: 0.29
Nodes (7): GoalAchievementEvent_weeklyReportId_goalId_sourceReportVersion_key, IEPGoal_achievedEventId_key, "public"."protect_historical_iep_child"(), "public"."IEP", "public"."WeeklyReport", "public"."GoalAchievementEvent", "public"."IEPGoal"

### Community 99 - "no-chained-type-assertions.ts"
Cohesion: 0.46
Nodes (7): isConstAssertion(), isForbiddenAssertionChain(), isOutermostAssertionInChain(), isTypeAssertionExpression(), noChainedTypeAssertionsRule, TypeAssertionExpression, unwrapParenthesizedExpression()

### Community 100 - "iep-contracts.test.ts"
Cohesion: 0.29
Nodes (6): ids, packages_contracts_dist_index_iepcreatecommand, packages_contracts_dist_index_iepcreatecommandschema, packages_contracts_dist_index_iepreviewcommandschema, packages_contracts_dist_index_iepupdatecommandschema, packages_contracts_dist_index_iepworkflowcommandschema

### Community 101 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, express, jose, @learnspace/contracts, @prisma/client, zod

### Community 102 - "iep-goal-projection-model.ts"
Cohesion: 0.53
Nodes (4): AchievementSource, appendReportAchievementEvents(), projectIepGoals(), utcDate()

### Community 103 - "anti-slop Vendored Rules README"
Cohesion: 0.33
Nodes (6): oxlint.config.ts jsPlugins Registration, anti-slop Vendored Rules README, Vendoring Pattern (Effect-specific rules/tests omitted), Vendored padding-line-between-statements Upstream Notes, Local Adaptations for Oxlint Compatibility, require-readable-spacing Oxlint Rule Policy

### Community 104 - ""public"."LearningJourneyProject""
Cohesion: 0.33
Nodes (6): CrossCurricularConnection_projectId_position_key, LearningGoal_projectId_position_key, LearningJourneyProject_learningJourneyId_position_key, "public"."CrossCurricularConnection", "public"."LearningGoal", "public"."LearningJourneyProject"

### Community 105 - "20260826000000_observation_management/migration.sql"
Cohesion: 0.33
Nodes (5): ObservationAssignment_cancelledById_idx, "ObservationAssignment_canceller_membership", "public"."User", "public"."validate_active_organization_user", "public"."ObservationAssignment"

### Community 106 - "utils/weeklyReportDates.ts"
Cohesion: 0.40
Nodes (3): packages_contracts_dist_index_isoweekfordate, packages_contracts_dist_index_isoweeksinyear, packages_contracts_dist_index_weeklyreportdaterange

### Community 108 - ""ImportRun""
Cohesion: 0.60
Nodes (4): "Organization", "ImportRun", ImportRun_organizationId_appliedAt_idx, ImportRun_organizationId_sourceKey_key

### Community 110 - "20260827040000_authorized_aggregates/migration.sql"
Cohesion: 0.50
Nodes (3): "prevent_non_draft_weekly_report_change", WeeklyReport_organizationId_studentId_year_weekNumber_key, "WeeklyReport_prevent_non_draft_update"

### Community 111 - ""public"."reject_event_mutation""
Cohesion: 0.50
Nodes (4): "AuditEvent_append_only", "GoalAchievementEvent_append_only", "WorkflowEvent_append_only", "public"."reject_event_mutation"

### Community 112 - ""public"."protect_completed_observation""
Cohesion: 0.50
Nodes (4): "FEDCObservation_completed_immutable", "SensoryProfileObservation_completed_immutable", "SFAObservation_completed_immutable", "public"."protect_completed_observation"

### Community 113 - ""public"."validate_observation_context""
Cohesion: 0.50
Nodes (4): "FEDCObservation_context", "SensoryProfileObservation_context", "SFAObservation_context", "public"."validate_observation_context"

### Community 114 - ""public"."validate_scope_tenant""
Cohesion: 0.50
Nodes (4): "MembershipGrade_tenant", "MembershipSubject_tenant", "MembershipUnit_tenant", "public"."validate_scope_tenant"

### Community 118 - "Google OAuth configuration"
Cohesion: 0.67
Nodes (3): Server-side opaque cookie sessions, Google OAuth configuration, P3-001 — Document Google OAuth setup

### Community 119 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

### Community 120 - "scripts"
Cohesion: 0.67
Nodes (3): scripts, build, typecheck

## Ambiguous Edges - Review These
- `Milestone 7 — Production hardening` → `PostgreSQL backup and restore runbook`  [AMBIGUOUS]
  docs/ROADMAP.md · relation: conceptually_related_to

## Knowledge Gaps
- **992 isolated node(s):** `FedcObservationRow`, `AssignmentRow`, `DefinitionRow`, `SensoryProfileObservationRow`, `SfaObservationRow` (+987 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1249 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **75 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Milestone 7 — Production hardening` and `PostgreSQL backup and restore runbook`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `@prisma/client` connect `@prisma/client` to `fedc-observations-service.ts`, `HttpError`, `lib/config.ts`, `utils/aggregates.queries.ts`, `AttendancePage.tsx`, `prepare-local-import-rehearsal.ts`, `students-service.ts`, `packages_contracts_dist_index`, `express`, `oauth-service.ts`, `weekly-reports-service.ts`, `utils/authorization.ts`, `learning-journeys-service.ts`, `import-service.ts`, `SessionService`, `audit-service.ts`, `package.json`, `vitest`, `api/package.json`, `e2e-seed.ts`, `read-import-file.ts`, `learning-journey-workflow.test.ts`, `import-service.test.ts`, `iep-goal-projection-model.ts`?**
  _High betweenness centrality (0.228) - this node is a cross-community bridge._
- **Why does `zod` connect `packages_contracts_dist_index` to `fedc-observations-service.ts`, `HttpError`, `lib/config.ts`, `utils/aggregates.queries.ts`, `api/observationService.ts`, `people.ts`, `api/weeklyReportService.ts`, `iep.ts`, `sfa.ts`, `application/openapi.ts`, `learning-journeys.ts`, `types.ts`, `fedc.ts`, `weekly-reports-service.ts`, `api/iepService.ts`, `observation-management.ts`, `sensory-profile.ts`, `exportFormat.ts`, `weeklyReport.ts`, `learning-journeys-controller.ts`, `apiClient.ts`, `audit-service.ts`, `aggregates.ts`, `academics.ts`, `observation-validation.ts`, `organizations.ts`, `api/package.json`, `e2e-seed.ts`, `src/index.ts`, `import-service.test.ts`?**
  _High betweenness centrality (0.209) - this node is a cross-community bridge._
- **Why does `@oxlint/plugins` connect `anti-slop/index.ts` to `no-chained-type-assertions.ts`, `padding-line-between-statements.ts`, `type-alias-resolution.ts`, `require-safety-comment-for-type-assertion.ts`, `dictionary-types.ts`, `no-object-parameters.ts`, `no-reduce-accumulator-copy.ts`, `no-known-value-widening.ts`, `no-unsafe-dictionary-type.ts`, `no-widen-then-assert.ts`, `package.json`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **What connects `FedcObservationRow`, `AssignmentRow`, `DefinitionRow` to the rest of the system?**
  _992 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `fedc-observations-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10367762128325508 - nodes in this community are weakly interconnected._
- **Should `HttpError` be split into smaller, more focused modules?**
  _Cohesion score 0.059154929577464786 - nodes in this community are weakly interconnected._