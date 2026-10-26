import { Prisma, type PrismaClient } from '@prisma/client';
import {
  membershipHasPermission,
  type MembershipScope,
} from '../utils/authorization.js';
import { HttpError } from '../middleware/http-errors.js';
import {
  isLeadership,
  requireAcademicCollectionAccess,
  scopedClassWhere,
} from '../utils/resource-access.js';
import { isoDate } from '../utils/resource-date.js';

export function createAcademicsService(prisma: PrismaClient) {
  return {
    async listAcademicYears(
      organizationId: string,
      membership: MembershipScope,
    ) {
      requireAcademicCollectionAccess(membership, 'academicYears');
      const rows = await prisma.academicYear.findMany({
        where: { organizationId },
        omit: { centralId: true },
        orderBy: [{ startsOn: 'desc' }, { id: 'asc' }],
      });
      return rows.map((row) => ({
        ...row,
        startsOn: isoDate(row.startsOn),
        endsOn: isoDate(row.endsOn),
      }));
    },

    async listSemesters(organizationId: string, membership: MembershipScope) {
      requireAcademicCollectionAccess(membership, 'semesters');
      const rows = await prisma.semester.findMany({
        where: { organizationId },
        orderBy: [
          { academicYear: { startsOn: 'desc' } },
          { position: 'asc' },
          { id: 'asc' },
        ],
      });
      return rows.map((row) => ({
        ...row,
        startsOn: isoDate(row.startsOn),
        endsOn: isoDate(row.endsOn),
      }));
    },

    async listUnits(organizationId: string, membership: MembershipScope) {
      requireAcademicCollectionAccess(membership, 'units');
      const where: Prisma.UnitWhereInput = { organizationId };
      if (
        !isLeadership(membership) &&
        !membershipHasPermission(membership, 'scope.subject')
      ) {
        const unitIds = new Set(membership.unitIds);
        if (membership.gradeIds.length) {
          const gradeUnits = await prisma.grade.findMany({
            where: { organizationId, id: { in: membership.gradeIds } },
            select: { unitId: true },
          });
          gradeUnits.forEach((grade) => unitIds.add(grade.unitId));
        }
        if (!unitIds.size) {
          throw new HttpError(
            403,
            'AUTHORIZATION_DENIED',
            'The request was denied.',
          );
        }
        where.id = { in: [...unitIds] };
      }
      return prisma.unit.findMany({
        where,
        omit: { centralId: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      });
    },

    async listGrades(organizationId: string, membership: MembershipScope) {
      requireAcademicCollectionAccess(membership, 'grades');
      const where: Prisma.GradeWhereInput = { organizationId };
      if (
        !isLeadership(membership) &&
        !membershipHasPermission(membership, 'scope.subject')
      ) {
        const scopes: Prisma.GradeWhereInput[] = [];
        if (membership.gradeIds.length) {
          scopes.push({ id: { in: membership.gradeIds } });
        }
        if (membership.unitIds.length) {
          scopes.push({ unitId: { in: membership.unitIds } });
        }
        if (!scopes.length) {
          throw new HttpError(
            403,
            'AUTHORIZATION_DENIED',
            'The request was denied.',
          );
        }
        where.OR = scopes;
      }
      return prisma.grade.findMany({
        where,
        omit: { centralId: true },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
      });
    },

    async listClasses(organizationId: string, membership: MembershipScope) {
      requireAcademicCollectionAccess(membership, 'classes');
      const classScope = scopedClassWhere(membership);
      if (!classScope) {
        throw new HttpError(
          403,
          'AUTHORIZATION_DENIED',
          'The request was denied.',
        );
      }
      return prisma.schoolClass.findMany({
        where: { organizationId, ...classScope },
        omit: { centralId: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      });
    },

    async listSubjects(organizationId: string, membership: MembershipScope) {
      requireAcademicCollectionAccess(membership, 'subjects');
      const where: Prisma.SubjectWhereInput = { organizationId };
      if (
        !isLeadership(membership) &&
        membershipHasPermission(membership, 'scope.subject')
      ) {
        if (!membership.subjectIds.length) {
          throw new HttpError(
            403,
            'AUTHORIZATION_DENIED',
            'The request was denied.',
          );
        }
        where.id = { in: membership.subjectIds };
      }
      return prisma.subject.findMany({
        where,
        omit: { centralKey: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      });
    },
  };
}

export type AcademicsService = ReturnType<typeof createAcademicsService>;
