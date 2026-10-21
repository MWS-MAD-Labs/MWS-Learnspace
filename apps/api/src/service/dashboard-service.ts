import type { PrismaClient } from '@prisma/client';
import type { MembershipScope } from '../utils/authorization.js';
import { organizationSchoolDate } from '../utils/organization-time.js';
import {
  aggregateAttendanceSummary,
  journeySummary,
  recentJourneys,
  specialEducationSummary,
  studentSummary,
} from '../utils/aggregates.queries.js';

export function createDashboardQueryService(prisma: PrismaClient) {
  return {
    async get(organizationId: string, membership: MembershipScope) {
      const { schoolDate } = await organizationSchoolDate(
        prisma,
        organizationId,
      );
      const [students, attendance, journeys, specialEducation, recent] =
        await Promise.all([
          studentSummary(prisma, organizationId, membership, schoolDate),
          aggregateAttendanceSummary(
            prisma,
            organizationId,
            membership,
            schoolDate,
          ),
          journeySummary(prisma, organizationId, membership),
          specialEducationSummary(
            prisma,
            organizationId,
            membership,
            schoolDate,
          ),
          recentJourneys(prisma, organizationId, membership),
        ]);
      return {
        generatedAt: new Date().toISOString(),
        role: membership.role,
        students,
        attendance,
        journeys,
        specialEducation,
        recentJourneys: recent,
      };
    },
  };
}

export type DashboardQueryService = ReturnType<
  typeof createDashboardQueryService
>;
