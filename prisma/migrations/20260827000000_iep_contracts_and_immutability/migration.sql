ALTER TABLE "public"."IEP"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE FUNCTION "public"."protect_historical_iep_root"() RETURNS trigger AS $$
BEGIN
  IF OLD."state" <> 'DRAFT' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'historical IEP content is immutable';
    END IF;
    IF NEW."organizationId" IS DISTINCT FROM OLD."organizationId" OR
       NEW."studentId" IS DISTINCT FROM OLD."studentId" OR
       NEW."academicYearId" IS DISTINCT FROM OLD."academicYearId" OR
       NEW."semesterId" IS DISTINCT FROM OLD."semesterId" OR
       NEW."consideration" IS DISTINCT FROM OLD."consideration" OR
       NEW."primaryClassification" IS DISTINCT FROM OLD."primaryClassification" OR
       NEW."currentPlacement" IS DISTINCT FROM OLD."currentPlacement" OR
       NEW."homePartnershipSupport" IS DISTINCT FROM OLD."homePartnershipSupport" OR
       NEW."homePartnershipRecommendations" IS DISTINCT FROM OLD."homePartnershipRecommendations" OR
       NEW."progressMeasurementMethods" IS DISTINCT FROM OLD."progressMeasurementMethods" OR
       NEW."parentCommunicationMethods" IS DISTINCT FROM OLD."parentCommunicationMethods" OR
       NEW."parentApproved" IS DISTINCT FROM OLD."parentApproved" OR
       NEW."parentName" IS DISTINCT FROM OLD."parentName" OR
       NEW."parentApprovalDate" IS DISTINCT FROM OLD."parentApprovalDate" OR
       NEW."startsOn" IS DISTINCT FROM OLD."startsOn" OR
       NEW."endsOn" IS DISTINCT FROM OLD."endsOn" OR
       NEW."createdById" IS DISTINCT FROM OLD."createdById" OR
       NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
      RAISE EXCEPTION 'historical IEP content is immutable';
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "IEP_historical_immutable"
BEFORE UPDATE OR DELETE ON "public"."IEP"
FOR EACH ROW EXECUTE FUNCTION "public"."protect_historical_iep_root"();

CREATE FUNCTION "public"."protect_historical_iep_child"() RETURNS trigger AS $$
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
    RAISE EXCEPTION 'historical IEP child content is immutable';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "IEPTeamMember_historical_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "public"."IEPTeamMember"
FOR EACH ROW EXECUTE FUNCTION "public"."protect_historical_iep_child"();
CREATE TRIGGER "IEPPerformanceArea_historical_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "public"."IEPPerformanceArea"
FOR EACH ROW EXECUTE FUNCTION "public"."protect_historical_iep_child"();
CREATE TRIGGER "IEPAccommodation_historical_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "public"."IEPAccommodation"
FOR EACH ROW EXECUTE FUNCTION "public"."protect_historical_iep_child"();
CREATE TRIGGER "IEPGoal_historical_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "public"."IEPGoal"
FOR EACH ROW EXECUTE FUNCTION "public"."protect_historical_iep_child"();
CREATE TRIGGER "IEPServiceSchedule_historical_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "public"."IEPServiceSchedule"
FOR EACH ROW EXECUTE FUNCTION "public"."protect_historical_iep_child"();
