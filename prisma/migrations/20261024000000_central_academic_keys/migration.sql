-- AlterTable
ALTER TABLE "AcademicYear" ADD COLUMN "centralId" TEXT;
ALTER TABLE "Unit" ADD COLUMN "centralId" TEXT;
ALTER TABLE "Grade" ADD COLUMN "centralId" TEXT;
ALTER TABLE "SchoolClass" ADD COLUMN "centralId" TEXT;
ALTER TABLE "Subject" ADD COLUMN "centralKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_organizationId_centralId_key" ON "AcademicYear"("organizationId", "centralId");
CREATE UNIQUE INDEX "Unit_organizationId_centralId_key" ON "Unit"("organizationId", "centralId");
CREATE UNIQUE INDEX "Grade_organizationId_centralId_key" ON "Grade"("organizationId", "centralId");
CREATE UNIQUE INDEX "SchoolClass_organizationId_centralId_key" ON "SchoolClass"("organizationId", "centralId");
CREATE UNIQUE INDEX "Subject_organizationId_centralKey_key" ON "Subject"("organizationId", "centralKey");
