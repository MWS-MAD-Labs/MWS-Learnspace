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

  const student = await prisma.student.upsert({
    where: {
      organizationId_studentNumber: {
        organizationId: organization.id,
        studentNumber: 'DEMO-001',
      },
    },
    update: { fullName: 'Demo Student' },
    create: {
      organizationId: organization.id,
      studentNumber: 'DEMO-001',
      fullName: 'Demo Student',
      dateOfBirth: new Date('2019-01-15T00:00:00.000Z'),
    },
  });

  await prisma.enrollment.upsert({
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
