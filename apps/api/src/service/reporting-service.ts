import { Prisma, type PrismaClient } from '@prisma/client';
import type { MembershipScope } from '../utils/authorization.js';
import { organizationSchoolDate } from '../utils/organization-time.js';
import {
  aggregateAttendanceSummary,
  canReportObservationAggregates,
  journeySummary,
  aggregateDatedObservationScope,
  observationAssignmentWhere,
  specialEducationSummary,
  studentSummary,
} from '../utils/aggregates.queries.js';
import { mapObservationAggregate } from '../model/reporting-model.js';

export function createReportingQueryService(prisma: PrismaClient) {
  return {
    async get(
      organizationId: string,
      membership: MembershipScope,
      userId: string,
    ) {
      const { schoolDate } = await organizationSchoolDate(
        prisma,
        organizationId,
      );
      const canReportObservations = canReportObservationAggregates(membership);
      const [
        students,
        attendance,
        journeys,
        specialEducation,
        observationData,
      ] = await Promise.all([
        studentSummary(prisma, organizationId, membership, schoolDate),
        aggregateAttendanceSummary(
          prisma,
          organizationId,
          membership,
          schoolDate,
        ),
        journeySummary(prisma, organizationId, membership),
        specialEducationSummary(prisma, organizationId, membership, schoolDate),
        canReportObservations
          ? Promise.all([
              observationAssignmentWhere(membership, organizationId, userId)
                ? prisma.observationAssignment.groupBy({
                    by: ['status'],
                    where: observationAssignmentWhere(
                      membership,
                      organizationId,
                      userId,
                    ),
                    _count: { _all: true },
                  })
                : Promise.resolve([]),
              prisma.fEDCObservation.count({
                where: {
                  organizationId,
                  status: 'COMPLETED',
                  ...aggregateDatedObservationScope(
                    membership,
                    userId,
                    'observationDate',
                  ),
                } as Prisma.FEDCObservationWhereInput,
              }),
              prisma.sensoryProfileObservation.count({
                where: {
                  organizationId,
                  status: 'COMPLETED',
                  ...aggregateDatedObservationScope(
                    membership,
                    userId,
                    'observationDate',
                  ),
                } as Prisma.SensoryProfileObservationWhereInput,
              }),
              prisma.sFAObservation.count({
                where: {
                  organizationId,
                  status: 'COMPLETED',
                  ...aggregateDatedObservationScope(
                    membership,
                    userId,
                    'assessmentDate',
                  ),
                } as Prisma.SFAObservationWhereInput,
              }),
            ])
          : Promise.resolve(undefined),
      ]);
      return {
        generatedAt: new Date().toISOString(),
        students,
        attendance,
        journeys,
        specialEducation,
        observations: observationData
          ? mapObservationAggregate(observationData)
          : undefined,
      };
    },
  };
}

export type ReportingQueryService = ReturnType<
  typeof createReportingQueryService
>;
