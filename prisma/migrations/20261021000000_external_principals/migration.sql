-- CreateTable
CREATE TABLE "ExternalPrincipal" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "issuer" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "linkSource" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalPrincipal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalPrincipal_issuer_subject_key" ON "ExternalPrincipal"("issuer", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalPrincipal_userId_issuer_key" ON "ExternalPrincipal"("userId", "issuer");

-- CreateIndex
CREATE INDEX "ExternalPrincipal_userId_idx" ON "ExternalPrincipal"("userId");

-- AddForeignKey
ALTER TABLE "ExternalPrincipal" ADD CONSTRAINT "ExternalPrincipal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
