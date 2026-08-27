import { PrismaClient } from '@prisma/client';
import { assertSeedAllowed } from '../apps/api/src/seedGuard.js';

const sfaDefinitionBody = {
  participationItems: [
    { id: 'regularClassroom', label: 'Regular Classroom' },
    { id: 'specialEdClassroom', label: 'Special Education Resource Room' },
    { id: 'playgroundRecess', label: 'Playground and Recess' },
    { id: 'transportation', label: 'Transportation and Hallway' },
    { id: 'bathroomToilet', label: 'Bathroom and Hygiene' },
    { id: 'transitions', label: 'Transitions and Movement' },
    { id: 'mealSnackTime', label: 'Mealtime and Cafeteria' },
  ],
  taskSupportItems: [
    { id: 'physicalAssistance', label: 'Physical Assistance' },
    { id: 'physicalAdaptation', label: 'Physical Adaptation' },
    { id: 'cognitiveAssistance', label: 'Cognitive/Behavioral Assistance' },
    { id: 'cognitiveAdaptation', label: 'Cognitive/Behavioral Adaptation' },
  ],
  activityPerformanceItems: [
    { id: 'travel', label: 'Travel' },
    { id: 'maintaining_posture', label: 'Maintaining Posture' },
    { id: 'manipulation', label: 'Manipulation with Movement' },
    { id: 'eating_drinking', label: 'Eating and Drinking' },
    { id: 'hygiene', label: 'Hygiene' },
    { id: 'clothing_management', label: 'Clothing Management' },
    { id: 'functional_communication', label: 'Functional Communication' },
    { id: 'memory_understanding', label: 'Memory and Understanding' },
    {
      id: 'following_social_conventions',
      label: 'Following Social Conventions',
    },
    { id: 'task_behavior_completion', label: 'Task Behavior and Completion' },
  ],
  adaptationOptions: [
    { id: 'slant-board', label: 'Slant board for paper positioning' },
    { id: 'pencil-grips', label: 'Chunky ergonomic pencil grips' },
    {
      id: 'visual-schedule',
      label: 'Visual daily schedule strip at desk',
    },
    {
      id: 'sensory-corner',
      label: 'Quiet sensory corner retreat access',
    },
    {
      id: 'noise-reduction-headphones',
      label: 'Noise-reduction headphones for fire drills and loud assemblies',
    },
    {
      id: 'weighted-vest',
      label:
        'Weighted sensory vest during floor circle time (15 min intervals)',
    },
    {
      id: 'first-then-card',
      label: 'Individual visual first-then transition card',
    },
    {
      id: 'raised-line-worksheets',
      label: 'Raised-line handwriting worksheets',
    },
  ],
};

export async function seedDatabase(prisma: PrismaClient) {
  const organization = await prisma.organization.upsert({
    where: { slug: 'learnspace-demo' },
    update: { name: 'Learnspace Demonstration School' },
    create: {
      slug: 'learnspace-demo',
      name: 'Learnspace Demonstration School',
    },
  });

  await prisma.observationDefinition.upsert({
    where: {
      organizationId_definitionKey_version: {
        organizationId: organization.id,
        definitionKey: 'school-function-assessment',
        version: 1,
      },
    },
    update: {
      type: 'SFA',
      title: 'School Function Assessment (SFA)',
      framework: 'Coster, DeBaun, Haltiwanger & Mancini',
      description:
        'School participation, task support, activity performance, and adaptations.',
      targetAges: 'Kindergarten through Grade 6',
      defaultFrequency: 'Annual / Triennial Review',
      body: sfaDefinitionBody,
      isActive: true,
      publishedAt: new Date('2026-07-25T00:00:00.000Z'),
    },
    create: {
      organizationId: organization.id,
      definitionKey: 'school-function-assessment',
      version: 1,
      type: 'SFA',
      title: 'School Function Assessment (SFA)',
      framework: 'Coster, DeBaun, Haltiwanger & Mancini',
      description:
        'School participation, task support, activity performance, and adaptations.',
      targetAges: 'Kindergarten through Grade 6',
      defaultFrequency: 'Annual / Triennial Review',
      body: sfaDefinitionBody,
      isActive: true,
      publishedAt: new Date('2026-07-25T00:00:00.000Z'),
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

  const semester = await prisma.semester.upsert({
    where: {
      academicYearId_position: { academicYearId: academicYear.id, position: 1 },
    },
    update: {
      name: 'Semester 1',
      startsOn: new Date('2026-07-01T00:00:00.000Z'),
      endsOn: new Date('2026-12-31T00:00:00.000Z'),
    },
    create: {
      organizationId: organization.id,
      academicYearId: academicYear.id,
      name: 'Semester 1',
      position: 1,
      startsOn: new Date('2026-07-01T00:00:00.000Z'),
      endsOn: new Date('2026-12-31T00:00:00.000Z'),
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

  const subject = await prisma.subject.upsert({
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

  const existingJourney = await prisma.learningJourney.findFirst({
    where: {
      organizationId: organization.id,
      academicYearId: academicYear.id,
      semesterId: semester.id,
      gradeId: grade.id,
      subjectId: subject.id,
      title: 'Demo Inquiry Journey',
    },
    select: { id: true },
  });
  if (!existingJourney) {
    await prisma.learningJourney.create({
      data: {
        organizationId: organization.id,
        title: 'Demo Inquiry Journey',
        academicYearId: academicYear.id,
        semesterId: semester.id,
        unitId: unit.id,
        gradeId: grade.id,
        subjectId: subject.id,
        createdById: gradeTeacher.id,
        updatedById: gradeTeacher.id,
        owners: { create: { membershipId: gradeTeacherMembership.id } },
        projects: {
          create: {
            title: 'Inquiry Kickoff',
            description:
              'Explore a question through observation and discussion.',
            startsOn: new Date('2026-08-01T00:00:00.000Z'),
            endsOn: new Date('2026-08-31T00:00:00.000Z'),
            position: 0,
            goals: {
              create: { description: 'Form an inquiry question.', position: 0 },
            },
          },
        },
      },
    });
  }

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
