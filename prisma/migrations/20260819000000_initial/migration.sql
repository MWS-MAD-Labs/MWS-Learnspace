-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AccountStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "public"."MembershipRole" AS ENUM ('PRINCIPAL', 'DIRECTOR', 'GRADE_TEACHER', 'SUBJECT_TEACHER', 'SPECIAL_ED_TEACHER', 'SPECIALIST');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "public"."AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'SICK', 'EXCUSED_ABSENCE', 'UNEXCUSED_ABSENCE');

-- CreateEnum
CREATE TYPE "public"."WorkflowState" AS ENUM ('DRAFT', 'PRINCIPAL_REVIEW', 'COORDINATOR_REVIEW', 'DIRECTOR_APPROVAL', 'APPROVED', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."WorkflowAction" AS ENUM ('SUBMITTED', 'APPROVED', 'RETURNED', 'UPDATED', 'ACTIVATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."WorkflowAggregateType" AS ENUM ('LEARNING_JOURNEY', 'IEP', 'WEEKLY_REPORT');

-- CreateEnum
CREATE TYPE "public"."ObservationType" AS ENUM ('FEDC', 'SENSORY_PROFILE', 'SFA');

-- CreateEnum
CREATE TYPE "public"."ObservationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."ServiceType" AS ENUM ('INDIVIDUAL', 'GROUP', 'CONSULTATION');

-- CreateEnum
CREATE TYPE "public"."AccommodationCategory" AS ENUM ('ACADEMIC', 'INSTRUCTIONAL', 'ENVIRONMENTAL', 'ASSESSMENT');

-- CreateEnum
CREATE TYPE "public"."AuditResult" AS ENUM ('SUCCEEDED', 'DENIED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "status" "public"."AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Membership" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "public"."MembershipRole" NOT NULL,
    "roleTitle" TEXT,
    "status" "public"."AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OAuthAccount" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AcademicYear" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Semester" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Unit" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Grade" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SchoolClass" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "gradeId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SchoolClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subject" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MembershipUnit" (
    "membershipId" UUID NOT NULL,
    "unitId" UUID NOT NULL,

    CONSTRAINT "MembershipUnit_pkey" PRIMARY KEY ("membershipId","unitId")
);

-- CreateTable
CREATE TABLE "public"."MembershipGrade" (
    "membershipId" UUID NOT NULL,
    "gradeId" UUID NOT NULL,

    CONSTRAINT "MembershipGrade_pkey" PRIMARY KEY ("membershipId","gradeId")
);

-- CreateTable
CREATE TABLE "public"."MembershipSubject" (
    "membershipId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,

    CONSTRAINT "MembershipSubject_pkey" PRIMARY KEY ("membershipId","subjectId")
);

-- CreateTable
CREATE TABLE "public"."Student" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "studentNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nickname" TEXT,
    "gender" "public"."Gender" NOT NULL DEFAULT 'UNSPECIFIED',
    "dateOfBirth" DATE NOT NULL,
    "address" TEXT,
    "specialNeedsFlag" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "avatarUrl" TEXT,
    "primaryClassification" TEXT,
    "currentPlacement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Enrollment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GuardianContact" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuardianContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StaffStudentAssignment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "roleContext" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE,
    "maxCaseload" INTEGER,

    CONSTRAINT "StaffStudentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AttendanceRecord" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "schoolDate" DATE NOT NULL,
    "status" "public"."AttendanceStatus" NOT NULL,
    "minutesLate" INTEGER,
    "notes" TEXT,
    "recordedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LearningJourney" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "academicYearId" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "gradeId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "state" "public"."WorkflowState" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningJourney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LearningJourneyOwner" (
    "learningJourneyId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,

    CONSTRAINT "LearningJourneyOwner_pkey" PRIMARY KEY ("learningJourneyId","membershipId")
);

-- CreateTable
CREATE TABLE "public"."LearningJourneyProject" (
    "id" UUID NOT NULL,
    "learningJourneyId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "color" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "LearningJourneyProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LearningGoal" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "LearningGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CrossCurricularConnection" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CrossCurricularConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkflowEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "aggregateType" "public"."WorkflowAggregateType" NOT NULL,
    "aggregateId" UUID NOT NULL,
    "fromState" "public"."WorkflowState" NOT NULL,
    "toState" "public"."WorkflowState" NOT NULL,
    "action" "public"."WorkflowAction" NOT NULL,
    "actorId" UUID NOT NULL,
    "comment" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ObservationDefinition" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "definitionKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "type" "public"."ObservationType" NOT NULL,
    "title" TEXT NOT NULL,
    "framework" TEXT,
    "description" TEXT,
    "targetAges" TEXT,
    "defaultFrequency" TEXT,
    "body" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObservationDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ObservationAssignment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "definitionId" UUID NOT NULL,
    "assignedToId" UUID NOT NULL,
    "assignedById" UUID,
    "academicYear" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "priority" TEXT,
    "notes" TEXT,
    "status" "public"."ObservationStatus" NOT NULL DEFAULT 'PENDING',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ObservationAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FEDCObservation" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "definitionId" UUID NOT NULL,
    "observerId" UUID NOT NULL,
    "observationDate" DATE NOT NULL,
    "status" "public"."ObservationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "responses" JSONB NOT NULL,
    "milestoneScores" JSONB NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "maxPossibleScore" INTEGER NOT NULL,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FEDCObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SensoryProfileObservation" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "definitionId" UUID NOT NULL,
    "observerId" UUID NOT NULL,
    "observationDate" DATE NOT NULL,
    "status" "public"."ObservationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "teacherContactFrequency" TEXT,
    "teacherContactLength" TEXT,
    "responses" JSONB NOT NULL,
    "sectionScores" JSONB NOT NULL,
    "totalRawScore" INTEGER NOT NULL,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SensoryProfileObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SFAObservation" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "definitionId" UUID NOT NULL,
    "observerId" UUID NOT NULL,
    "assessmentDate" DATE NOT NULL,
    "observationDate" DATE,
    "status" "public"."ObservationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "programRecommendation" TEXT NOT NULL,
    "primaryLanguage" TEXT,
    "writingMethod" TEXT,
    "mobilityMethod" TEXT,
    "conditionsAffectingPerformance" TEXT,
    "respondents" JSONB NOT NULL,
    "participationScores" JSONB NOT NULL,
    "settings" JSONB,
    "taskSupports" JSONB NOT NULL,
    "activityPerformance" JSONB NOT NULL,
    "adaptations" JSONB NOT NULL,
    "participationAverage" DECIMAL(5,2) NOT NULL,
    "totalParticipationRawScore" INTEGER,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SFAObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IEP" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "semesterId" UUID,
    "state" "public"."WorkflowState" NOT NULL DEFAULT 'DRAFT',
    "consideration" TEXT NOT NULL,
    "primaryClassification" TEXT NOT NULL,
    "currentPlacement" TEXT NOT NULL,
    "homePartnershipSupport" TEXT,
    "homePartnershipRecommendations" TEXT,
    "progressMeasurementMethods" JSONB NOT NULL,
    "parentCommunicationMethods" JSONB NOT NULL,
    "parentApproved" BOOLEAN NOT NULL DEFAULT false,
    "parentName" TEXT,
    "parentApprovalDate" DATE,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IEP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IEPTeamMember" (
    "id" UUID NOT NULL,
    "iepId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initials" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IEPTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IEPPerformanceArea" (
    "id" UUID NOT NULL,
    "iepId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "strengths" TEXT NOT NULL,
    "needs" TEXT NOT NULL,
    "impactOfNeed" TEXT,
    "informationSource" TEXT,
    "assessmentProcess" TEXT,
    "assessmentDate" DATE,
    "summaryOfResults" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IEPPerformanceArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IEPAccommodation" (
    "id" UUID NOT NULL,
    "iepId" UUID NOT NULL,
    "category" "public"."AccommodationCategory" NOT NULL,
    "subject" TEXT,
    "code" TEXT,
    "description" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IEPAccommodation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IEPGoal" (
    "id" UUID NOT NULL,
    "iepId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "performanceArea" TEXT NOT NULL,
    "longTermGoal" TEXT,
    "shortTermGoal" TEXT,
    "measurableGoal" TEXT NOT NULL,
    "strategyActivity" TEXT,
    "learningExpectation" TEXT,
    "learningStrategy" TEXT,
    "evaluationMethod" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "targetDate" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IEPGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IEPServiceSchedule" (
    "id" UUID NOT NULL,
    "iepId" UUID NOT NULL,
    "serviceName" TEXT NOT NULL,
    "type" "public"."ServiceType" NOT NULL,
    "duration" TEXT NOT NULL,
    "frequency" TEXT,
    "location" TEXT NOT NULL,
    "days" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IEPServiceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WeeklyReport" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "iepId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "weekStart" DATE NOT NULL,
    "weekEnd" DATE NOT NULL,
    "teacherId" UUID NOT NULL,
    "state" "public"."WorkflowState" NOT NULL DEFAULT 'DRAFT',
    "descriptiveObservation" TEXT NOT NULL,
    "homeConnection" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WeeklyGoalProgress" (
    "id" UUID NOT NULL,
    "weeklyReportId" UUID NOT NULL,
    "iepId" UUID NOT NULL,
    "goalId" UUID NOT NULL,
    "addressedThisWeek" BOOLEAN NOT NULL DEFAULT false,
    "rating" INTEGER,
    "notes" TEXT,
    "markedAchievedThisWeek" BOOLEAN NOT NULL DEFAULT false,
    "achievedDate" DATE,
    "achievedNote" TEXT,

    CONSTRAINT "WeeklyGoalProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GoalAchievementEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "iepId" UUID NOT NULL,
    "goalId" UUID NOT NULL,
    "weeklyReportId" UUID,
    "actorId" UUID NOT NULL,
    "achieved" BOOLEAN NOT NULL,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalAchievementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "result" "public"."AuditResult" NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "public"."Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Membership_organizationId_role_status_idx" ON "public"."Membership"("organizationId", "role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_organizationId_userId_key" ON "public"."Membership"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "OAuthAccount_userId_idx" ON "public"."OAuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_provider_providerAccountId_key" ON "public"."OAuthAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "public"."Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "public"."Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Session_expiresAt_revokedAt_idx" ON "public"."Session"("expiresAt", "revokedAt");

-- CreateIndex
CREATE INDEX "AcademicYear_organizationId_startsOn_endsOn_idx" ON "public"."AcademicYear"("organizationId", "startsOn", "endsOn");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_organizationId_name_key" ON "public"."AcademicYear"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Semester_organizationId_idx" ON "public"."Semester"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Semester_academicYearId_position_key" ON "public"."Semester"("academicYearId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Semester_academicYearId_name_key" ON "public"."Semester"("academicYearId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_organizationId_code_key" ON "public"."Unit"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_organizationId_name_key" ON "public"."Unit"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Grade_organizationId_unitId_idx" ON "public"."Grade"("organizationId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_organizationId_code_key" ON "public"."Grade"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_unitId_position_key" ON "public"."Grade"("unitId", "position");

-- CreateIndex
CREATE INDEX "SchoolClass_organizationId_gradeId_idx" ON "public"."SchoolClass"("organizationId", "gradeId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_organizationId_code_key" ON "public"."SchoolClass"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_organizationId_gradeId_name_key" ON "public"."SchoolClass"("organizationId", "gradeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_organizationId_code_key" ON "public"."Subject"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_organizationId_name_key" ON "public"."Subject"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Student_organizationId_status_fullName_idx" ON "public"."Student"("organizationId", "status", "fullName");

-- CreateIndex
CREATE UNIQUE INDEX "Student_organizationId_studentNumber_key" ON "public"."Student"("organizationId", "studentNumber");

-- CreateIndex
CREATE INDEX "Enrollment_organizationId_classId_startsOn_endsOn_idx" ON "public"."Enrollment"("organizationId", "classId", "startsOn", "endsOn");

-- CreateIndex
CREATE INDEX "Enrollment_organizationId_studentId_startsOn_endsOn_idx" ON "public"."Enrollment"("organizationId", "studentId", "startsOn", "endsOn");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_studentId_academicYearId_classId_startsOn_key" ON "public"."Enrollment"("studentId", "academicYearId", "classId", "startsOn");

-- CreateIndex
CREATE INDEX "GuardianContact_organizationId_studentId_idx" ON "public"."GuardianContact"("organizationId", "studentId");

-- CreateIndex
CREATE INDEX "StaffStudentAssignment_organizationId_studentId_startsOn_en_idx" ON "public"."StaffStudentAssignment"("organizationId", "studentId", "startsOn", "endsOn");

-- CreateIndex
CREATE INDEX "StaffStudentAssignment_organizationId_membershipId_startsOn_idx" ON "public"."StaffStudentAssignment"("organizationId", "membershipId", "startsOn", "endsOn");

-- CreateIndex
CREATE UNIQUE INDEX "StaffStudentAssignment_membershipId_studentId_roleContext_s_key" ON "public"."StaffStudentAssignment"("membershipId", "studentId", "roleContext", "startsOn");

-- CreateIndex
CREATE INDEX "AttendanceRecord_organizationId_schoolDate_classId_idx" ON "public"."AttendanceRecord"("organizationId", "schoolDate", "classId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_organizationId_studentId_schoolDate_idx" ON "public"."AttendanceRecord"("organizationId", "studentId", "schoolDate");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_organizationId_studentId_classId_schoolDat_key" ON "public"."AttendanceRecord"("organizationId", "studentId", "classId", "schoolDate");

-- CreateIndex
CREATE INDEX "LearningJourney_organizationId_state_idx" ON "public"."LearningJourney"("organizationId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "LearningJourney_organizationId_academicYearId_semesterId_gr_key" ON "public"."LearningJourney"("organizationId", "academicYearId", "semesterId", "gradeId", "subjectId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "LearningJourneyProject_learningJourneyId_position_key" ON "public"."LearningJourneyProject"("learningJourneyId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "LearningGoal_projectId_position_key" ON "public"."LearningGoal"("projectId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "CrossCurricularConnection_projectId_position_key" ON "public"."CrossCurricularConnection"("projectId", "position");

-- CreateIndex
CREATE INDEX "WorkflowEvent_organizationId_aggregateType_aggregateId_occu_idx" ON "public"."WorkflowEvent"("organizationId", "aggregateType", "aggregateId", "occurredAt");

-- CreateIndex
CREATE INDEX "ObservationDefinition_organizationId_type_isActive_idx" ON "public"."ObservationDefinition"("organizationId", "type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ObservationDefinition_organizationId_definitionKey_version_key" ON "public"."ObservationDefinition"("organizationId", "definitionKey", "version");

-- CreateIndex
CREATE INDEX "ObservationAssignment_organizationId_studentId_status_idx" ON "public"."ObservationAssignment"("organizationId", "studentId", "status");

-- CreateIndex
CREATE INDEX "ObservationAssignment_organizationId_assignedToId_status_du_idx" ON "public"."ObservationAssignment"("organizationId", "assignedToId", "status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "FEDCObservation_assignmentId_key" ON "public"."FEDCObservation"("assignmentId");

-- CreateIndex
CREATE INDEX "FEDCObservation_organizationId_studentId_observationDate_idx" ON "public"."FEDCObservation"("organizationId", "studentId", "observationDate");

-- CreateIndex
CREATE UNIQUE INDEX "SensoryProfileObservation_assignmentId_key" ON "public"."SensoryProfileObservation"("assignmentId");

-- CreateIndex
CREATE INDEX "SensoryProfileObservation_organizationId_studentId_observat_idx" ON "public"."SensoryProfileObservation"("organizationId", "studentId", "observationDate");

-- CreateIndex
CREATE UNIQUE INDEX "SFAObservation_assignmentId_key" ON "public"."SFAObservation"("assignmentId");

-- CreateIndex
CREATE INDEX "SFAObservation_organizationId_studentId_assessmentDate_idx" ON "public"."SFAObservation"("organizationId", "studentId", "assessmentDate");

-- CreateIndex
CREATE INDEX "IEP_organizationId_studentId_state_idx" ON "public"."IEP"("organizationId", "studentId", "state");

-- CreateIndex
CREATE INDEX "IEP_organizationId_academicYearId_idx" ON "public"."IEP"("organizationId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "IEPTeamMember_iepId_position_key" ON "public"."IEPTeamMember"("iepId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "IEPPerformanceArea_iepId_position_key" ON "public"."IEPPerformanceArea"("iepId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "IEPAccommodation_iepId_category_position_key" ON "public"."IEPAccommodation"("iepId", "category", "position");

-- CreateIndex
CREATE UNIQUE INDEX "IEPGoal_iepId_code_key" ON "public"."IEPGoal"("iepId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "IEPGoal_iepId_position_key" ON "public"."IEPGoal"("iepId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "IEPGoal_id_iepId_key" ON "public"."IEPGoal"("id", "iepId");

-- CreateIndex
CREATE UNIQUE INDEX "IEPServiceSchedule_iepId_position_key" ON "public"."IEPServiceSchedule"("iepId", "position");

-- CreateIndex
CREATE INDEX "WeeklyReport_organizationId_iepId_weekStart_idx" ON "public"."WeeklyReport"("organizationId", "iepId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_organizationId_studentId_year_weekNumber_key" ON "public"."WeeklyReport"("organizationId", "studentId", "year", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_id_iepId_key" ON "public"."WeeklyReport"("id", "iepId");

-- CreateIndex
CREATE INDEX "WeeklyGoalProgress_iepId_goalId_idx" ON "public"."WeeklyGoalProgress"("iepId", "goalId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyGoalProgress_weeklyReportId_goalId_key" ON "public"."WeeklyGoalProgress"("weeklyReportId", "goalId");

-- CreateIndex
CREATE INDEX "GoalAchievementEvent_organizationId_goalId_occurredAt_idx" ON "public"."GoalAchievementEvent"("organizationId", "goalId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_occurredAt_idx" ON "public"."AuditEvent"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_targetType_targetId_occurredAt_idx" ON "public"."AuditEvent"("organizationId", "targetType", "targetId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_requestId_idx" ON "public"."AuditEvent"("requestId");

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AcademicYear" ADD CONSTRAINT "AcademicYear_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Semester" ADD CONSTRAINT "Semester_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Semester" ADD CONSTRAINT "Semester_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "public"."AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Unit" ADD CONSTRAINT "Unit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Grade" ADD CONSTRAINT "Grade_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Grade" ADD CONSTRAINT "Grade_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "public"."Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SchoolClass" ADD CONSTRAINT "SchoolClass_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SchoolClass" ADD CONSTRAINT "SchoolClass_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "public"."Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SchoolClass" ADD CONSTRAINT "SchoolClass_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "public"."Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subject" ADD CONSTRAINT "Subject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MembershipUnit" ADD CONSTRAINT "MembershipUnit_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "public"."Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MembershipUnit" ADD CONSTRAINT "MembershipUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "public"."Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MembershipGrade" ADD CONSTRAINT "MembershipGrade_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "public"."Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MembershipGrade" ADD CONSTRAINT "MembershipGrade_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "public"."Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MembershipSubject" ADD CONSTRAINT "MembershipSubject_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "public"."Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MembershipSubject" ADD CONSTRAINT "MembershipSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Student" ADD CONSTRAINT "Student_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Enrollment" ADD CONSTRAINT "Enrollment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Enrollment" ADD CONSTRAINT "Enrollment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "public"."AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Enrollment" ADD CONSTRAINT "Enrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuardianContact" ADD CONSTRAINT "GuardianContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuardianContact" ADD CONSTRAINT "GuardianContact_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StaffStudentAssignment" ADD CONSTRAINT "StaffStudentAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StaffStudentAssignment" ADD CONSTRAINT "StaffStudentAssignment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "public"."Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StaffStudentAssignment" ADD CONSTRAINT "StaffStudentAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "public"."Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LearningJourney" ADD CONSTRAINT "LearningJourney_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LearningJourney" ADD CONSTRAINT "LearningJourney_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "public"."AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LearningJourney" ADD CONSTRAINT "LearningJourney_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "public"."Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LearningJourney" ADD CONSTRAINT "LearningJourney_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "public"."Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LearningJourney" ADD CONSTRAINT "LearningJourney_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "public"."Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LearningJourney" ADD CONSTRAINT "LearningJourney_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LearningJourneyOwner" ADD CONSTRAINT "LearningJourneyOwner_learningJourneyId_fkey" FOREIGN KEY ("learningJourneyId") REFERENCES "public"."LearningJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LearningJourneyOwner" ADD CONSTRAINT "LearningJourneyOwner_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "public"."Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LearningJourneyProject" ADD CONSTRAINT "LearningJourneyProject_learningJourneyId_fkey" FOREIGN KEY ("learningJourneyId") REFERENCES "public"."LearningJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LearningGoal" ADD CONSTRAINT "LearningGoal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."LearningJourneyProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CrossCurricularConnection" ADD CONSTRAINT "CrossCurricularConnection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."LearningJourneyProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkflowEvent" ADD CONSTRAINT "WorkflowEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkflowEvent" ADD CONSTRAINT "WorkflowEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ObservationDefinition" ADD CONSTRAINT "ObservationDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ObservationAssignment" ADD CONSTRAINT "ObservationAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ObservationAssignment" ADD CONSTRAINT "ObservationAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ObservationAssignment" ADD CONSTRAINT "ObservationAssignment_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "public"."ObservationDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ObservationAssignment" ADD CONSTRAINT "ObservationAssignment_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ObservationAssignment" ADD CONSTRAINT "ObservationAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FEDCObservation" ADD CONSTRAINT "FEDCObservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FEDCObservation" ADD CONSTRAINT "FEDCObservation_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."ObservationAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FEDCObservation" ADD CONSTRAINT "FEDCObservation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FEDCObservation" ADD CONSTRAINT "FEDCObservation_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "public"."ObservationDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SensoryProfileObservation" ADD CONSTRAINT "SensoryProfileObservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SensoryProfileObservation" ADD CONSTRAINT "SensoryProfileObservation_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."ObservationAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SensoryProfileObservation" ADD CONSTRAINT "SensoryProfileObservation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SensoryProfileObservation" ADD CONSTRAINT "SensoryProfileObservation_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "public"."ObservationDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SFAObservation" ADD CONSTRAINT "SFAObservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SFAObservation" ADD CONSTRAINT "SFAObservation_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."ObservationAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SFAObservation" ADD CONSTRAINT "SFAObservation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SFAObservation" ADD CONSTRAINT "SFAObservation_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "public"."ObservationDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IEP" ADD CONSTRAINT "IEP_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IEP" ADD CONSTRAINT "IEP_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IEP" ADD CONSTRAINT "IEP_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "public"."AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IEP" ADD CONSTRAINT "IEP_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "public"."Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IEPTeamMember" ADD CONSTRAINT "IEPTeamMember_iepId_fkey" FOREIGN KEY ("iepId") REFERENCES "public"."IEP"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IEPPerformanceArea" ADD CONSTRAINT "IEPPerformanceArea_iepId_fkey" FOREIGN KEY ("iepId") REFERENCES "public"."IEP"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IEPAccommodation" ADD CONSTRAINT "IEPAccommodation_iepId_fkey" FOREIGN KEY ("iepId") REFERENCES "public"."IEP"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IEPGoal" ADD CONSTRAINT "IEPGoal_iepId_fkey" FOREIGN KEY ("iepId") REFERENCES "public"."IEP"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IEPServiceSchedule" ADD CONSTRAINT "IEPServiceSchedule_iepId_fkey" FOREIGN KEY ("iepId") REFERENCES "public"."IEP"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WeeklyReport" ADD CONSTRAINT "WeeklyReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WeeklyReport" ADD CONSTRAINT "WeeklyReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WeeklyReport" ADD CONSTRAINT "WeeklyReport_iepId_fkey" FOREIGN KEY ("iepId") REFERENCES "public"."IEP"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WeeklyGoalProgress" ADD CONSTRAINT "WeeklyGoalProgress_weeklyReportId_iepId_fkey" FOREIGN KEY ("weeklyReportId", "iepId") REFERENCES "public"."WeeklyReport"("id", "iepId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WeeklyGoalProgress" ADD CONSTRAINT "WeeklyGoalProgress_goalId_iepId_fkey" FOREIGN KEY ("goalId", "iepId") REFERENCES "public"."IEPGoal"("id", "iepId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GoalAchievementEvent" ADD CONSTRAINT "GoalAchievementEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GoalAchievementEvent" ADD CONSTRAINT "GoalAchievementEvent_goalId_iepId_fkey" FOREIGN KEY ("goalId", "iepId") REFERENCES "public"."IEPGoal"("id", "iepId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GoalAchievementEvent" ADD CONSTRAINT "GoalAchievementEvent_weeklyReportId_iepId_fkey" FOREIGN KEY ("weeklyReportId", "iepId") REFERENCES "public"."WeeklyReport"("id", "iepId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GoalAchievementEvent" ADD CONSTRAINT "GoalAchievementEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LearningJourney" ADD CONSTRAINT "LearningJourney_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LearningJourney" ADD CONSTRAINT "LearningJourney_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FEDCObservation" ADD CONSTRAINT "FEDCObservation_observerId_fkey" FOREIGN KEY ("observerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SensoryProfileObservation" ADD CONSTRAINT "SensoryProfileObservation_observerId_fkey" FOREIGN KEY ("observerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SFAObservation" ADD CONSTRAINT "SFAObservation_observerId_fkey" FOREIGN KEY ("observerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IEP" ADD CONSTRAINT "IEP_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IEP" ADD CONSTRAINT "IEP_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WeeklyReport" ADD CONSTRAINT "WeeklyReport_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain checks not expressible in Prisma schema syntax.
ALTER TABLE "public"."AcademicYear" ADD CONSTRAINT "AcademicYear_date_order_check" CHECK ("startsOn" <= "endsOn");
ALTER TABLE "public"."Semester" ADD CONSTRAINT "Semester_date_order_check" CHECK ("startsOn" <= "endsOn");
ALTER TABLE "public"."Enrollment" ADD CONSTRAINT "Enrollment_date_order_check" CHECK ("endsOn" IS NULL OR "startsOn" <= "endsOn");
ALTER TABLE "public"."StaffStudentAssignment" ADD CONSTRAINT "StaffStudentAssignment_date_order_check" CHECK ("endsOn" IS NULL OR "startsOn" <= "endsOn");
ALTER TABLE "public"."AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_minutes_late_check" CHECK ("minutesLate" IS NULL OR ("status" = 'LATE' AND "minutesLate" > 0));
ALTER TABLE "public"."LearningJourneyProject" ADD CONSTRAINT "LearningJourneyProject_date_order_check" CHECK ("startsOn" <= "endsOn");
ALTER TABLE "public"."IEP" ADD CONSTRAINT "IEP_date_order_check" CHECK ("startsOn" <= "endsOn");
ALTER TABLE "public"."WeeklyReport" ADD CONSTRAINT "WeeklyReport_date_order_check" CHECK ("weekStart" <= "weekEnd");
ALTER TABLE "public"."WeeklyGoalProgress" ADD CONSTRAINT "WeeklyGoalProgress_rating_check" CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5);

-- Tenant ownership is immutable after insertion.
CREATE FUNCTION "public"."protect_tenant_ownership"() RETURNS trigger AS $$
BEGIN
  IF NEW."organizationId" IS DISTINCT FROM OLD."organizationId" THEN
    RAISE EXCEPTION '% organization ownership is immutable', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Membership_tenant_immutable" BEFORE UPDATE ON "public"."Membership" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();

CREATE FUNCTION "public"."protect_membership_identity"() RETURNS trigger AS $$
BEGIN
  IF NEW."userId" IS DISTINCT FROM OLD."userId" THEN
    RAISE EXCEPTION 'membership user identity is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "Membership_user_immutable" BEFORE UPDATE ON "public"."Membership" FOR EACH ROW EXECUTE FUNCTION "public"."protect_membership_identity"();
CREATE TRIGGER "AcademicYear_tenant_immutable" BEFORE UPDATE ON "public"."AcademicYear" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "Semester_tenant_immutable" BEFORE UPDATE ON "public"."Semester" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "Unit_tenant_immutable" BEFORE UPDATE ON "public"."Unit" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "Grade_tenant_immutable" BEFORE UPDATE ON "public"."Grade" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "SchoolClass_tenant_immutable" BEFORE UPDATE ON "public"."SchoolClass" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "Subject_tenant_immutable" BEFORE UPDATE ON "public"."Subject" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "Student_tenant_immutable" BEFORE UPDATE ON "public"."Student" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "Enrollment_tenant_immutable" BEFORE UPDATE ON "public"."Enrollment" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "GuardianContact_tenant_immutable" BEFORE UPDATE ON "public"."GuardianContact" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "StaffStudentAssignment_tenant_immutable" BEFORE UPDATE ON "public"."StaffStudentAssignment" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "AttendanceRecord_tenant_immutable" BEFORE UPDATE ON "public"."AttendanceRecord" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "LearningJourney_tenant_immutable" BEFORE UPDATE ON "public"."LearningJourney" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "WorkflowEvent_tenant_immutable" BEFORE UPDATE ON "public"."WorkflowEvent" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "ObservationDefinition_tenant_immutable" BEFORE UPDATE ON "public"."ObservationDefinition" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "ObservationAssignment_tenant_immutable" BEFORE UPDATE ON "public"."ObservationAssignment" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "FEDCObservation_tenant_immutable" BEFORE UPDATE ON "public"."FEDCObservation" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "SensoryProfileObservation_tenant_immutable" BEFORE UPDATE ON "public"."SensoryProfileObservation" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "SFAObservation_tenant_immutable" BEFORE UPDATE ON "public"."SFAObservation" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "IEP_tenant_immutable" BEFORE UPDATE ON "public"."IEP" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "WeeklyReport_tenant_immutable" BEFORE UPDATE ON "public"."WeeklyReport" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "GoalAchievementEvent_tenant_immutable" BEFORE UPDATE ON "public"."GoalAchievementEvent" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();
CREATE TRIGGER "AuditEvent_tenant_immutable" BEFORE UPDATE ON "public"."AuditEvent" FOR EACH ROW EXECUTE FUNCTION "public"."protect_tenant_ownership"();

-- Tenant consistency checks for every tenant-owned relationship.
CREATE FUNCTION "public"."validate_tenant_fk"() RETURNS trigger AS $$
DECLARE child_organization UUID;
DECLARE parent_organization UUID;
DECLARE parent_id UUID;
BEGIN
  child_organization := (to_jsonb(NEW) ->> TG_ARGV[0])::UUID;
  parent_id := (to_jsonb(NEW) ->> TG_ARGV[2])::UUID;
  IF parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format('SELECT "organizationId" FROM "public".%I WHERE "id" = $1', TG_ARGV[1])
    INTO parent_organization USING parent_id;
  IF parent_organization IS DISTINCT FROM child_organization THEN
    RAISE EXCEPTION '% tenant mismatch: % does not belong to organization %', TG_TABLE_NAME, TG_ARGV[2], child_organization;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Semester_academicYear_tenant" BEFORE INSERT OR UPDATE ON "public"."Semester" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'AcademicYear', 'academicYearId');
CREATE TRIGGER "Grade_unit_tenant" BEFORE INSERT OR UPDATE ON "public"."Grade" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Unit', 'unitId');
CREATE TRIGGER "SchoolClass_unit_tenant" BEFORE INSERT OR UPDATE ON "public"."SchoolClass" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Unit', 'unitId');
CREATE TRIGGER "SchoolClass_grade_tenant" BEFORE INSERT OR UPDATE ON "public"."SchoolClass" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Grade', 'gradeId');
CREATE TRIGGER "Enrollment_student_tenant" BEFORE INSERT OR UPDATE ON "public"."Enrollment" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Student', 'studentId');
CREATE TRIGGER "Enrollment_year_tenant" BEFORE INSERT OR UPDATE ON "public"."Enrollment" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'AcademicYear', 'academicYearId');
CREATE TRIGGER "Enrollment_class_tenant" BEFORE INSERT OR UPDATE ON "public"."Enrollment" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'SchoolClass', 'classId');
CREATE TRIGGER "GuardianContact_student_tenant" BEFORE INSERT OR UPDATE ON "public"."GuardianContact" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Student', 'studentId');
CREATE TRIGGER "StaffStudentAssignment_membership_tenant" BEFORE INSERT OR UPDATE ON "public"."StaffStudentAssignment" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Membership', 'membershipId');
CREATE TRIGGER "StaffStudentAssignment_student_tenant" BEFORE INSERT OR UPDATE ON "public"."StaffStudentAssignment" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Student', 'studentId');
CREATE TRIGGER "AttendanceRecord_student_tenant" BEFORE INSERT OR UPDATE ON "public"."AttendanceRecord" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Student', 'studentId');
CREATE TRIGGER "AttendanceRecord_enrollment_tenant" BEFORE INSERT OR UPDATE ON "public"."AttendanceRecord" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Enrollment', 'enrollmentId');
CREATE TRIGGER "AttendanceRecord_class_tenant" BEFORE INSERT OR UPDATE ON "public"."AttendanceRecord" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'SchoolClass', 'classId');
CREATE TRIGGER "LearningJourney_year_tenant" BEFORE INSERT OR UPDATE ON "public"."LearningJourney" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'AcademicYear', 'academicYearId');
CREATE TRIGGER "LearningJourney_semester_tenant" BEFORE INSERT OR UPDATE ON "public"."LearningJourney" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Semester', 'semesterId');
CREATE TRIGGER "LearningJourney_unit_tenant" BEFORE INSERT OR UPDATE ON "public"."LearningJourney" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Unit', 'unitId');
CREATE TRIGGER "LearningJourney_grade_tenant" BEFORE INSERT OR UPDATE ON "public"."LearningJourney" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Grade', 'gradeId');
CREATE TRIGGER "LearningJourney_subject_tenant" BEFORE INSERT OR UPDATE ON "public"."LearningJourney" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Subject', 'subjectId');
CREATE TRIGGER "ObservationAssignment_student_tenant" BEFORE INSERT OR UPDATE ON "public"."ObservationAssignment" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Student', 'studentId');
CREATE TRIGGER "ObservationAssignment_definition_tenant" BEFORE INSERT OR UPDATE ON "public"."ObservationAssignment" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'ObservationDefinition', 'definitionId');
CREATE TRIGGER "ObservationAssignment_assignee_tenant" BEFORE INSERT OR UPDATE ON "public"."ObservationAssignment" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Membership', 'assignedToId');
CREATE TRIGGER "FEDCObservation_assignment_tenant" BEFORE INSERT OR UPDATE ON "public"."FEDCObservation" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'ObservationAssignment', 'assignmentId');
CREATE TRIGGER "FEDCObservation_student_tenant" BEFORE INSERT OR UPDATE ON "public"."FEDCObservation" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Student', 'studentId');
CREATE TRIGGER "FEDCObservation_definition_tenant" BEFORE INSERT OR UPDATE ON "public"."FEDCObservation" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'ObservationDefinition', 'definitionId');
CREATE TRIGGER "SensoryObservation_assignment_tenant" BEFORE INSERT OR UPDATE ON "public"."SensoryProfileObservation" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'ObservationAssignment', 'assignmentId');
CREATE TRIGGER "SensoryObservation_student_tenant" BEFORE INSERT OR UPDATE ON "public"."SensoryProfileObservation" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Student', 'studentId');
CREATE TRIGGER "SensoryObservation_definition_tenant" BEFORE INSERT OR UPDATE ON "public"."SensoryProfileObservation" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'ObservationDefinition', 'definitionId');
CREATE TRIGGER "SFAObservation_assignment_tenant" BEFORE INSERT OR UPDATE ON "public"."SFAObservation" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'ObservationAssignment', 'assignmentId');
CREATE TRIGGER "SFAObservation_student_tenant" BEFORE INSERT OR UPDATE ON "public"."SFAObservation" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Student', 'studentId');
CREATE TRIGGER "SFAObservation_definition_tenant" BEFORE INSERT OR UPDATE ON "public"."SFAObservation" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'ObservationDefinition', 'definitionId');
CREATE TRIGGER "IEP_student_tenant" BEFORE INSERT OR UPDATE ON "public"."IEP" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Student', 'studentId');
CREATE TRIGGER "IEP_year_tenant" BEFORE INSERT OR UPDATE ON "public"."IEP" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'AcademicYear', 'academicYearId');
CREATE TRIGGER "IEP_semester_tenant" BEFORE INSERT OR UPDATE ON "public"."IEP" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Semester', 'semesterId');
CREATE TRIGGER "WeeklyReport_student_tenant" BEFORE INSERT OR UPDATE ON "public"."WeeklyReport" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'Student', 'studentId');
CREATE TRIGGER "WeeklyReport_iep_tenant" BEFORE INSERT OR UPDATE ON "public"."WeeklyReport" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'IEP', 'iepId');
CREATE TRIGGER "GoalAchievementEvent_goal_tenant" BEFORE INSERT OR UPDATE ON "public"."GoalAchievementEvent" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_fk"('organizationId', 'IEP', 'iepId');

CREATE FUNCTION "public"."validate_scope_tenant"() RETURNS trigger AS $$
DECLARE membership_organization UUID;
DECLARE scope_organization UUID;
BEGIN
  SELECT "organizationId" INTO membership_organization FROM "public"."Membership" WHERE "id" = NEW."membershipId";
  EXECUTE format('SELECT "organizationId" FROM "public".%I WHERE "id" = $1', TG_ARGV[0])
    INTO scope_organization USING (to_jsonb(NEW) ->> TG_ARGV[1])::UUID;
  IF scope_organization IS DISTINCT FROM membership_organization THEN
    RAISE EXCEPTION '% tenant mismatch', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "MembershipUnit_tenant" BEFORE INSERT OR UPDATE ON "public"."MembershipUnit" FOR EACH ROW EXECUTE FUNCTION "public"."validate_scope_tenant"('Unit', 'unitId');
CREATE TRIGGER "MembershipGrade_tenant" BEFORE INSERT OR UPDATE ON "public"."MembershipGrade" FOR EACH ROW EXECUTE FUNCTION "public"."validate_scope_tenant"('Grade', 'gradeId');
CREATE TRIGGER "MembershipSubject_tenant" BEFORE INSERT OR UPDATE ON "public"."MembershipSubject" FOR EACH ROW EXECUTE FUNCTION "public"."validate_scope_tenant"('Subject', 'subjectId');

CREATE FUNCTION "public"."validate_attendance_context"() RETURNS trigger AS $$
DECLARE enrollment_student UUID;
DECLARE enrollment_class UUID;
BEGIN
  SELECT "studentId", "classId" INTO enrollment_student, enrollment_class FROM "public"."Enrollment" WHERE "id" = NEW."enrollmentId";
  IF enrollment_student IS DISTINCT FROM NEW."studentId" OR enrollment_class IS DISTINCT FROM NEW."classId" THEN
    RAISE EXCEPTION 'attendance enrollment must match student and class';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "AttendanceRecord_context" BEFORE INSERT OR UPDATE ON "public"."AttendanceRecord" FOR EACH ROW EXECUTE FUNCTION "public"."validate_attendance_context"();

CREATE FUNCTION "public"."validate_observation_context"() RETURNS trigger AS $$
DECLARE assignment_student UUID;
DECLARE assignment_definition UUID;
BEGIN
  SELECT "studentId", "definitionId" INTO assignment_student, assignment_definition FROM "public"."ObservationAssignment" WHERE "id" = NEW."assignmentId";
  IF assignment_student IS DISTINCT FROM NEW."studentId" OR assignment_definition IS DISTINCT FROM NEW."definitionId" THEN
    RAISE EXCEPTION 'observation assignment must match student and definition';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "FEDCObservation_context" BEFORE INSERT OR UPDATE ON "public"."FEDCObservation" FOR EACH ROW EXECUTE FUNCTION "public"."validate_observation_context"();
CREATE TRIGGER "SensoryProfileObservation_context" BEFORE INSERT OR UPDATE ON "public"."SensoryProfileObservation" FOR EACH ROW EXECUTE FUNCTION "public"."validate_observation_context"();
CREATE TRIGGER "SFAObservation_context" BEFORE INSERT OR UPDATE ON "public"."SFAObservation" FOR EACH ROW EXECUTE FUNCTION "public"."validate_observation_context"();

CREATE FUNCTION "public"."validate_weekly_report_context"() RETURNS trigger AS $$
DECLARE iep_student UUID;
BEGIN
  SELECT "studentId" INTO iep_student FROM "public"."IEP" WHERE "id" = NEW."iepId";
  IF iep_student IS DISTINCT FROM NEW."studentId" THEN
    RAISE EXCEPTION 'weekly report IEP must belong to the same student';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "WeeklyReport_context" BEFORE INSERT OR UPDATE ON "public"."WeeklyReport" FOR EACH ROW EXECUTE FUNCTION "public"."validate_weekly_report_context"();

CREATE FUNCTION "public"."validate_workflow_event_tenant"() RETURNS trigger AS $$
DECLARE aggregate_organization UUID;
BEGIN
  CASE NEW."aggregateType"
    WHEN 'LEARNING_JOURNEY' THEN SELECT "organizationId" INTO aggregate_organization FROM "public"."LearningJourney" WHERE "id" = NEW."aggregateId";
    WHEN 'IEP' THEN SELECT "organizationId" INTO aggregate_organization FROM "public"."IEP" WHERE "id" = NEW."aggregateId";
    WHEN 'WEEKLY_REPORT' THEN SELECT "organizationId" INTO aggregate_organization FROM "public"."WeeklyReport" WHERE "id" = NEW."aggregateId";
  END CASE;
  IF aggregate_organization IS DISTINCT FROM NEW."organizationId" THEN
    RAISE EXCEPTION 'workflow aggregate tenant mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "WorkflowEvent_tenant" BEFORE INSERT OR UPDATE ON "public"."WorkflowEvent" FOR EACH ROW EXECUTE FUNCTION "public"."validate_workflow_event_tenant"();

-- Tenant-owned actor references require an active user and active membership.
CREATE FUNCTION "public"."validate_active_organization_user"() RETURNS trigger AS $$
DECLARE actor_id UUID;
DECLARE actor_status "public"."AccountStatus";
DECLARE has_active_membership BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE'
     AND (to_jsonb(NEW) ->> TG_ARGV[0]) IS NOT DISTINCT FROM (to_jsonb(OLD) ->> TG_ARGV[0]) THEN
    RETURN NEW;
  END IF;

  actor_id := (to_jsonb(NEW) ->> TG_ARGV[0])::UUID;
  IF actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "status" INTO actor_status FROM "public"."User" WHERE "id" = actor_id;
  SELECT EXISTS (
    SELECT 1 FROM "public"."Membership"
    WHERE "organizationId" = NEW."organizationId"
      AND "userId" = actor_id
      AND "status" = 'ACTIVE'
  ) INTO has_active_membership;

  IF actor_status IS DISTINCT FROM 'ACTIVE' OR has_active_membership IS NOT TRUE THEN
    RAISE EXCEPTION '% must reference an active user with an active membership in organization %', TG_ARGV[0], NEW."organizationId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AttendanceRecord_recorder_membership" BEFORE INSERT OR UPDATE ON "public"."AttendanceRecord" FOR EACH ROW EXECUTE FUNCTION "public"."validate_active_organization_user"('recordedById');
CREATE TRIGGER "LearningJourney_creator_membership" BEFORE INSERT OR UPDATE ON "public"."LearningJourney" FOR EACH ROW EXECUTE FUNCTION "public"."validate_active_organization_user"('createdById');
CREATE TRIGGER "LearningJourney_updater_membership" BEFORE INSERT OR UPDATE ON "public"."LearningJourney" FOR EACH ROW EXECUTE FUNCTION "public"."validate_active_organization_user"('updatedById');
CREATE TRIGGER "ObservationAssignment_assigner_membership" BEFORE INSERT OR UPDATE ON "public"."ObservationAssignment" FOR EACH ROW EXECUTE FUNCTION "public"."validate_active_organization_user"('assignedById');
CREATE TRIGGER "FEDCObservation_observer_membership" BEFORE INSERT OR UPDATE ON "public"."FEDCObservation" FOR EACH ROW EXECUTE FUNCTION "public"."validate_active_organization_user"('observerId');
CREATE TRIGGER "SensoryProfileObservation_observer_membership" BEFORE INSERT OR UPDATE ON "public"."SensoryProfileObservation" FOR EACH ROW EXECUTE FUNCTION "public"."validate_active_organization_user"('observerId');
CREATE TRIGGER "SFAObservation_observer_membership" BEFORE INSERT OR UPDATE ON "public"."SFAObservation" FOR EACH ROW EXECUTE FUNCTION "public"."validate_active_organization_user"('observerId');
CREATE TRIGGER "IEP_creator_membership" BEFORE INSERT OR UPDATE ON "public"."IEP" FOR EACH ROW EXECUTE FUNCTION "public"."validate_active_organization_user"('createdById');
CREATE TRIGGER "IEP_updater_membership" BEFORE INSERT OR UPDATE ON "public"."IEP" FOR EACH ROW EXECUTE FUNCTION "public"."validate_active_organization_user"('updatedById');
CREATE TRIGGER "WeeklyReport_teacher_membership" BEFORE INSERT OR UPDATE ON "public"."WeeklyReport" FOR EACH ROW EXECUTE FUNCTION "public"."validate_active_organization_user"('teacherId');
CREATE TRIGGER "WorkflowEvent_actor_membership" BEFORE INSERT OR UPDATE ON "public"."WorkflowEvent" FOR EACH ROW EXECUTE FUNCTION "public"."validate_active_organization_user"('actorId');
CREATE TRIGGER "GoalAchievementEvent_actor_membership" BEFORE INSERT OR UPDATE ON "public"."GoalAchievementEvent" FOR EACH ROW EXECUTE FUNCTION "public"."validate_active_organization_user"('actorId');
CREATE TRIGGER "AuditEvent_actor_membership" BEFORE INSERT OR UPDATE ON "public"."AuditEvent" FOR EACH ROW EXECUTE FUNCTION "public"."validate_active_organization_user"('actorId');

-- Active-membership ownership checks.
CREATE FUNCTION "public"."validate_membership_reference"() RETURNS trigger AS $$
DECLARE membership_organization UUID;
DECLARE membership_status "public"."AccountStatus";
DECLARE user_status "public"."AccountStatus";
BEGIN
  SELECT m."organizationId", m."status", u."status"
  INTO membership_organization, membership_status, user_status
  FROM "public"."Membership" m
  JOIN "public"."User" u ON u."id" = m."userId"
  WHERE m."id" = NEW."membershipId";

  IF membership_organization IS DISTINCT FROM NEW."organizationId"
     OR membership_status IS DISTINCT FROM 'ACTIVE'
     OR user_status IS DISTINCT FROM 'ACTIVE' THEN
    RAISE EXCEPTION 'membership must be active and belong to the target organization';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "StaffStudentAssignment_membership_scope"
BEFORE INSERT OR UPDATE ON "public"."StaffStudentAssignment"
FOR EACH ROW EXECUTE FUNCTION "public"."validate_membership_reference"();

CREATE FUNCTION "public"."validate_observation_assignee"() RETURNS trigger AS $$
DECLARE membership_organization UUID;
DECLARE membership_status "public"."AccountStatus";
DECLARE user_status "public"."AccountStatus";
BEGIN
  SELECT m."organizationId", m."status", u."status"
  INTO membership_organization, membership_status, user_status
  FROM "public"."Membership" m
  JOIN "public"."User" u ON u."id" = m."userId"
  WHERE m."id" = NEW."assignedToId";

  IF membership_organization IS DISTINCT FROM NEW."organizationId"
     OR membership_status IS DISTINCT FROM 'ACTIVE'
     OR user_status IS DISTINCT FROM 'ACTIVE' THEN
    RAISE EXCEPTION 'observation assignee must have an active membership in the target organization';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ObservationAssignment_assignee_scope"
BEFORE INSERT OR UPDATE ON "public"."ObservationAssignment"
FOR EACH ROW EXECUTE FUNCTION "public"."validate_observation_assignee"();

CREATE FUNCTION "public"."validate_journey_owner"() RETURNS trigger AS $$
DECLARE journey_organization UUID;
DECLARE membership_organization UUID;
DECLARE membership_status "public"."AccountStatus";
DECLARE user_status "public"."AccountStatus";
BEGIN
  SELECT "organizationId" INTO journey_organization FROM "public"."LearningJourney" WHERE "id" = NEW."learningJourneyId";
  SELECT m."organizationId", m."status", u."status"
  INTO membership_organization, membership_status, user_status
  FROM "public"."Membership" m
  JOIN "public"."User" u ON u."id" = m."userId"
  WHERE m."id" = NEW."membershipId";

  IF journey_organization IS DISTINCT FROM membership_organization
     OR membership_status IS DISTINCT FROM 'ACTIVE'
     OR user_status IS DISTINCT FROM 'ACTIVE' THEN
    RAISE EXCEPTION 'journey owner must have an active membership in the journey organization';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "LearningJourneyOwner_membership_scope"
BEFORE INSERT OR UPDATE ON "public"."LearningJourneyOwner"
FOR EACH ROW EXECUTE FUNCTION "public"."validate_journey_owner"();

-- Security and workflow histories are immutable after insertion.
CREATE FUNCTION "public"."reject_event_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditEvent_append_only"
BEFORE UPDATE OR DELETE ON "public"."AuditEvent"
FOR EACH ROW EXECUTE FUNCTION "public"."reject_event_mutation"();

CREATE TRIGGER "WorkflowEvent_append_only"
BEFORE UPDATE OR DELETE ON "public"."WorkflowEvent"
FOR EACH ROW EXECUTE FUNCTION "public"."reject_event_mutation"();

CREATE TRIGGER "GoalAchievementEvent_append_only"
BEFORE UPDATE OR DELETE ON "public"."GoalAchievementEvent"
FOR EACH ROW EXECUTE FUNCTION "public"."reject_event_mutation"();

-- Completed observations and definitions already used by records are immutable.
CREATE FUNCTION "public"."protect_completed_observation"() RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'COMPLETED' THEN
    RAISE EXCEPTION '% completed observation is immutable', TG_TABLE_NAME;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "FEDCObservation_completed_immutable"
BEFORE UPDATE OR DELETE ON "public"."FEDCObservation"
FOR EACH ROW EXECUTE FUNCTION "public"."protect_completed_observation"();
CREATE TRIGGER "SensoryProfileObservation_completed_immutable"
BEFORE UPDATE OR DELETE ON "public"."SensoryProfileObservation"
FOR EACH ROW EXECUTE FUNCTION "public"."protect_completed_observation"();
CREATE TRIGGER "SFAObservation_completed_immutable"
BEFORE UPDATE OR DELETE ON "public"."SFAObservation"
FOR EACH ROW EXECUTE FUNCTION "public"."protect_completed_observation"();

CREATE FUNCTION "public"."protect_used_observation_definition"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "public"."ObservationAssignment" WHERE "definitionId" = OLD."id")
     OR EXISTS (SELECT 1 FROM "public"."FEDCObservation" WHERE "definitionId" = OLD."id")
     OR EXISTS (SELECT 1 FROM "public"."SensoryProfileObservation" WHERE "definitionId" = OLD."id")
     OR EXISTS (SELECT 1 FROM "public"."SFAObservation" WHERE "definitionId" = OLD."id") THEN
    RAISE EXCEPTION 'used observation definition is immutable';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ObservationDefinition_used_immutable"
BEFORE UPDATE OR DELETE ON "public"."ObservationDefinition"
FOR EACH ROW EXECUTE FUNCTION "public"."protect_used_observation_definition"();
