CREATE UNIQUE INDEX "IEP_one_active_per_student"
ON "public"."IEP"("organizationId", "studentId")
WHERE "state" = 'ACTIVE';
