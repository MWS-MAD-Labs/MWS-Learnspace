# Graph Report - MWS-Learnspace  (2026-10-15)

## Corpus Check
- 248 files · ~243,505 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 9, .example 1, .css 1)

## Summary
- 2667 nodes · 5393 edges · 183 communities (107 shown, 76 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 110 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e937927a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- resources.ts
- padding-line-between-statements.ts
- importService.ts
- observationService.ts
- PeopleAccessView.tsx
- useApp
- 20260819000000_initial/migration.sql
- observationRoutes.ts
- 20260827050000_aggregate_search_indexes/migration.sql
- iepRoutes.ts
- apiClient.ts
- anti-slop/index.ts
- iep.ts
- "public"."Organization"
- README.md
- openapi.ts
- resourceRoutes.ts
- LearningJourneyEditor.tsx
- weeklyReportRoutes.ts
- iepManagement.integration.test.ts
- iepService.ts
- scripts
- config.ts
- CoordinatorObservationManager.tsx
- aggregateRoutes.ts
- sessionService.ts
- exportFormat.ts
- weeklyReport.ts
- authRoutes.ts
- types.ts
- learningJourneyRoutes.ts
- dictionary-types.ts
- SensoryProfileView.tsx
- AppContext.tsx
- "public"."IEP"
- packages_contracts_dist_index
- SFAObservationView.tsx
- authorization.ts
- "public"."protect_tenant_ownership"
- observationSchemas.ts
- app.ts
- "public"."Enrollment"
- no-known-value-widening.ts
- no-object-parameters.ts
- no-widen-then-assert.ts
- SessionService
- package.json
- scripts
- aggregates.ts
- type-alias-resolution.ts
- Prototype import rehearsal report — 2026-08-24 (local Docker)
- contracts/package.json
- api/package.json
- web/package.json
- compilerOptions
- compilerOptions
- legacyStorageReader.ts
- @playwright/test
- "public"."LearningJourney"
- "public"."validate_active_organization_user"
- database.integration.test.ts
- devDependencies
- compilerOptions
- no-reduce-accumulator-copy.ts
- 20260827000000_iep_contracts_and_immutability/migration.sql
- prepare-local-import-rehearsal.ts
- ref_vitest
- no-unsafe-dictionary-type.ts
- compilerOptions
- src/index.ts
- MemoryStorage
- devDependencies
- dependencies
- scripts
- 20260820000000_google_oauth_authorization/migration.sql
- fedcScoring.ts
- learningJourneyService.ts
- weeklyReportService.ts
- p5-ieps.spec.ts
- 20260827020000_weekly_report_workflow/migration.sql
- 20260827030000_transactional_iep_goal_projections/migration.sql
- no-chained-type-assertions.ts
- devDependencies
- dependencies
- anti-slop Vendored Rules README
- "public"."LearningJourneyProject"
- 20260826000000_observation_management/migration.sql
- main.tsx
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
- addUniquePositionIssues
- "AttendanceRecord_context"
- "LearningJourneyOwner_membership_scope"
- "Membership_user_immutable"
- "ObservationAssignment_assignee_scope"
- "ObservationDefinition_used_immutable"
- "StaffStudentAssignment_membership_scope"
- "WeeklyReport_context"
- "WorkflowEvent_tenant"
- test-integration-local.sh
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
- contracts.test.ts
- Expand-and-contract migration phases
- Release identifiers (alpha/beta/rc)
- "public"."WeeklyReport"
- "public"."LearningJourney"
- sfaScoring.ts
- readImportFile.test.ts
- importTypes.ts
- sensoryProfileScoring.ts
- readImportFile.ts
- audit.ts
- ref_zod
- ref_prisma_client
- organizationAccounts.integration.test.ts
- sensoryProfileObservations.integration.test.ts
- resources.integration.test.ts
- 20260827040000_authorized_aggregates/migration.sql
- ref_learnspace_contracts

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 57 edges
2. `useApp()` - 50 edges
3. `SessionService` - 42 edges
4. `react` - 37 edges
5. `isRequestCancelled()` - 37 edges
6. `createObservationRouter()` - 35 edges
7. `scripts` - 35 edges
8. `createResourceRouter()` - 34 edges
9. `@oxlint/plugins` - 29 edges
10. `createIepRouter()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `mutate()` --indirect_call--> `csrf()`  [INFERRED]
  apps/api/test/integration/fedcObservations.integration.test.ts → e2e/p5-weekly-reports.spec.ts
- `mutate()` --indirect_call--> `csrf()`  [INFERRED]
  apps/api/test/integration/observationManagement.integration.test.ts → e2e/p5-weekly-reports.spec.ts
- `mutate()` --indirect_call--> `csrf()`  [INFERRED]
  apps/api/test/integration/sensoryProfileObservations.integration.test.ts → e2e/p5-weekly-reports.spec.ts
- `mutate()` --indirect_call--> `csrf()`  [INFERRED]
  apps/api/test/integration/sfaObservations.integration.test.ts → e2e/p5-weekly-reports.spec.ts
- `Done, Commit, Next Skill Workflow` --semantically_similar_to--> `CI validate job`  [INFERRED] [semantically similar]
  .done-commit-next-SKILL.md → .github/workflows/ci.yml

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Prototype import rehearsal and rollback documentation pipeline** — docs_operations_prototype_import_rollout_doc, docs_operations_backup_and_restore_doc, docs_operations_prototype_import_rehearsal_2026_08_24_local_doc, docs_operations_prototype_import_rehearsal_template_doc [EXTRACTED 1.00]
- **Shared aggregate + append-only WorkflowEvent transition pattern** — docs_domain_model_learning_journey_transitions, docs_domain_model_iep_transitions, docs_domain_model_weekly_report_transitions, docs_api_conventions_learning_journey_workflow_commands [INFERRED 0.80]
- **Attendance E2E Compose Pipeline (CI-Driven)** — _github_workflows_ci_attendance_e2e_job, compose_e2e_db_service, compose_e2e_migrate_service, compose_e2e_fixture_service, compose_e2e_api_service, compose_e2e_web_service [INFERRED 0.85]
- **PostgreSQL db Service Pattern Across Compose Files** — compose_db_service, compose_dev_db_service, compose_e2e_db_service, compose_integration_db_service, compose_import_local_db_service [INFERRED 0.85]
- **Pre-merge Validation Command Set (format/lint/typecheck/test/build)** — _github_workflows_ci_validate_job, _github_pull_request_template_document, contributing_document [INFERRED 0.85]
- **Server-side trust boundary and deny-by-default enforcement pattern** — docs_adr_0001_application_architecture_browser_api_trust_boundary, docs_auth_authorization_matrix_doc, docs_auth_google_oauth_doc, docs_api_conventions_doc [INFERRED 0.85]

## Communities (183 total, 76 thin omitted)

### Community 0 - "resources.ts"
Cohesion: 0.01
Nodes (253): AcademicYearsResponse, academicYearsResponseSchema, accountStatusSchema, activeGpkAssignmentSummarySchema, AttendanceBulkSaveCommand, attendanceBulkSaveCommandSchema, AttendanceBulkSaveResponse, attendanceBulkSaveResponseSchema (+245 more)

### Community 1 - "padding-line-between-statements.ts"
Cohesion: 0.06
Nodes (47): isClosingBraceToken(), isFunction(), isNotSemicolonToken(), isParenthesized(), isSemicolonToken(), isSingleLine(), isTokenOnSameLine(), isTopLevelExpressionStatement() (+39 more)

### Community 2 - "importService.ts"
Cohesion: 0.15
Nodes (26): addCount(), addRepeatSkips(), dateOnly(), dateTime(), findImportRun(), gender(), importExport(), jsonValue() (+18 more)

### Community 3 - "observationService.ts"
Cohesion: 0.06
Nodes (56): ApiAssignment, ApiDefinition, asRecord(), booleanValue(), ContractSchemas, dateOnly(), fallbackFedcCommandSchema, fallbackFedcObservationsResponseSchema (+48 more)

### Community 4 - "PeopleAccessView.tsx"
Cohesion: 0.07
Nodes (28): PeopleAccessView, Account, emptyForm, Feedback, formForAccount(), FormState, Option, PeopleAccessView() (+20 more)

### Community 5 - "useApp"
Cohesion: 0.08
Nodes (43): AuthenticatedApplication(), IEPPlanView, LearningJourneyCalendar, LearningJourneyStatusTracker, MainContent(), ReportsAnalyticsView, WeeklyReportView, AuthGate() (+35 more)

### Community 6 - "20260819000000_initial/migration.sql"
Cohesion: 0.07
Nodes (44): "AttendanceRecord_class_tenant", "AttendanceRecord_enrollment_tenant", "AttendanceRecord_student_tenant", "Enrollment_class_tenant", "Enrollment_student_tenant", "Enrollment_year_tenant", "FEDCObservation_assignment_tenant", "FEDCObservation_definition_tenant" (+36 more)

### Community 7 - "observationRoutes.ts"
Cohesion: 0.09
Nodes (46): HttpError, AssignmentRow, assignmentSelect, canReadObservationStudent(), createObservationRouter(), definitionConflict(), DefinitionRow, definitionSelect (+38 more)

### Community 8 - "20260827050000_aggregate_search_indexes/migration.sql"
Cohesion: 0.12
Nodes (24): WeeklyReport, IEPGoal, LearningJourney, "IEP", "ObservationAssignment", IEP_currentPlacement_trgm_idx, IEP_organizationId_state_updatedAt_idx, IEP_primaryClassification_trgm_idx (+16 more)

### Community 9 - "iepRoutes.ts"
Cohesion: 0.07
Nodes (51): activeAssignedStudentIds(), activePlanConflict(), assertStudentScope(), assignedRoles, broadRoles, canRoleRunIepWorkflowCommand(), createIepRouter(), dateAtUtcMidnight() (+43 more)

### Community 10 - "apiClient.ts"
Cohesion: 0.05
Nodes (46): AttendanceView, AttendanceView(), displaySchoolDate(), DraftMap, DraftRecord, draftsFromRoster(), errorMessage(), formatDateParts() (+38 more)

### Community 11 - "anti-slop/index.ts"
Cohesion: 0.08
Nodes (34): @oxlint/plugins, antiSlopPlugin, isConditionalEmptyObjectSpread(), isEmptyObjectExpression(), noConditionalEmptyObjectSpreadRule, unwrapParentheses(), importedName(), isTestFrameworkObject() (+26 more)

### Community 12 - "iep.ts"
Cohesion: 0.05
Nodes (42): accommodationWriteSchema, actorSchema, addUniquePositions(), goalWriteSchema, Iep, iepAccommodationCategorySchema, iepAccommodationSchema, IepCreateCommand (+34 more)

### Community 13 - ""public"."Organization""
Cohesion: 0.07
Nodes (44): AuditEvent_organizationId_occurredAt_idx, AuditEvent_organizationId_targetType_targetId_occurredAt_idx, AuditEvent_requestId_idx, FEDCObservation_assignmentId_key, FEDCObservation_organizationId_studentId_observationDate_idx, GuardianContact_organizationId_studentId_idx, Membership_organizationId_role_status_idx, Membership_organizationId_userId_key (+36 more)

### Community 14 - "README.md"
Cohesion: 0.08
Nodes (39): Done, Commit, Next Skill Workflow, .env.example (Safe Environment Template), Pull Request Template, CI attendance-e2e job, CI validate job, CI Workflow (GitHub Actions), .nvmrc (Pinned Node.js Version), apps/api/Dockerfile (Multi-stage: runtime/migration targets) (+31 more)

### Community 15 - "openapi.ts"
Cohesion: 0.05
Nodes (51): assignmentParameter, classParameter, collectionOperation(), components, csrfParameter, definitionParameter, errorResponses, generateOpenApiDocument() (+43 more)

### Community 16 - "resourceRoutes.ts"
Cohesion: 0.07
Nodes (51): activeEnrollmentWhere(), activeGpkAssignmentSelect(), asPrismaErrorCode(), assignedStudentRoles, assignmentConflictCodes, assignmentOverlapWhere(), attendanceVersion(), createResourceRouter() (+43 more)

### Community 17 - "LearningJourneyEditor.tsx"
Cohesion: 0.16
Nodes (14): LearningJourneyEditor, clampProjectsToSemester(), LearningJourneyEditor(), MONTH_OPTIONS, SUBJECT_OPTIONS, LearningJourneyMetadata, journeyCommand(), learningJourneyService (+6 more)

### Community 18 - "weeklyReportRoutes.ts"
Cohesion: 0.14
Nodes (28): AuthenticatedRequest, parseRequest(), validationError(), organizationSchoolDate(), schoolDateInTimezone(), auth(), createWeeklyReportRouter(), transition() (+20 more)

### Community 19 - "iepManagement.integration.test.ts"
Cohesion: 0.10
Nodes (20): DEFAULT_GPK_MAX_CASELOAD, config, logger, postIep(), putIep(), workflow(), config, get() (+12 more)

### Community 20 - "iepService.ts"
Cohesion: 0.14
Nodes (32): accommodationCommand(), accommodations(), arrayValue(), asRecord(), booleanValue(), commandFor(), ContractSchemas, dateOnly() (+24 more)

### Community 21 - "scripts"
Cohesion: 0.06
Nodes (35): scripts, build, clean, db:backup, db:import, db:import:prepare-local, db:migrate:deploy, db:migrate:dev (+27 more)

### Community 22 - "config.ts"
Cohesion: 0.07
Nodes (21): apps_api_src_aggregateroutes_schooldateintimezone, AppConfig, logLevels, placeholderValues, rawEnvironmentSchema, validEnvironment, config, logger (+13 more)

### Community 23 - "CoordinatorObservationManager.tsx"
Cohesion: 0.09
Nodes (27): ObservationToolsView, CoordinatorObservationManager(), CoordinatorTab, mockedAttendanceService, mockedStudentAdministrationService, mockedUseApp, mockedUseObservationData, setObservationResultsStudentId (+19 more)

### Community 24 - "aggregateRoutes.ts"
Cohesion: 0.17
Nodes (27): activeIepStates, aggregateActiveAssignedStudentIds(), aggregateAttendanceSummary(), aggregateDatedObservationScope(), aggregateJourneyScopeWhere(), aggregateNotifications(), aggregateSearchItems(), aggregateStudentScopeWhere() (+19 more)

### Community 25 - "sessionService.ts"
Cohesion: 0.12
Nodes (19): encryptionKey(), hashToken(), openJson(), randomToken(), sealJson(), sha256Base64Url(), GoogleClaims, googleJwks (+11 more)

### Community 26 - "exportFormat.ts"
Cohesion: 0.06
Nodes (30): addDuplicateIssues(), dateSchema, dateTimeSchema, LEARNSPACE_EXPORT_FORMAT, LEARNSPACE_EXPORT_LIMITS, LEARNSPACE_EXPORT_MAX_BYTES, LEARNSPACE_EXPORT_VERSION, LearnspaceExport (+22 more)

### Community 27 - "weeklyReport.ts"
Cohesion: 0.08
Nodes (31): collectionMetaSchema, schoolDateSchema, staffMembershipRoleSchema, uuidSchema, workflowStateSchema, actorSchema, isoWeekForDate(), isoWeekMonday() (+23 more)

### Community 28 - "authRoutes.ts"
Cohesion: 0.15
Nodes (26): safeEqual(), permissionsForRole(), createAuthRouter(), createCsrfProtection(), createRequiredAuthentication(), safeError(), secureCookies(), sessionPayload() (+18 more)

### Community 29 - "types.ts"
Cohesion: 0.10
Nodes (27): FEDCObservationView(), Props, provisionalScores(), RATING_WEIGHTS, assignment, definitionBody, mockedObservationService, mockedUseApp (+19 more)

### Community 30 - "learningJourneyRoutes.ts"
Cohesion: 0.13
Nodes (31): actorMembershipId(), assertWriteScope(), createLearningJourneyRouter(), dateAtUtcMidnight(), deny(), duplicateJourneyError(), invalidTransition(), isoDate() (+23 more)

### Community 31 - "dictionary-types.ts"
Cohesion: 0.19
Nodes (26): aliasSubstitution(), BUILT_INS, classifyAliasBroadTarget(), classifyWideningTarget(), createTypeEnvironment(), declaredStatement(), dictionaryValueTypes(), hasBroadRecordKey() (+18 more)

### Community 32 - "SensoryProfileView.tsx"
Cohesion: 0.09
Nodes (31): ObservationReferenceDrawer, ObservationReferenceDrawer(), ObservationReferenceDrawerProps, ObservationHistoryViewer(), recordFedcMilestones(), recordSensorySections(), recordSfaDefinition(), fallbackSensoryDefinitionBodySchema (+23 more)

### Community 33 - "AppContext.tsx"
Cohesion: 0.12
Nodes (24): ObservationHistoryViewerProps, AdministrationDataStatus, administrationErrorMessage(), AppContext, AppContextType, AppProvider(), NavigationTab, SpecialEdSubTab (+16 more)

### Community 34 - ""public"."IEP""
Cohesion: 0.09
Nodes (26): GoalAchievementEvent_organizationId_goalId_occurredAt_idx, IEP_organizationId_academicYearId_idx, IEP_organizationId_studentId_state_idx, IEPAccommodation_iepId_category_position_key, IEPGoal_id_iepId_key, IEPGoal_iepId_code_key, IEPGoal_iepId_position_key, IEPPerformanceArea_iepId_position_key (+18 more)

### Community 35 - "packages_contracts_dist_index"
Cohesion: 0.15
Nodes (18): AppShell(), currentGradeIds, currentPermissions, navigateToAttendanceStudent, navigateToIEP, navigateToObservation, navigateToWeeklyReport, setSearchQuery (+10 more)

### Community 36 - "SFAObservationView.tsx"
Cohesion: 0.13
Nodes (21): cleanRespondents(), errorMessage(), Props, provisionalParticipation(), SFAObservationView(), SfaTab, TABS, assignment (+13 more)

### Community 37 - "authorization.ts"
Cohesion: 0.16
Nodes (13): CreateAuditEventInput, AuditAppender, AuthorizationDeniedError, authorizeWithAudit(), MembershipScope, Permission, permissionsByRole, requireOrganizationScope() (+5 more)

### Community 38 - ""public"."protect_tenant_ownership""
Cohesion: 0.08
Nodes (24): "AcademicYear_tenant_immutable", "AttendanceRecord_tenant_immutable", "AuditEvent_tenant_immutable", "Enrollment_tenant_immutable", "FEDCObservation_tenant_immutable", "GoalAchievementEvent_tenant_immutable", "Grade_tenant_immutable", "GuardianContact_tenant_immutable" (+16 more)

### Community 39 - "observationSchemas.ts"
Cohesion: 0.18
Nodes (16): fedcCompletePayloadSchema, fedcCreateDraftPayloadSchema, fedcPayloadSchema, fedcSaveDraftPayloadSchema, sensoryProfileCompletePayloadSchema, sensoryProfileCreateDraftPayloadSchema, sensoryProfilePayloadSchema, sensoryProfileSaveDraftPayloadSchema (+8 more)

### Community 40 - "app.ts"
Cohesion: 0.11
Nodes (22): AppDependencies, createApp(), scheduleAuthCleanup(), loadConfig(), createDatabase(), Database, IncompatibleDatabaseSchemaError, PrismaDatabaseClient (+14 more)

### Community 41 - ""public"."Enrollment""
Cohesion: 0.10
Nodes (22): AttendanceRecord_organizationId_schoolDate_classId_idx, AttendanceRecord_organizationId_studentId_classId_schoolDat_key, AttendanceRecord_organizationId_studentId_schoolDate_idx, Enrollment_organizationId_classId_startsOn_endsOn_idx, Enrollment_organizationId_studentId_startsOn_endsOn_idx, Enrollment_studentId_academicYearId_classId_startsOn_key, Grade_organizationId_code_key, Grade_organizationId_unitId_idx (+14 more)

### Community 42 - "no-known-value-widening.ts"
Cohesion: 0.17
Nodes (19): annotationTarget(), FunctionExpression, functionName(), hasInformativeType(), hasKnownCallArgumentEvidence(), hasKnownEvidence(), isDictionaryAccumulatorTarget(), isEmptyObjectExpression() (+11 more)

### Community 43 - "no-object-parameters.ts"
Cohesion: 0.16
Nodes (17): variableTypeAnnotation(), noObjectParametersRule, ParameterOwner, isTypePredicateSubject(), noUnknownParametersRule, ParameterOwner, FunctionWithReturnType, noUnknownReturnsRule (+9 more)

### Community 44 - "no-widen-then-assert.ts"
Cohesion: 0.23
Nodes (21): assertedExpression(), assertionFromExpression(), assertionIsNarrower(), BroadTypeKind, functionBoundary(), functionBoundaryTypes, isBroadRecordKeyType(), isBroadRecordType() (+13 more)

### Community 45 - "SessionService"
Cohesion: 0.16
Nodes (14): SessionService, authenticatedCookie(), cookie(), authenticatedCookie(), authenticatedCookie(), config, logger, mutate() (+6 more)

### Community 46 - "package.json"
Cohesion: 0.11
Nodes (18): dependencies, @prisma/client, prisma, @prisma/client, typescript, name, private, type (+10 more)

### Community 47 - "scripts"
Cohesion: 0.10
Nodes (20): scripts, build, db:import, db:migrate:deploy, db:migrate:dev, db:migrate:status, db:seed, db:seed:e2e (+12 more)

### Community 48 - "aggregates.ts"
Cohesion: 0.10
Nodes (19): AggregateNotification, aggregateNotificationSchema, AggregateNotificationsResponse, aggregateNotificationsResponseSchema, AggregateSearchItem, aggregateSearchItemSchema, AggregateSearchQuery, aggregateSearchQuerySchema (+11 more)

### Community 49 - "type-alias-resolution.ts"
Cohesion: 0.15
Nodes (18): collectInferTypeParameterNames(), isNode(), lexicalTypeParameterNames(), VisitorKeys, ancestorDistance(), collectTypeBindings(), declaredTypeBinding(), enclosingTypeScope() (+10 more)

### Community 50 - "Prototype import rehearsal report — 2026-08-24 (local Docker)"
Cohesion: 0.13
Nodes (18): Docker Compose services (web/api/db), Prototype data migration approach, npm run db:backup script, npm run db:restore script, PostgreSQL backup and restore runbook, Prototype import rehearsal report — 2026-08-24 (local Docker), Prototype import rehearsal template, Administrative importer CLI (db:import) (+10 more)

### Community 51 - "contracts/package.json"
Cohesion: 0.11
Nodes (17): dependencies, zod, devDependencies, typescript, exports, files, typescript, zod (+9 more)

### Community 52 - "api/package.json"
Cohesion: 0.12
Nodes (16): @learnspace/contracts, prisma, @prisma/client, @types/node, typescript, vitest, zod, main (+8 more)

### Community 53 - "web/package.json"
Cohesion: 0.12
Nodes (16): @learnspace/contracts, @types/node, typescript, vitest, name, private, type, version (+8 more)

### Community 54 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+7 more)

### Community 55 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, rootDir (+6 more)

### Community 56 - "legacyStorageReader.ts"
Cohesion: 0.21
Nodes (12): LegacyExportTool(), buildLegacyExport(), downloadLegacyExport(), JSON_COLLECTION_KEYS, LEGACY_STORAGE_KEYS, LegacyExportError, parseCollection(), student (+4 more)

### Community 57 - "@playwright/test"
Cohesion: 0.13
Nodes (4): fixture, fixture, fixture, @playwright/test

### Community 58 - ""public"."LearningJourney""
Cohesion: 0.14
Nodes (15): AcademicYear_organizationId_name_key, AcademicYear_organizationId_startsOn_endsOn_idx, LearningJourney_organizationId_academicYearId_semesterId_gr_key, LearningJourney_organizationId_state_idx, "public"."AcademicYear", "public"."LearningJourney", "public"."LearningJourneyOwner", "public"."MembershipSubject" (+7 more)

### Community 59 - ""public"."validate_active_organization_user""
Cohesion: 0.14
Nodes (14): "AttendanceRecord_recorder_membership", "AuditEvent_actor_membership", "FEDCObservation_observer_membership", "GoalAchievementEvent_actor_membership", "IEP_creator_membership", "IEP_updater_membership", "LearningJourney_creator_membership", "LearningJourney_updater_membership" (+6 more)

### Community 60 - "database.integration.test.ts"
Cohesion: 0.23
Nodes (9): assertSeedAllowed(), seedEnvironmentSchema, e2eFixture, main(), seedE2eDatabase(), sfaDefinitionBody, main(), seedDatabase() (+1 more)

### Community 61 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-unused-imports, oxlint, @oxlint/plugins (+5 more)

### Community 62 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, declaration, declarationMap, module, moduleResolution, outDir, rootDir, skipLibCheck (+4 more)

### Community 63 - "no-reduce-accumulator-copy.ts"
Cohesion: 0.40
Nodes (10): noArrayFilterMapRule, enclosingReducer(), isGlobalCopyOwner(), noReduceAccumulatorCopyRule, referencesAccumulator(), arrayMethodTarget(), isArrayAnnotation(), isKnownArrayExpression() (+2 more)

### Community 64 - "20260827000000_iep_contracts_and_immutability/migration.sql"
Cohesion: 0.23
Nodes (10): "IEP_historical_immutable", "IEPAccommodation_historical_immutable", "IEPGoal_historical_immutable", "IEPPerformanceArea_historical_immutable", "IEPServiceSchedule_historical_immutable", "IEPTeamMember_historical_immutable", "public"."protect_historical_iep_child"(), "public"."IEP" (+2 more)

### Community 65 - "prepare-local-import-rehearsal.ts"
Cohesion: 0.32
Nodes (10): REHEARSAL_FEDC_OBSERVATIONS, REHEARSAL_IEPS, REHEARSAL_LEARNING_JOURNEYS, REHEARSAL_OBSERVATION_ASSIGNMENTS, REHEARSAL_OBSERVATION_DEFINITIONS, REHEARSAL_SENSORY_PROFILE_OBSERVATIONS, REHEARSAL_SFA_OBSERVATIONS, REHEARSAL_STUDENTS (+2 more)

### Community 66 - "ref_vitest"
Cohesion: 0.10
Nodes (21): App(), dashboard, session, navigateToWeeklyReportTracker, payload, setActiveTab, clampIsoWeekForYear(), findWeeklyReportForStudent() (+13 more)

### Community 67 - "no-unsafe-dictionary-type.ts"
Cohesion: 0.33
Nodes (10): isInsideTypeAliasDeclaration(), isInsideTypeParameterConstraint(), isPlainAliasConsumerUse(), isTypeNode(), noUnsafeDictionaryTypeRule, shouldReportType(), typeNodeKinds, typeReferenceName() (+2 more)

### Community 68 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 69 - "src/index.ts"
Cohesion: 0.20
Nodes (9): ApiError, apiErrorSchema, CurrentSessionResponse, currentSessionResponseSchema, HealthResponse, healthResponseSchema, membershipRoleSchema, VersionResponse (+1 more)

### Community 70 - "MemoryStorage"
Cohesion: 0.22
Nodes (4): code(), date(), main(), MemoryStorage

### Community 71 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, prisma, supertest, tsx, @types/express, @types/node, @types/supertest, typescript (+1 more)

### Community 72 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, @learnspace/contracts, lucide-react, motion, react, react-dom, @tailwindcss/vite, vite (+1 more)

### Community 73 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, prebuild, pretest, pretypecheck, preview, test (+1 more)

### Community 74 - "20260820000000_google_oauth_authorization/migration.sql"
Cohesion: 0.33
Nodes (8): OAuthLoginTransaction_expiresAt_consumedAt_idx, OAuthLoginTransaction_stateHash_key, "public"."OAuthLoginTransaction", "public"."UserInvitation", "public"."User", UserInvitation_email_expiresAt_acceptedAt_idx, UserInvitation_organizationId_email_idx, "public"."Organization"

### Community 75 - "fedcScoring.ts"
Cohesion: 0.23
Nodes (9): FedcScoringError, parseDefinition(), ratingScores, scoreFedcResponses(), definition, packages_contracts_dist_index_fedcdefinitionbody, packages_contracts_dist_index_fedcrating, packages_contracts_dist_index_fedcresponsescommandschema (+1 more)

### Community 76 - "learningJourneyService.ts"
Cohesion: 0.09
Nodes (26): emptyMetadata, LearningJourneyFilterInput, metadataCache, mapJourneyToLegacy(), monthIndexes, roleLabel(), workflowAction(), workflowStage() (+18 more)

### Community 77 - "weeklyReportService.ts"
Cohesion: 0.14
Nodes (23): arrayValue(), asRecord(), booleanValue(), dateOnly(), mapGoalProgress(), mapWeeklyReportToView(), mapWorkflowHistory(), numberValue() (+15 more)

### Community 79 - "20260827020000_weekly_report_workflow/migration.sql"
Cohesion: 0.25
Nodes (4): "WeeklyReport_prevent_non_draft_update", "WorkflowEvent_prevent_weekly_report_history_change", "public"."prevent_non_draft_weekly_report_change", "public"."prevent_weekly_report_workflow_event_change"

### Community 80 - "20260827030000_transactional_iep_goal_projections/migration.sql"
Cohesion: 0.29
Nodes (7): GoalAchievementEvent_weeklyReportId_goalId_sourceReportVersion_key, IEPGoal_achievedEventId_key, "public"."protect_historical_iep_child"(), "public"."IEP", "public"."WeeklyReport", "public"."GoalAchievementEvent", "public"."IEPGoal"

### Community 81 - "no-chained-type-assertions.ts"
Cohesion: 0.46
Nodes (7): isConstAssertion(), isForbiddenAssertionChain(), isOutermostAssertionInChain(), isTypeAssertionExpression(), noChainedTypeAssertionsRule, TypeAssertionExpression, unwrapParenthesizedExpression()

### Community 82 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, jsdom, @testing-library/jest-dom, @testing-library/react, @types/node, @types/react, @types/react-dom, typescript (+1 more)

### Community 83 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, express, jose, @learnspace/contracts, @prisma/client, zod

### Community 84 - "anti-slop Vendored Rules README"
Cohesion: 0.33
Nodes (6): oxlint.config.ts jsPlugins Registration, anti-slop Vendored Rules README, Vendoring Pattern (Effect-specific rules/tests omitted), Vendored padding-line-between-statements Upstream Notes, Local Adaptations for Oxlint Compatibility, require-readable-spacing Oxlint Rule Policy

### Community 85 - ""public"."LearningJourneyProject""
Cohesion: 0.33
Nodes (6): CrossCurricularConnection_projectId_position_key, LearningGoal_projectId_position_key, LearningJourneyProject_learningJourneyId_position_key, "public"."CrossCurricularConnection", "public"."LearningGoal", "public"."LearningJourneyProject"

### Community 86 - "20260826000000_observation_management/migration.sql"
Cohesion: 0.33
Nodes (5): ObservationAssignment_cancelledById_idx, "ObservationAssignment_canceller_membership", "public"."User", "public"."validate_active_organization_user", "public"."ObservationAssignment"

### Community 87 - "main.tsx"
Cohesion: 0.40
Nodes (4): apps_web_src_index, render(), root, react-dom

### Community 89 - ""ImportRun""
Cohesion: 0.60
Nodes (4): "Organization", "ImportRun", ImportRun_organizationId_appliedAt_idx, ImportRun_organizationId_sourceKey_key

### Community 91 - ""public"."reject_event_mutation""
Cohesion: 0.50
Nodes (4): "AuditEvent_append_only", "GoalAchievementEvent_append_only", "WorkflowEvent_append_only", "public"."reject_event_mutation"

### Community 92 - ""public"."protect_completed_observation""
Cohesion: 0.50
Nodes (4): "FEDCObservation_completed_immutable", "SensoryProfileObservation_completed_immutable", "SFAObservation_completed_immutable", "public"."protect_completed_observation"

### Community 93 - ""public"."validate_observation_context""
Cohesion: 0.50
Nodes (4): "FEDCObservation_context", "SensoryProfileObservation_context", "SFAObservation_context", "public"."validate_observation_context"

### Community 94 - ""public"."validate_scope_tenant""
Cohesion: 0.50
Nodes (4): "MembershipGrade_tenant", "MembershipSubject_tenant", "MembershipUnit_tenant", "public"."validate_scope_tenant"

### Community 98 - "Google OAuth configuration"
Cohesion: 0.67
Nodes (3): Server-side opaque cookie sessions, Google OAuth configuration, P3-001 — Document Google OAuth setup

### Community 99 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

### Community 164 - "contracts.test.ts"
Cohesion: 0.11
Nodes (17): packages_contracts_dist_index_attendancestatusschema, packages_contracts_dist_index_gpkassignmentendcommandschema, packages_contracts_dist_index_gpkassignmentupsertcommandschema, packages_contracts_dist_index_learningjourneycreatecommandschema, packages_contracts_dist_index_learningjourneydirectorreviewcommandschema, packages_contracts_dist_index_learningjourneylistqueryschema, packages_contracts_dist_index_learningjourneyprincipalreviewcommandschema, packages_contracts_dist_index_learningjourneysubmitcommandschema (+9 more)

### Community 170 - "sfaScoring.ts"
Cohesion: 0.18
Nodes (13): parseDefinition(), parseResponses(), scoreSfaResponses(), SfaScoringError, completeInput, definitionBody, packages_contracts_dist_index_schooldateschema, packages_contracts_dist_index_sfaactivityperformancecommandschema (+5 more)

### Community 171 - "readImportFile.test.ts"
Cohesion: 0.15
Nodes (11): temporaryDirectories, valid, allowedLegacyReaders, productionSourceFiles(), sensitiveLegacyKeys, sourceExtensions, sourceRoot, packages_contracts_dist_index_learnspace_export_max_bytes (+3 more)

### Community 172 - "importTypes.ts"
Cohesion: 0.17
Nodes (8): DryRunRollback, ImportCounts, ImportMode, ImportReport, packages_contracts_dist_index_learnspace_export_limits, packages_contracts_dist_index_learnspaceexportschema, packages_contracts_dist_index_learnspaceexportv1, packages_contracts_dist_index_learnspaceexportv1schema

### Community 173 - "sensoryProfileScoring.ts"
Cohesion: 0.24
Nodes (9): parseDefinition(), scoreSensoryProfileResponses(), sectionKeys, SensoryProfileScoringError, definitionBody, packages_contracts_dist_index_sensoryprofiledefinitionbody, packages_contracts_dist_index_sensoryprofiledefinitionbodyschema, packages_contracts_dist_index_sensoryprofileresponsescommandschema (+1 more)

### Community 174 - "readImportFile.ts"
Cohesion: 0.38
Nodes (7): parseJson(), readExportFile(), readImportManifest(), Arguments, parseImportArguments(), runImportCli(), ref_node_url

### Community 175 - "audit.ts"
Cohesion: 0.28
Nodes (7): AuditMetadata, auditMetadataSchema, AuditResultValue, createAuditRepository(), fieldName, safeText, sanitizeAuditMetadata()

### Community 176 - "ref_zod"
Cohesion: 0.25
Nodes (6): ImportManifest, importManifestSchema, uuidMapSchema, document, manifest, ref_zod

### Community 177 - "ref_prisma_client"
Cohesion: 0.48
Nodes (5): AchievementSource, appendReportAchievementEvents(), projectIepGoals(), utcDate(), ref_prisma_client

### Community 178 - "organizationAccounts.integration.test.ts"
Cohesion: 0.33
Nodes (5): config, get(), logger, patch(), post()

### Community 179 - "sensoryProfileObservations.integration.test.ts"
Cohesion: 0.33
Nodes (4): config, definitionBody, logger, mutate()

### Community 180 - "resources.integration.test.ts"
Cohesion: 0.40
Nodes (4): config, get(), logger, put()

### Community 181 - "20260827040000_authorized_aggregates/migration.sql"
Cohesion: 0.50
Nodes (3): "prevent_non_draft_weekly_report_change", WeeklyReport_organizationId_studentId_year_weekNumber_key, "WeeklyReport_prevent_non_draft_update"

## Ambiguous Edges - Review These
- `Milestone 7 — Production hardening` → `PostgreSQL backup and restore runbook`  [AMBIGUOUS]
  docs/ROADMAP.md · relation: conceptually_related_to

## Knowledge Gaps
- **1012 isolated node(s):** `singleQuote`, `trailingComma`, `name`, `version`, `private` (+1007 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1226 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **76 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Milestone 7 — Production hardening` and `PostgreSQL backup and restore runbook`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `@playwright/test` connect `@playwright/test` to `p5-learning-journeys.spec.ts`, `package.json`, `p5-weekly-reports.spec.ts`, `p5-ieps.spec.ts`?**
  _High betweenness centrality (0.185) - this node is a cross-community bridge._
- **Why does `csrf()` connect `iepManagement.integration.test.ts` to `SessionService`, `organizationAccounts.integration.test.ts`, `sensoryProfileObservations.integration.test.ts`, `resources.integration.test.ts`, `config.ts`, `p5-weekly-reports.spec.ts`?**
  _High betweenness centrality (0.183) - this node is a cross-community bridge._
- **Why does `@oxlint/plugins` connect `anti-slop/index.ts` to `padding-line-between-statements.ts`, `no-unsafe-dictionary-type.ts`, `no-known-value-widening.ts`, `no-object-parameters.ts`, `no-widen-then-assert.ts`, `package.json`, `no-chained-type-assertions.ts`, `type-alias-resolution.ts`, `dictionary-types.ts`, `no-reduce-accumulator-copy.ts`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `useApp()` (e.g. with `AttendanceView.test.tsx` and `CoordinatorObservationManager.test.tsx`) actually correct?**
  _`useApp()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `singleQuote`, `trailingComma`, `name` to the rest of the system?**
  _1012 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `resources.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.00784313725490196 - nodes in this community are weakly interconnected._