BEGIN;

ALTER TABLE "Organization"
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';

LOCK TABLE "WeeklyReport" IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "WeeklyReport"
    GROUP BY
      "organizationId",
      "studentId",
      DATE_TRUNC('week', "weekStart")::DATE
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'WeeklyReport ISO normalization would create duplicate organization/student/week records. Resolve reports whose weekStart values normalize to the same ISO Monday before applying this migration.';
  END IF;
END
$$;

DROP INDEX "WeeklyReport_organizationId_studentId_year_weekNumber_key";
DROP TRIGGER "WeeklyReport_prevent_non_draft_update" ON "WeeklyReport";

UPDATE "WeeklyReport"
SET
  "year" = EXTRACT(ISOYEAR FROM "weekStart")::INTEGER,
  "weekNumber" = EXTRACT(WEEK FROM "weekStart")::INTEGER,
  "weekStart" = DATE_TRUNC('week', "weekStart")::DATE,
  "weekEnd" = (DATE_TRUNC('week', "weekStart") + INTERVAL '4 days')::DATE;

CREATE TRIGGER "WeeklyReport_prevent_non_draft_update"
BEFORE UPDATE ON "WeeklyReport"
FOR EACH ROW EXECUTE FUNCTION "prevent_non_draft_weekly_report_change"();

CREATE UNIQUE INDEX "WeeklyReport_organizationId_studentId_year_weekNumber_key"
  ON "WeeklyReport"("organizationId", "studentId", "year", "weekNumber");

COMMIT;
