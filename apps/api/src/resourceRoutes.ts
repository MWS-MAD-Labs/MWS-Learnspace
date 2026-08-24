import type {
  AttendanceStatus,
  MembershipRole,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import type { Request, Router } from 'express';
import { Router as createRouter } from 'express';
import {
  academicYearsResponseSchema,
  attendanceBulkSaveCommandSchema,
  attendanceBulkSaveResponseSchema,
  attendanceQuerySchema,
  attendanceRosterResponseSchema,
  classesResponseSchema,
  gradesResponseSchema,
  organizationsResponseSchema,
  studentDetailResponseSchema,
  studentListQuerySchema,
  studentsResponseSchema,
  subjectsResponseSchema,
  unitsResponseSchema,
} from '@learnspace/contracts';
import { createAuditRepository } from './audit.js';
import {
  AuthorizationDeniedError,
  requireOrganizationScope,
  requirePermission,
  type MembershipScope,
} from './authorization.js';
import {
  createCsrfProtection,
  createRequiredAuthentication,
  type AuthenticatedRequest,
} from './authRoutes.js';
import { HttpError, parseRequest } from './httpErrors.js';
import type { SessionService } from './sessionService.js';

const leadershipRoles: readonly MembershipRole[] = ['DIRECTOR', 'PRINCIPAL'];
const assignedStudentRoles: readonly MembershipRole[] = [
  'SPECIAL_ED_COORDINATOR',
  'SPECIAL_ED_TEACHER',
  'SPECIALIST',
];
const serializableConflictCodes = new Set(['P2034']);

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dateAtUtcMidnight(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function isLeadership(membership: MembershipScope): boolean {
  return leadershipRoles.includes(membership.role);
}

function scopedClassWhere(
  membership: MembershipScope,
): Prisma.SchoolClassWhereInput | undefined {
  if (isLeadership(membership)) return {};
  if (membership.role === 'GRADE_TEACHER') {
    const scopes: Prisma.SchoolClassWhereInput[] = [];
    if (membership.unitIds.length)
      scopes.push({ unitId: { in: membership.unitIds } });
    if (membership.gradeIds.length)
      scopes.push({ gradeId: { in: membership.gradeIds } });
    return scopes.length ? { OR: scopes } : undefined;
  }
  return undefined;
}

function activeEnrollmentWhere(schoolDate: Date): Prisma.EnrollmentWhereInput {
  return {
    startsOn: { lte: schoolDate },
    OR: [{ endsOn: null }, { endsOn: { gte: schoolDate } }],
  };
}

function attendanceVersion(records: readonly { updatedAt: Date }[]): string {
  const latest = records.reduce(
    (maximum, record) => Math.max(maximum, record.updatedAt.getTime()),
    0,
  );
  return `${records.length}:${latest ? new Date(latest).toISOString() : 'none'}`;
}

function asPrismaErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}

function requireAuth(
  request: Request,
): NonNullable<AuthenticatedRequest['auth']> {
  const auth = (request as AuthenticatedRequest).auth;
  if (!auth)
    throw new HttpError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication is required.',
    );
  return auth;
}

function membershipFor(
  request: Request,
  organizationId: string,
): MembershipScope {
  try {
    return requireOrganizationScope(
      requireAuth(request).memberships,
      organizationId,
    );
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) {
      throw new HttpError(
        403,
        'AUTHORIZATION_DENIED',
        'The request was denied.',
      );
    }
    throw error;
  }
}

function requireAttendancePermission(
  membership: MembershipScope,
  permission: 'attendance:read' | 'attendance:write',
) {
  try {
    requirePermission(membership, permission);
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) {
      throw new HttpError(
        403,
        'AUTHORIZATION_DENIED',
        'The request was denied.',
      );
    }
    throw error;
  }
}

function requireAcademicCollectionAccess(
  membership: MembershipScope,
  resource: 'academicYears' | 'units' | 'grades' | 'classes' | 'subjects',
) {
  if (isLeadership(membership)) return;
  if (membership.role === 'GRADE_TEACHER' && resource !== 'subjects') return;
  if (
    membership.role === 'SUBJECT_TEACHER' &&
    (resource === 'academicYears' || resource === 'subjects')
  )
    return;
  throw new HttpError(403, 'AUTHORIZATION_DENIED', 'The request was denied.');
}

