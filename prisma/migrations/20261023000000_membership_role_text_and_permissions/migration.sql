-- A role is now the key of a Central role, so the column holds text instead of the fixed enum, and the permissions of
-- the membership are kept next to it. Memberships that exist get the permissions their built-in role gave them, so
-- nobody gains or loses access.

-- AlterTable
ALTER TABLE "Membership" ALTER COLUMN "role" TYPE TEXT USING "role"::text;
ALTER TABLE "Membership" ADD COLUMN "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "UserInvitation" ALTER COLUMN "role" TYPE TEXT USING "role"::text;

-- Backfill
UPDATE "Membership" SET "permissions" = ARRAY['attendance:read', 'journey:read', 'journey:approve', 'special-ed:read', 'special-ed:review', 'report:export', 'student:admin', 'student:sensitive-read', 'staff-directory:read', 'staff-assignment:admin', 'organization:admin', 'scope.organization', 'iep:director-approve', 'iep:director-return', 'iep:activate', 'iep:archive', 'weekly-report:direct']::TEXT[] WHERE "role" = 'DIRECTOR';
UPDATE "Membership" SET "permissions" = ARRAY['attendance:read', 'journey:read', 'journey:review', 'special-ed:read', 'special-ed:review', 'report:export', 'student:sensitive-read', 'staff-directory:read', 'scope.organization']::TEXT[] WHERE "role" = 'PRINCIPAL';
UPDATE "Membership" SET "permissions" = ARRAY['attendance:read', 'attendance:write', 'journey:read', 'journey:write', 'scope.grade']::TEXT[] WHERE "role" = 'GRADE_TEACHER';
UPDATE "Membership" SET "permissions" = ARRAY['journey:read', 'journey:write', 'scope.subject']::TEXT[] WHERE "role" = 'SUBJECT_TEACHER';
UPDATE "Membership" SET "permissions" = ARRAY['attendance:read', 'special-ed:read', 'special-ed:write', 'special-ed:review', 'report:export', 'student:sensitive-read', 'staff-directory:read', 'staff-assignment:admin', 'observation:manage', 'scope.special-ed', 'iep:submit', 'iep:coordinator-approve', 'iep:coordinator-return', 'weekly-report:coordinate']::TEXT[] WHERE "role" = 'SPECIAL_ED_COORDINATOR';
UPDATE "Membership" SET "permissions" = ARRAY['attendance:read', 'special-ed:read', 'special-ed:write', 'scope.assigned', 'iep:submit', 'weekly-report:teach']::TEXT[] WHERE "role" = 'SPECIAL_ED_TEACHER';
UPDATE "Membership" SET "permissions" = ARRAY['special-ed:read', 'special-ed:write', 'scope.assigned', 'iep:submit', 'weekly-report:teach']::TEXT[] WHERE "role" = 'SPECIALIST';

-- DropEnum
DROP TYPE "public"."MembershipRole";
