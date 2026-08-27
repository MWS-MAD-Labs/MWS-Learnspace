ALTER TABLE "public"."IEPGoal"
ADD COLUMN "achieved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "achievedDate" DATE,
ADD COLUMN "achievedNote" TEXT,
ADD COLUMN "achievedInReportId" UUID,
ADD COLUMN "achievedEventId" UUID,
ADD COLUMN "lastAddressedDate" DATE,
ADD COLUMN "lastAddressedWeek" INTEGER,
ADD COLUMN "lastAddressedRating" INTEGER,
ADD COLUMN "timesAddressed" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "public"."GoalAchievementEvent"
ADD COLUMN "achievedDate" DATE,
ADD COLUMN "sourceReportVersion" INTEGER;

CREATE UNIQUE INDEX "GoalAchievementEvent_weeklyReportId_goalId_sourceReportVersion_key"
ON "public"."GoalAchievementEvent"("weeklyReportId", "goalId", "sourceReportVersion");

CREATE UNIQUE INDEX "IEPGoal_achievedEventId_key"
ON "public"."IEPGoal"("achievedEventId");

ALTER TABLE "public"."IEPGoal"
ADD CONSTRAINT "IEPGoal_achievedInReportId_iepId_fkey"
FOREIGN KEY ("achievedInReportId", "iepId")
REFERENCES "public"."WeeklyReport"("id", "iepId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."IEPGoal"
ADD CONSTRAINT "IEPGoal_achievedEventId_fkey"
FOREIGN KEY ("achievedEventId")
REFERENCES "public"."GoalAchievementEvent"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."IEPGoal"
ADD CONSTRAINT "IEPGoal_lastAddressedRating_check"
CHECK ("lastAddressedRating" IS NULL OR "lastAddressedRating" BETWEEN 1 AND 5);

ALTER TABLE "public"."GoalAchievementEvent"
DISABLE TRIGGER "GoalAchievementEvent_actor_membership";

INSERT INTO "public"."GoalAchievementEvent" (
  "id",
  "organizationId",
  "iepId",
  "goalId",
  "weeklyReportId",
  "actorId",
  "achieved",
  "note",
  "achievedDate",
  "sourceReportVersion",
  "occurredAt"
)
SELECT
  gen_random_uuid(),
  report."organizationId",
  progress."iepId",
  progress."goalId",
  progress."weeklyReportId",
  report."teacherId",
  true,
  progress."achievedNote",
  progress."achievedDate",
  report."version",
  report."updatedAt"
FROM "public"."WeeklyGoalProgress" progress
JOIN "public"."WeeklyReport" report ON report."id" = progress."weeklyReportId"
WHERE progress."markedAchievedThisWeek" = true
ON CONFLICT ("weeklyReportId", "goalId", "sourceReportVersion") DO NOTHING;

ALTER TABLE "public"."GoalAchievementEvent"
ENABLE TRIGGER "GoalAchievementEvent_actor_membership";

ALTER TABLE "public"."IEPGoal"
DISABLE TRIGGER "IEPGoal_historical_immutable";

WITH addressed AS (
  SELECT
    progress."goalId",
    COUNT(*)::INTEGER AS "timesAddressed"
  FROM "public"."WeeklyGoalProgress" progress
  WHERE progress."addressedThisWeek" = true
  GROUP BY progress."goalId"
), latest_progress AS (
  SELECT DISTINCT ON (progress."goalId")
    progress."goalId",
    report."weekEnd",
    report."weekNumber",
    progress."rating"
  FROM "public"."WeeklyGoalProgress" progress
  JOIN "public"."WeeklyReport" report ON report."id" = progress."weeklyReportId"
  WHERE progress."addressedThisWeek" = true
  ORDER BY progress."goalId", report."weekEnd" DESC, report."weekNumber" DESC, report."id" DESC
), latest_achievement AS (
  SELECT DISTINCT ON (event."goalId")
    event."goalId",
    event."id" AS "eventId",
    event."weeklyReportId",
    event."achievedDate",
    event."note"
  FROM "public"."GoalAchievementEvent" event
  WHERE event."achieved" = true
  ORDER BY event."goalId", COALESCE(event."achievedDate"::timestamp, event."occurredAt") DESC, event."id" DESC
)
UPDATE "public"."IEPGoal" goal
SET
  "timesAddressed" = COALESCE(addressed."timesAddressed", 0),
  "lastAddressedDate" = latest_progress."weekEnd",
  "lastAddressedWeek" = latest_progress."weekNumber",
  "lastAddressedRating" = latest_progress."rating",
  "achieved" = latest_achievement."eventId" IS NOT NULL,
  "achievedDate" = latest_achievement."achievedDate",
  "achievedNote" = latest_achievement."note",
  "achievedInReportId" = latest_achievement."weeklyReportId",
  "achievedEventId" = latest_achievement."eventId"
FROM addressed
FULL JOIN latest_progress ON latest_progress."goalId" = addressed."goalId"
FULL JOIN latest_achievement ON latest_achievement."goalId" = COALESCE(addressed."goalId", latest_progress."goalId")
WHERE goal."id" = COALESCE(addressed."goalId", latest_progress."goalId", latest_achievement."goalId");

ALTER TABLE "public"."IEPGoal"
ENABLE TRIGGER "IEPGoal_historical_immutable";

CREATE OR REPLACE FUNCTION "public"."protect_historical_iep_child"() RETURNS trigger AS $$
DECLARE old_parent_state "public"."WorkflowState";
DECLARE new_parent_state "public"."WorkflowState";
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT "state" INTO old_parent_state FROM "public"."IEP" WHERE "id" = OLD."iepId";
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT "state" INTO new_parent_state FROM "public"."IEP" WHERE "id" = NEW."iepId";
  END IF;
  IF old_parent_state <> 'DRAFT' OR new_parent_state <> 'DRAFT' THEN
    IF TG_TABLE_NAME = 'IEPGoal' AND TG_OP = 'UPDATE' AND
       NEW."iepId" IS NOT DISTINCT FROM OLD."iepId" AND
       NEW."code" IS NOT DISTINCT FROM OLD."code" AND
       NEW."performanceArea" IS NOT DISTINCT FROM OLD."performanceArea" AND
       NEW."longTermGoal" IS NOT DISTINCT FROM OLD."longTermGoal" AND
       NEW."shortTermGoal" IS NOT DISTINCT FROM OLD."shortTermGoal" AND
       NEW."measurableGoal" IS NOT DISTINCT FROM OLD."measurableGoal" AND
       NEW."strategyActivity" IS NOT DISTINCT FROM OLD."strategyActivity" AND
       NEW."learningExpectation" IS NOT DISTINCT FROM OLD."learningExpectation" AND
       NEW."learningStrategy" IS NOT DISTINCT FROM OLD."learningStrategy" AND
       NEW."evaluationMethod" IS NOT DISTINCT FROM OLD."evaluationMethod" AND
       NEW."schedule" IS NOT DISTINCT FROM OLD."schedule" AND
       NEW."targetDate" IS NOT DISTINCT FROM OLD."targetDate" AND
       NEW."active" IS NOT DISTINCT FROM OLD."active" AND
       NEW."position" IS NOT DISTINCT FROM OLD."position" THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'historical IEP child content is immutable';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;