function studentScopeWhere(
  membership: MembershipScope,
  schoolDate: Date,
  enrollmentFilter: Prisma.EnrollmentWhereInput = {},
): Prisma.StudentWhereInput | undefined {
  if (isLeadership(membership)) return {};
  if (membership.role === 'GRADE_TEACHER') {
    const classScope = scopedClassWhere(membership);
    if (!classScope) return undefined;
    return {
      enrollments: {
        some: {
          ...activeEnrollmentWhere(schoolDate),
          ...enrollmentFilter,
          schoolClass: {
            ...classScope,
            ...((enrollmentFilter.schoolClass as
              Prisma.SchoolClassWhereInput | undefined) ?? {}),
          },
        },
      },
    };
  }
  if (assignedStudentRoles.includes(membership.role)) {
    const activeStudentIds = membership.assignedStudentScopes
      ? membership.assignedStudentScopes
          .filter(
            (scope) =>
              scope.startsOn <= schoolDate &&
              (scope.endsOn === null || scope.endsOn >= schoolDate),
          )
          .map((scope) => scope.studentId)
      : membership.assignedStudentIds;
    return activeStudentIds.length
      ? { id: { in: activeStudentIds } }
      : undefined;
  }
  return undefined;
}

function enrollmentSelect(
  schoolDate: Date,
  enrollmentFilter: Prisma.EnrollmentWhereInput = {},
) {
  return {
    where: { ...activeEnrollmentWhere(schoolDate), ...enrollmentFilter },
    orderBy: [{ startsOn: 'desc' as const }, { id: 'asc' as const }],
    select: {
      id: true,
      academicYearId: true,
      classId: true,
      startsOn: true,
      endsOn: true,
      schoolClass: { select: { name: true, unitId: true, gradeId: true } },
    },
  };
}

function mapStudent(student: {
  id: string;
  organizationId: string;
  studentNumber: string;
  fullName: string;
  nickname: string | null;
  avatarUrl: string | null;
  enrollments: Array<{
    id: string;
    academicYearId: string;
    classId: string;
    startsOn: Date;
    endsOn: Date | null;
    schoolClass: { name: string; unitId: string; gradeId: string };
  }>;
}) {
  return {
    id: student.id,
    organizationId: student.organizationId,
    studentNumber: student.studentNumber,
    fullName: student.fullName,
    nickname: student.nickname,
    avatarUrl: student.avatarUrl,
    enrollments: student.enrollments.map((enrollment) => ({
      id: enrollment.id,
      academicYearId: enrollment.academicYearId,
      classId: enrollment.classId,
      className: enrollment.schoolClass.name,
      unitId: enrollment.schoolClass.unitId,
      gradeId: enrollment.schoolClass.gradeId,
      startsOn: isoDate(enrollment.startsOn),
      endsOn: enrollment.endsOn ? isoDate(enrollment.endsOn) : null,
    })),
  };
}

