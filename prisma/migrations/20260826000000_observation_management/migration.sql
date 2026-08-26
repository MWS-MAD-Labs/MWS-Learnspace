-- AlterEnum
ALTER TYPE "public"."ObservationStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "public"."ObservationAssignment"
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancelledById" UUID,
ADD COLUMN "cancellationReason" TEXT;

-- CreateIndex
CREATE INDEX "ObservationAssignment_cancelledById_idx" ON "public"."ObservationAssignment"("cancelledById");

-- AddForeignKey
ALTER TABLE "public"."ObservationAssignment"
ADD CONSTRAINT "ObservationAssignment_cancelledById_fkey"
FOREIGN KEY ("cancelledById") REFERENCES "public"."User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Validate the session-derived cancellation actor against the assignment tenant.
CREATE TRIGGER "ObservationAssignment_canceller_membership"
BEFORE INSERT OR UPDATE ON "public"."ObservationAssignment"
FOR EACH ROW EXECUTE FUNCTION "public"."validate_active_organization_user"('cancelledById');
