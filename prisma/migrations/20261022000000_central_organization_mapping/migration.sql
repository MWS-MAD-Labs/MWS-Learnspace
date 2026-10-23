-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "centralOrganizationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_centralOrganizationId_key" ON "Organization"("centralOrganizationId");
