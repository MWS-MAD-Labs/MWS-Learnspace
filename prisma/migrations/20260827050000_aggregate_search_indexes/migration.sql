BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER INDEX "GoalAchievementEvent_weeklyReportId_goalId_sourceReportVersion_"
  RENAME TO "GoalAchievementEvent_weeklyReportId_goalId_sourceReportVers_key";

CREATE INDEX "LearningJourney_organizationId_updatedAt_id_idx"
  ON "LearningJourney"("organizationId", "updatedAt" DESC, "id");
CREATE INDEX "LearningJourney_organizationId_unitId_state_idx"
  ON "LearningJourney"("organizationId", "unitId", "state");
CREATE INDEX "LearningJourney_organizationId_gradeId_state_idx"
  ON "LearningJourney"("organizationId", "gradeId", "state");
CREATE INDEX "LearningJourney_organizationId_subjectId_state_idx"
  ON "LearningJourney"("organizationId", "subjectId", "state");
CREATE INDEX "LearningJourney_title_trgm_idx"
  ON "LearningJourney" USING GIN ("title" gin_trgm_ops);

CREATE INDEX "Student_fullName_trgm_idx"
  ON "Student" USING GIN ("fullName" gin_trgm_ops);
CREATE INDEX "Student_nickname_trgm_idx"
  ON "Student" USING GIN ("nickname" gin_trgm_ops);
CREATE INDEX "Student_studentNumber_trgm_idx"
  ON "Student" USING GIN ("studentNumber" gin_trgm_ops);

CREATE INDEX "IEP_organizationId_state_updatedAt_idx"
  ON "IEP"("organizationId", "state", "updatedAt" DESC);
CREATE INDEX "IEP_primaryClassification_trgm_idx"
  ON "IEP" USING GIN ("primaryClassification" gin_trgm_ops);
CREATE INDEX "IEP_currentPlacement_trgm_idx"
  ON "IEP" USING GIN ("currentPlacement" gin_trgm_ops);

CREATE INDEX "IEPGoal_code_trgm_idx"
  ON "IEPGoal" USING GIN ("code" gin_trgm_ops);
CREATE INDEX "IEPGoal_measurableGoal_trgm_idx"
  ON "IEPGoal" USING GIN ("measurableGoal" gin_trgm_ops);
CREATE INDEX "IEPGoal_performanceArea_trgm_idx"
  ON "IEPGoal" USING GIN ("performanceArea" gin_trgm_ops);

CREATE INDEX "WeeklyReport_organizationId_state_updatedAt_idx"
  ON "WeeklyReport"("organizationId", "state", "updatedAt" DESC);
CREATE INDEX "WeeklyReport_organizationId_teacherId_state_updatedAt_idx"
  ON "WeeklyReport"("organizationId", "teacherId", "state", "updatedAt" DESC);
CREATE INDEX "WeeklyReport_descriptiveObservation_trgm_idx"
  ON "WeeklyReport" USING GIN ("descriptiveObservation" gin_trgm_ops);
CREATE INDEX "WeeklyReport_homeConnection_trgm_idx"
  ON "WeeklyReport" USING GIN ("homeConnection" gin_trgm_ops);

CREATE INDEX "ObservationAssignment_organizationId_status_dueDate_id_idx"
  ON "ObservationAssignment"("organizationId", "status", "dueDate", "id");

COMMIT;
