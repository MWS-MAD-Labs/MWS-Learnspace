-- AlterEnum
ALTER TYPE "public"."MembershipRole" ADD VALUE 'SPECIAL_ED_COORDINATOR' BEFORE 'SPECIAL_ED_TEACHER';


-- CreateTable
CREATE TABLE "public"."UserInvitation" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."MembershipRole" NOT NULL,
    "roleTitle" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OAuthLoginTransaction" (
    "id" UUID NOT NULL,
    "stateHash" TEXT NOT NULL,
    "nonceHash" TEXT NOT NULL,
    "verifierHash" TEXT NOT NULL,
    "redirectPath" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthLoginTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserInvitation_email_expiresAt_acceptedAt_idx" ON "public"."UserInvitation"("email", "expiresAt", "acceptedAt");
CREATE INDEX "UserInvitation_organizationId_email_idx" ON "public"."UserInvitation"("organizationId", "email");
CREATE UNIQUE INDEX "OAuthLoginTransaction_stateHash_key" ON "public"."OAuthLoginTransaction"("stateHash");
CREATE INDEX "OAuthLoginTransaction_expiresAt_consumedAt_idx" ON "public"."OAuthLoginTransaction"("expiresAt", "consumedAt");

-- AddForeignKey
ALTER TABLE "public"."UserInvitation" ADD CONSTRAINT "UserInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."UserInvitation" ADD CONSTRAINT "UserInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
