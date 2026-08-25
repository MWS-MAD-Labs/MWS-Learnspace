import { PrismaClient } from '@prisma/client';
import { assertSeedAllowed } from '../apps/api/src/seedGuard.js';

export const e2eFixture = {
  organizationId: '10000000-0000-4000-8000-000000000001',
  forbiddenOrganizationId: '10000000-0000-4000-8000-000000000002',
  teacherId: '20000000-0000-4000-8000-000000000001',
  teacherEmail: 'attendance.teacher@example.test',
  directorId: '20000000-0000-4000-8000-000000000002',
  directorEmail: 'p5.director@example.test',
  principalId: '20000000-0000-4000-8000-000000000003',
  principalEmail: 'p5.principal@example.test',
  membershipId: '30000000-0000-4000-8000-000000000001',
  directorMembershipId: '30000000-0000-4000-8000-000000000002',
  principalMembershipId: '30000000-0000-4000-8000-000000000003',
  unitId: '40000000-0000-4000-8000-000000000001',
  authorizedGradeId: '50000000-0000-4000-8000-000000000001',
  forbiddenGradeId: '50000000-0000-4000-8000-000000000002',
  authorizedClassId: '60000000-0000-4000-8000-000000000001',
  forbiddenClassId: '60000000-0000-4000-8000-000000000002',
  academicYearId: '70000000-0000-4000-8000-000000000001',
  schoolDate: '2026-08-24',
  students: [
    {
      id: '80000000-0000-4000-8000-000000000001',
      enrollmentId: '90000000-0000-4000-8000-000000000001',
      number: 'E2E-001',
      name: 'Alex Attendance',
    },
    {
      id: '80000000-0000-4000-8000-000000000002',
      enrollmentId: '90000000-0000-4000-8000-000000000002',
      number: 'E2E-002',
      name: 'Blair Attendance',
    },
    {
      id: '80000000-0000-4000-8000-000000000003',
      enrollmentId: '90000000-0000-4000-8000-000000000003',
      number: 'E2E-003',
      name: 'Casey Attendance',
    },
  ],
} as const;

export async function seedE2eDatabase(prisma: PrismaClient) {
  await prisma.auditEvent.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.session.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.oAuthLoginTransaction.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.membershipGrade.deleteMany();
  await prisma.membershipUnit.deleteMany();
  await prisma.membershipSubject.deleteMany();
  await prisma.staffStudentAssignment.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.student.deleteMany();
  await prisma.schoolClass.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.semester.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.userInvitation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  await prisma.organization.createMany({
    data: [
      {
        id: e2eFixture.organizationId,
        slug: 'attendance-e2e-school',
        name: 'Attendance E2E School',
      },
      {
        id: e2eFixture.forbiddenOrganizationId,
        slug: 'attendance-e2e-other-school',
        name: 'Attendance E2E Other School',
      },
    ],
  });

  await prisma.user.createMany({
    data: [
      {
        id: e2eFixture.teacherId,
        email: e2eFixture.teacherEmail,
        displayName: 'Taylor Attendance Teacher',
      },
      {
        id: e2eFixture.directorId,
        email: e2eFixture.directorEmail,
        displayName: 'Dana P5 Director',
      },
      {
        id: e2eFixture.principalId,
        email: e2eFixture.principalEmail,
        displayName: 'Priya P5 Principal',
      },
    ],
  });
  await prisma.membership.createMany({
    data: [
      {
        id: e2eFixture.membershipId,
        organizationId: e2eFixture.organizationId,
        userId: e2eFixture.teacherId,
        role: 'GRADE_TEACHER',
        roleTitle: 'Grade 1 Teacher',
      },
      {
        id: e2eFixture.directorMembershipId,
        organizationId: e2eFixture.organizationId,
        userId: e2eFixture.directorId,
        role: 'DIRECTOR',
        roleTitle: 'School Director',
      },
      {
        id: e2eFixture.principalMembershipId,
        organizationId: e2eFixture.organizationId,
        userId: e2eFixture.principalId,
        role: 'PRINCIPAL',
        roleTitle: 'Principal',
      },
    ],
  });
  await prisma.academicYear.create({
    data: {
      id: e2eFixture.academicYearId,
      organizationId: e2eFixture.organizationId,
      name: '2026-2027',
      startsOn: new Date('2026-07-01T00:00:00.000Z'),
      endsOn: new Date('2027-06-30T00:00:00.000Z'),
    },
  });
  await prisma.unit.create({
    data: {
      id: e2eFixture.unitId,
      organizationId: e2eFixture.organizationId,
      code: 'ELEMENTARY',
      name: 'Elementary',
    },
  });
  await prisma.grade.createMany({
    data: [
      {
        id: e2eFixture.authorizedGradeId,
        organizationId: e2eFixture.organizationId,
        unitId: e2eFixture.unitId,
        code: 'G1',
        name: 'Grade 1',
        position: 1,
      },
      {
        id: e2eFixture.forbiddenGradeId,
        organizationId: e2eFixture.organizationId,
        unitId: e2eFixture.unitId,
        code: 'G2',
        name: 'Grade 2',
        position: 2,
      },
    ],
  });
  await prisma.membershipGrade.create({
    data: {
      membershipId: e2eFixture.membershipId,
      gradeId: e2eFixture.authorizedGradeId,
    },
  });
  await prisma.schoolClass.createMany({
    data: [
      {
        id: e2eFixture.authorizedClassId,
        organizationId: e2eFixture.organizationId,
        unitId: e2eFixture.unitId,
        gradeId: e2eFixture.authorizedGradeId,
        code: 'G1-E2E',
        name: 'Grade 1 E2E',
      },
      {
        id: e2eFixture.forbiddenClassId,
        organizationId: e2eFixture.organizationId,
        unitId: e2eFixture.unitId,
        gradeId: e2eFixture.forbiddenGradeId,
        code: 'G2-FORBIDDEN',
        name: 'Grade 2 Forbidden',
      },
    ],
  });

  for (const [index, student] of e2eFixture.students.entries()) {
    await prisma.student.create({
      data: {
        id: student.id,
        organizationId: e2eFixture.organizationId,
        studentNumber: student.number,
        fullName: student.name,
        dateOfBirth: new Date(
          `2019-01-${String(10 + index).padStart(2, '0')}T00:00:00.000Z`,
        ),
      },
    });
    await prisma.enrollment.create({
      data: {
        id: student.enrollmentId,
        organizationId: e2eFixture.organizationId,
        studentId: student.id,
        academicYearId: e2eFixture.academicYearId,
        classId: e2eFixture.authorizedClassId,
        startsOn: new Date('2026-07-01T00:00:00.000Z'),
      },
    });
  }
}

async function main() {
  const environment = assertSeedAllowed();
  if (environment.NODE_ENV !== 'test') {
    throw new Error('E2E seed refused: NODE_ENV must be test.');
  }
  const prisma = new PrismaClient({ datasourceUrl: environment.DATABASE_URL });
  try {
    await seedE2eDatabase(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'E2E seed failed.');
    process.exitCode = 1;
  });
}
