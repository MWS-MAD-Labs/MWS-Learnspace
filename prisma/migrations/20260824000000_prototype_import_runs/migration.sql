CREATE TABLE "ImportRun" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "formatVersion" INTEGER NOT NULL,
    "exportSha256" TEXT NOT NULL,
    "operatorId" UUID,
    "acceptedCount" INTEGER NOT NULL,
    "transformedCount" INTEGER NOT NULL,
    "skippedCount" INTEGER NOT NULL,
    "rejectedCount" INTEGER NOT NULL,
    "summary" JSONB NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImportRun_organizationId_sourceKey_key"
ON "ImportRun"("organizationId", "sourceKey");


CREATE INDEX "ImportRun_organizationId_appliedAt_idx"
ON "ImportRun"("organizationId", "appliedAt");

ALTER TABLE "ImportRun"
ADD CONSTRAINT "ImportRun_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ImportRun"
ADD CONSTRAINT "ImportRun_operatorId_fkey"
FOREIGN KEY ("operatorId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
