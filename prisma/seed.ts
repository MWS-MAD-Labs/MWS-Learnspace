import { PrismaClient } from '@prisma/client';
import { assertSeedAllowed } from '../apps/api/src/seedGuard.js';

export async function seedDatabase(prisma: PrismaClient) {
  const organization = await prisma.organization.upsert({
    where: { slug: 'learnspace-demo' },
    update: { name: 'Learnspace Demonstration School' },
    create: {
      slug: 'learnspace-demo',
      name: 'Learnspace Demonstration School',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'principal@example.test' },
    update: { displayName: 'Demo Principal' },
    create: {
      email: 'principal@example.test',
      displayName: 'Demo Principal',
    },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: { role: 'PRINCIPAL' },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: 'PRINCIPAL',
    },
  });

  const gradeTeacher = await prisma.user.upsert({
    where: { email: 'grade.teacher@example.test' },
    update: { displayName: 'Demo Grade Teacher' },
    create: {
      email: 'grade.teacher@example.test',
      displayName: 'Demo Grade Teacher',
    },
  });

  const gradeTeacherMembership = await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: gradeTeacher.id,
      },
    },
    update: { role: 'GRADE_TEACHER', status: 'ACTIVE' },
    create: {
      organizationId: organization.id,
      userId: gradeTeacher.id,
      role: 'GRADE_TEACHER',
    },
  });

  const academicYear = await prisma.academicYear.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: '2026-2027',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: '2026-2027',
      startsOn: new Date('2026-07-01T00:00:00.000Z'),
      endsOn: new Date('2027-06-30T00:00:00.000Z'),
    },
  });

  const unit = await prisma.unit.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: 'ELEMENTARY',
      },
    },
    update: { name: 'Elementary' },
    create: {
      organizationId: organization.id,
      code: 'ELEMENTARY',
      name: 'Elementary',
    },
  });

  const grade = await prisma.grade.upsert({
    where: {
      organizationId_code: { organizationId: organization.id, code: 'G1' },
    },
    update: { name: 'Grade 1', position: 1, unitId: unit.id },
    create: {
      organizationId: organization.id,
      unitId: unit.id,
      code: 'G1',
      name: 'Grade 1',
      position: 1,
    },
  });

  await prisma.membershipUnit.upsert({
    where: {
      membershipId_unitId: {
        membershipId: gradeTeacherMembership.id,
        unitId: unit.id,
      },
    },
    update: {},
    create: { membershipId: gradeTeacherMembership.id, unitId: unit.id },
  });

  await prisma.membershipGrade.upsert({
    where: {
      membershipId_gradeId: {
        membershipId: gradeTeacherMembership.id,
        gradeId: grade.id,
      },
    },
    update: {},
    create: { membershipId: gradeTeacherMembership.id, gradeId: grade.id },
  });

  await prisma.subject.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: 'GENERAL',
      },
    },
    update: { name: 'General Studies' },
    create: {
      organizationId: organization.id,
      code: 'GENERAL',
      name: 'General Studies',
    },
  });

  const schoolClass = await prisma.schoolClass.upsert({
    where: {
      organizationId_code: { organizationId: organization.id, code: 'G1-A' },
    },
    update: { name: 'Grade 1A', unitId: unit.id, gradeId: grade.id },
    create: {
      organizationId: organization.id,
      unitId: unit.id,
      gradeId: grade.id,
      code: 'G1-A',
      name: 'Grade 1A',
    },
  });

  const seededRoster = [
    {
      number: 'DEMO-001',
      name: 'Demo Present Student',
      status: 'PRESENT' as const,
    },
    { number: 'DEMO-002', name: 'Demo Late Student', status: 'LATE' as const },
    { number: 'DEMO-003', name: 'Demo Sick Student', status: 'SICK' as const },
    {
      number: 'DEMO-004',
      name: 'Demo Excused Student',
      status: 'EXCUSED_ABSENCE' as const,
    },
    {
      number: 'DEMO-005',
      name: 'Demo Unexcused Student',
      status: 'UNEXCUSED_ABSENCE' as const,
    },
  ];

  for (const [index, rosterItem] of seededRoster.entries()) {
    const student = await prisma.student.upsert({
      where: {
        organizationId_studentNumber: {
          organizationId: organization.id,
          studentNumber: rosterItem.number,
        },
      },
      update: { fullName: rosterItem.name, status: 'ACTIVE' },
      create: {
        organizationId: organization.id,
        studentNumber: rosterItem.number,
        fullName: rosterItem.name,
        dateOfBirth: new Date(
          `2019-01-${String(15 + index).padStart(2, '0')}T00:00:00.000Z`,
        ),
      },
    });

    const enrollment = await prisma.enrollment.upsert({
      where: {
        studentId_academicYearId_classId_startsOn: {
          studentId: student.id,
          academicYearId: academicYear.id,
          classId: schoolClass.id,
          startsOn: new Date('2026-07-01T00:00:00.000Z'),
        },
      },
      update: {},
      create: {
        organizationId: organization.id,
        studentId: student.id,
        academicYearId: academicYear.id,
        classId: schoolClass.id,
        startsOn: new Date('2026-07-01T00:00:00.000Z'),
      },
    });

    await prisma.attendanceRecord.upsert({
      where: {
        organizationId_studentId_classId_schoolDate: {
          organizationId: organization.id,
          studentId: student.id,
          classId: schoolClass.id,
          schoolDate: new Date('2026-08-24T00:00:00.000Z'),
        },
      },
      update: {
        enrollmentId: enrollment.id,
        status: rosterItem.status,
        minutesLate: rosterItem.status === 'LATE' ? 10 : null,
        recordedById: gradeTeacher.id,
      },
      create: {
        organizationId: organization.id,
        studentId: student.id,
        enrollmentId: enrollment.id,
        classId: schoolClass.id,
        schoolDate: new Date('2026-08-24T00:00:00.000Z'),
        status: rosterItem.status,
        minutesLate: rosterItem.status === 'LATE' ? 10 : null,
        recordedById: gradeTeacher.id,
      },
    });
  }
}

async function main() {
  const environment = assertSeedAllowed();
  const prisma = new PrismaClient({ datasourceUrl: environment.DATABASE_URL });
  try {
    await seedDatabase(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : 'Database seed failed.',
    );
    process.exitCode = 1;
  });
}
