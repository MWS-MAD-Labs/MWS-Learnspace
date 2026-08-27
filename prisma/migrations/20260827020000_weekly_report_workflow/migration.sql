ALTER TABLE "public"."WeeklyReport"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION "public"."prevent_non_draft_weekly_report_change"()
RETURNS trigger AS $$
BEGIN
  IF OLD."state" <> 'DRAFT' AND (
    NEW."studentId" IS DISTINCT FROM OLD."studentId" OR
    NEW."iepId" IS DISTINCT FROM OLD."iepId" OR
    NEW."year" IS DISTINCT FROM OLD."year" OR
    NEW."weekNumber" IS DISTINCT FROM OLD."weekNumber" OR
    NEW."weekStart" IS DISTINCT FROM OLD."weekStart" OR
    NEW."weekEnd" IS DISTINCT FROM OLD."weekEnd" OR
    NEW."teacherId" IS DISTINCT FROM OLD."teacherId" OR
    NEW."descriptiveObservation" IS DISTINCT FROM OLD."descriptiveObservation" OR
    NEW."homeConnection" IS DISTINCT FROM OLD."homeConnection"
  ) THEN
    RAISE EXCEPTION 'Historical weekly report content is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "WeeklyReport_prevent_non_draft_update"
BEFORE UPDATE ON "public"."WeeklyReport"
FOR EACH ROW EXECUTE FUNCTION "public"."prevent_non_draft_weekly_report_change"();

CREATE OR REPLACE FUNCTION "public"."prevent_non_draft_weekly_progress_change"()
RETURNS trigger AS $$
DECLARE report_state "public"."WorkflowState";
DECLARE report_id uuid;
BEGIN
  report_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."weeklyReportId" ELSE NEW."weeklyReportId" END;
  SELECT "state" INTO report_state FROM "public"."WeeklyReport" WHERE "id" = report_id;
  IF report_state <> 'DRAFT' THEN
    RAISE EXCEPTION 'Weekly progress on historical reports is immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "WeeklyGoalProgress_prevent_non_draft_change"
BEFORE INSERT OR UPDATE OR DELETE ON "public"."WeeklyGoalProgress"
FOR EACH ROW EXECUTE FUNCTION "public"."prevent_non_draft_weekly_progress_change"();

CREATE OR REPLACE FUNCTION "public"."prevent_weekly_report_workflow_event_change"()
RETURNS trigger AS $$
BEGIN
  IF OLD."aggregateType" = 'WEEKLY_REPORT' THEN
    RAISE EXCEPTION 'Weekly report workflow history is immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "WorkflowEvent_prevent_weekly_report_history_change"
BEFORE UPDATE OR DELETE ON "public"."WorkflowEvent"
FOR EACH ROW EXECUTE FUNCTION "public"."prevent_weekly_report_workflow_event_change"();