export function createResourceRouter(
  prisma: PrismaClient,
  sessions: SessionService,
): Router {
  const router = createRouter();
  router.use(createRequiredAuthentication(sessions));

  router.get('/organizations', async (request, response, next) => {
    try {
      const organizationIds = requireAuth(request).memberships.map(
        (membership) => membership.organizationId,
      );
      const data = await prisma.organization.findMany({
        where: { id: { in: organizationIds }, status: 'ACTIVE' },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: { id: true, slug: true, name: true },
      });
      response.json(
        organizationsResponseSchema.parse({
          data,
          meta: { count: data.length },
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.get(
    '/organizations/:organizationId/academic-years',
    async (request, response, next) => {
      try {
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireAcademicCollectionAccess(membership, 'academicYears');
        const rows = await prisma.academicYear.findMany({
          where: { organizationId: request.params.organizationId },
          orderBy: [{ startsOn: 'desc' }, { id: 'asc' }],
        });
        const data = rows.map((row) => ({
          ...row,
          startsOn: isoDate(row.startsOn),
          endsOn: isoDate(row.endsOn),
        }));
        response.json(
          academicYearsResponseSchema.parse({
            data,
            meta: { count: data.length },
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/units',
    async (request, response, next) => {
      try {
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireAcademicCollectionAccess(membership, 'units');
        const where: Prisma.UnitWhereInput = {
          organizationId: request.params.organizationId,
        };
        if (!isLeadership(membership)) {
          const unitIds = new Set(membership.unitIds);
          if (membership.gradeIds.length) {
            const gradeUnits = await prisma.grade.findMany({
              where: {
                organizationId: request.params.organizationId,
                id: { in: membership.gradeIds },
              },
              select: { unitId: true },
            });
            gradeUnits.forEach((grade) => unitIds.add(grade.unitId));
          }
          if (!unitIds.size)
            throw new HttpError(
              403,
              'AUTHORIZATION_DENIED',
              'The request was denied.',
            );
          where.id = { in: [...unitIds] };
        }
        const data = await prisma.unit.findMany({
          where,
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
        });
        response.json(
          unitsResponseSchema.parse({ data, meta: { count: data.length } }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/grades',
    async (request, response, next) => {
      try {
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireAcademicCollectionAccess(membership, 'grades');
        const where: Prisma.GradeWhereInput = {
          organizationId: request.params.organizationId,
        };
        if (!isLeadership(membership)) {
          const scopes: Prisma.GradeWhereInput[] = [];
          if (membership.gradeIds.length)
            scopes.push({ id: { in: membership.gradeIds } });
          if (membership.unitIds.length)
            scopes.push({ unitId: { in: membership.unitIds } });
          if (!scopes.length)
            throw new HttpError(
              403,
              'AUTHORIZATION_DENIED',
              'The request was denied.',
            );
          where.OR = scopes;
        }
        const data = await prisma.grade.findMany({
          where,
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
        });
        response.json(
          gradesResponseSchema.parse({ data, meta: { count: data.length } }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/classes',
    async (request, response, next) => {
      try {
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireAcademicCollectionAccess(membership, 'classes');
        const classScope = scopedClassWhere(membership);
        if (!classScope)
          throw new HttpError(
            403,
            'AUTHORIZATION_DENIED',
            'The request was denied.',
          );
        const data = await prisma.schoolClass.findMany({
          where: {
            organizationId: request.params.organizationId,
            ...classScope,
          },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
        });
        response.json(
          classesResponseSchema.parse({ data, meta: { count: data.length } }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/subjects',
    async (request, response, next) => {
      try {
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireAcademicCollectionAccess(membership, 'subjects');
        const where: Prisma.SubjectWhereInput = {
          organizationId: request.params.organizationId,
        };
        if (!isLeadership(membership)) {
          if (!membership.subjectIds.length)
            throw new HttpError(
              403,
              'AUTHORIZATION_DENIED',
              'The request was denied.',
            );
          where.id = { in: membership.subjectIds };
        }
        const data = await prisma.subject.findMany({
          where,
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
        });
        response.json(
          subjectsResponseSchema.parse({ data, meta: { count: data.length } }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/students',
    async (request, response, next) => {
      try {
        const query = parseRequest(studentListQuerySchema, request.query);
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        const schoolDate = dateAtUtcMidnight(
          query.schoolDate ?? new Date().toISOString().slice(0, 10),
        );
        const enrollmentFilter: Prisma.EnrollmentWhereInput = {
          ...activeEnrollmentWhere(schoolDate),
          ...(query.classId ? { classId: query.classId } : {}),
          ...(query.unitId || query.gradeId
            ? {
                schoolClass: {
                  ...(query.unitId ? { unitId: query.unitId } : {}),
                  ...(query.gradeId ? { gradeId: query.gradeId } : {}),
                },
              }
            : {}),
        };
        const scope = studentScopeWhere(
          membership,
          schoolDate,
          enrollmentFilter,
        );
        if (!scope)
          throw new HttpError(
            403,
            'AUTHORIZATION_DENIED',
            'The request was denied.',
          );
        const authorizedClassScope =
          membership.role === 'GRADE_TEACHER'
            ? (scopedClassWhere(membership) ?? {})
            : {};
        const selectedEnrollmentFilter: Prisma.EnrollmentWhereInput = {
          ...(query.classId ? { classId: query.classId } : {}),
          ...(Object.keys(authorizedClassScope).length ||
          query.unitId ||
          query.gradeId
            ? {
                schoolClass: {
                  ...authorizedClassScope,
                  ...(query.unitId ? { unitId: query.unitId } : {}),
                  ...(query.gradeId ? { gradeId: query.gradeId } : {}),
                },
              }
            : {}),
        };
        const rows = await prisma.student.findMany({
          where: {
            organizationId: request.params.organizationId,
            status: 'ACTIVE',
            ...scope,
            ...(membership.role === 'GRADE_TEACHER' ||
            !(query.classId || query.unitId || query.gradeId)
              ? {}
              : { enrollments: { some: enrollmentFilter } }),
          },
          orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            organizationId: true,
            studentNumber: true,
            fullName: true,
            nickname: true,
            avatarUrl: true,
            enrollments: enrollmentSelect(schoolDate, selectedEnrollmentFilter),
          },
        });
        const data = rows.map(mapStudent);
        response.json(
          studentsResponseSchema.parse({ data, meta: { count: data.length } }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/students/:studentId',
    async (request, response, next) => {
      try {
        const query = parseRequest(
          studentListQuerySchema.pick({ schoolDate: true }),
          request.query,
        );
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        const schoolDate = dateAtUtcMidnight(
          query.schoolDate ?? new Date().toISOString().slice(0, 10),
        );
        const scope = studentScopeWhere(membership, schoolDate);
        if (!scope)
          throw new HttpError(
            403,
            'AUTHORIZATION_DENIED',
            'The request was denied.',
          );
        const authorizedClassScope =
          membership.role === 'GRADE_TEACHER'
            ? (scopedClassWhere(membership) ?? {})
            : {};
        const row = await prisma.student.findFirst({
          where: {
            id: request.params.studentId,
            organizationId: request.params.organizationId,
            status: 'ACTIVE',
            ...scope,
          },
          select: {
            id: true,
            organizationId: true,
            studentNumber: true,
            fullName: true,
            nickname: true,
            avatarUrl: true,
            enrollments: enrollmentSelect(
              schoolDate,
              Object.keys(authorizedClassScope).length
                ? { schoolClass: authorizedClassScope }
                : {},
            ),
          },
        });
        if (!row)
          throw new HttpError(
            403,
            'AUTHORIZATION_DENIED',
            'The request was denied.',
          );
        response.json(
          studentDetailResponseSchema.parse({ data: mapStudent(row) }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/classes/:classId/attendance',
    async (request, response, next) => {
      try {
        const query = parseRequest(attendanceQuerySchema, request.query);
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireAttendancePermission(membership, 'attendance:read');
        const classScope = scopedClassWhere(membership);
        if (!classScope)
          throw new HttpError(
            403,
            'AUTHORIZATION_DENIED',
            'The request was denied.',
          );
        const schoolDate = dateAtUtcMidnight(query.schoolDate);
        const schoolClass = await prisma.schoolClass.findFirst({
          where: {
            id: request.params.classId,
            organizationId: request.params.organizationId,
            ...classScope,
          },
        });
        if (!schoolClass)
          throw new HttpError(
            403,
            'AUTHORIZATION_DENIED',
            'The request was denied.',
          );
        const roster = await prisma.enrollment.findMany({
          where: {
            organizationId: request.params.organizationId,
            classId: request.params.classId,
            ...activeEnrollmentWhere(schoolDate),
            student: { status: 'ACTIVE' },
          },
          orderBy: [{ student: { fullName: 'asc' } }, { id: 'asc' }],
          select: {
            id: true,
            student: {
              select: {
                id: true,
                organizationId: true,
                studentNumber: true,
                fullName: true,
                nickname: true,
                avatarUrl: true,
              },
            },
          },
        });
        const attendance = await prisma.attendanceRecord.findMany({
          where: {
            organizationId: request.params.organizationId,
            classId: request.params.classId,
            schoolDate,
          },
          orderBy: { id: 'asc' },
        });
        const byStudent = new Map(
          attendance.map((record) => [record.studentId, record]),
        );
        response.json(
          attendanceRosterResponseSchema.parse({
            data: {
              organizationId: request.params.organizationId,
              class: schoolClass,
              schoolDate: query.schoolDate,
              version: attendanceVersion(attendance),
              roster: roster.map((enrollment) => {
                const record = byStudent.get(enrollment.student.id);
                return {
                  student: enrollment.student,
                  enrollmentId: enrollment.id,
                  attendance: record
                    ? {
                        id: record.id,
                        status: record.status,
                        minutesLate: record.minutesLate,
                        notes: record.notes,
                        updatedAt: record.updatedAt.toISOString(),
                      }
                    : null,
                };
              }),
            },
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.put(
    '/organizations/:organizationId/classes/:classId/attendance',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const command = parseRequest(
          attendanceBulkSaveCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireAttendancePermission(membership, 'attendance:write');
        const classScope = scopedClassWhere(membership);
        if (!classScope)
          throw new HttpError(
            403,
            'AUTHORIZATION_DENIED',
            'The request was denied.',
          );
        const schoolDate = dateAtUtcMidnight(command.schoolDate);
        const result = await prisma.$transaction(
          async (transaction) => {
            const schoolClass = await transaction.schoolClass.findFirst({
              where: {
                id: request.params.classId,
                organizationId: request.params.organizationId,
                ...classScope,
              },
              select: { id: true },
            });
            if (!schoolClass)
              throw new HttpError(
                403,
                'AUTHORIZATION_DENIED',
                'The request was denied.',
              );
            const existing = await transaction.attendanceRecord.findMany({
              where: {
                organizationId: request.params.organizationId,
                classId: request.params.classId,
                schoolDate,
              },
              select: { updatedAt: true },
            });
            if (attendanceVersion(existing) !== command.expectedVersion) {
              throw new HttpError(
                409,
                'ATTENDANCE_VERSION_CONFLICT',
                'Attendance was changed by another request.',
              );
            }
            const enrollments = await transaction.enrollment.findMany({
              where: {
                organizationId: request.params.organizationId,
                classId: request.params.classId,
                studentId: {
                  in: command.records.map((record) => record.studentId),
                },
                ...activeEnrollmentWhere(schoolDate),
                student: { status: 'ACTIVE' },
              },
              select: { id: true, studentId: true },
            });
            const enrollmentByStudent = new Map(
              enrollments.map((enrollment) => [
                enrollment.studentId,
                enrollment.id,
              ]),
            );
            if (enrollmentByStudent.size !== command.records.length) {
              throw new HttpError(
                400,
                'STUDENT_NOT_IN_CLASS',
                'Every student must be actively enrolled in the class on schoolDate.',
              );
            }
            for (const record of command.records) {
              await transaction.attendanceRecord.upsert({
                where: {
                  organizationId_studentId_classId_schoolDate: {
                    organizationId: request.params.organizationId,
                    studentId: record.studentId,
                    classId: request.params.classId,
                    schoolDate,
                  },
                },
                update: {
                  enrollmentId: enrollmentByStudent.get(record.studentId)!,
                  status: record.status as AttendanceStatus,
                  minutesLate:
                    record.status === 'LATE' ? record.minutesLate : null,
                  notes: record.notes ?? null,
                  recordedById: auth.userId,
                },
                create: {
                  organizationId: request.params.organizationId,
                  studentId: record.studentId,
                  enrollmentId: enrollmentByStudent.get(record.studentId)!,
                  classId: request.params.classId,
                  schoolDate,
                  status: record.status as AttendanceStatus,
                  minutesLate:
                    record.status === 'LATE' ? record.minutesLate : null,
                  notes: record.notes ?? null,
                  recordedById: auth.userId,
                },
              });
            }
            await createAuditRepository(transaction as PrismaClient).append({
              organizationId: request.params.organizationId,
              actorId: auth.userId,
              action: 'attendance.bulk_upsert',
              targetType: 'SchoolClassAttendance',
              targetId: request.params.classId,
              requestId: String(response.locals.requestId),
              result: 'SUCCEEDED',
              metadata: { changedFields: ['status', 'minutesLate', 'notes'] },
            });
            const saved = await transaction.attendanceRecord.findMany({
              where: {
                organizationId: request.params.organizationId,
                classId: request.params.classId,
                schoolDate,
              },
              select: { updatedAt: true },
            });
            return {
              schoolDate: command.schoolDate,
              version: attendanceVersion(saved),
              savedCount: command.records.length,
            };
          },
          { isolationLevel: 'Serializable' },
        );
        response.json(attendanceBulkSaveResponseSchema.parse({ data: result }));
      } catch (error) {
        if (serializableConflictCodes.has(asPrismaErrorCode(error) ?? '')) {
          next(
            new HttpError(
              409,
              'ATTENDANCE_VERSION_CONFLICT',
              'Attendance was changed by another request.',
            ),
          );
          return;
        }
        next(error);
      }
    },
  );

  return router;
}
