-- AlterTable
ALTER TABLE "Student" ADD COLUMN "centralId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Student_organizationId_centralId_key" ON "Student"("organizationId", "centralId");
