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
    { id: 'visual-schedule', label: 'Visual daily schedule strip at desk' },
    { id: 'sensory-corner', label: 'Quiet sensory corner retreat access' },
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

export const e2eFixture = {
  organizationId: '10000000-0000-4000-8000-000000000001',
  forbiddenOrganizationId: '10000000-0000-4000-8000-000000000002',
  teacherId: '20000000-0000-4000-8000-000000000001',
  teacherEmail: 'attendance.teacher@example.test',
  directorId: '20000000-0000-4000-8000-000000000002',
  directorEmail: 'p5.director@example.test',
  principalId: '20000000-0000-4000-8000-000000000003',
  principalEmail: 'p5.principal@example.test',
  specialEdCoordinatorId: '20000000-0000-4000-8000-000000000004',
  specialEdCoordinatorEmail: 'p5.observation.coordinator@example.test',
  specialistId: '20000000-0000-4000-8000-000000000005',
  specialistEmail: 'p5.observation.specialist@example.test',
  membershipId: '30000000-0000-4000-8000-000000000001',
  directorMembershipId: '30000000-0000-4000-8000-000000000002',
  principalMembershipId: '30000000-0000-4000-8000-000000000003',
  specialEdCoordinatorMembershipId: '30000000-0000-4000-8000-000000000004',
  specialistMembershipId: '30000000-0000-4000-8000-000000000005',
  unitId: '40000000-0000-4000-8000-000000000001',
  authorizedGradeId: '50000000-0000-4000-8000-000000000001',
  forbiddenGradeId: '50000000-0000-4000-8000-000000000002',
  authorizedClassId: '60000000-0000-4000-8000-000000000001',
  forbiddenClassId: '60000000-0000-4000-8000-000000000002',
  academicYearId: '70000000-0000-4000-8000-000000000001',
  semesterId: '71000000-0000-4000-8000-000000000001',
  subjectId: '72000000-0000-4000-8000-000000000001',
  learningJourneyId: '73000000-0000-4000-8000-000000000001',
  forbiddenLearningJourneyId: '73000000-0000-4000-8000-000000000002',
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
  await prisma.workflowEvent.deleteMany();
  await prisma.learningJourney.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.fEDCObservation.deleteMany();
  await prisma.sensoryProfileObservation.deleteMany();
  await prisma.sFAObservation.deleteMany();
  await prisma.observationAssignment.deleteMany();
  await prisma.observationDefinition.deleteMany();
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
      {
        id: e2eFixture.specialEdCoordinatorId,
        email: e2eFixture.specialEdCoordinatorEmail,
        displayName: 'Cora Observation Coordinator',
        status: 'ACTIVE',
      },
      {
        id: e2eFixture.specialistId,
        email: e2eFixture.specialistEmail,
        displayName: 'Sam Observation Specialist',
        status: 'ACTIVE',
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
      {
        id: e2eFixture.specialEdCoordinatorMembershipId,
        organizationId: e2eFixture.organizationId,
        userId: e2eFixture.specialEdCoordinatorId,
        role: 'SPECIAL_ED_COORDINATOR',
        roleTitle: 'Special Education Coordinator',
        status: 'ACTIVE',
      },
      {
        id: e2eFixture.specialistMembershipId,
        organizationId: e2eFixture.organizationId,
        userId: e2eFixture.specialistId,
        role: 'SPECIALIST',
        roleTitle: 'Occupational Therapist',
        status: 'ACTIVE',
      },
    ],
  });
  await prisma.observationDefinition.create({
    data: {
      organizationId: e2eFixture.organizationId,
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
  await prisma.academicYear.create({
    data: {
      id: e2eFixture.academicYearId,
      organizationId: e2eFixture.organizationId,
      name: '2026-2027',
      startsOn: new Date('2026-07-01T00:00:00.000Z'),
      endsOn: new Date('2027-06-30T00:00:00.000Z'),
    },
  });
  await prisma.semester.create({
    data: {
      id: e2eFixture.semesterId,
      organizationId: e2eFixture.organizationId,
      academicYearId: e2eFixture.academicYearId,
      name: 'Semester 1',
      position: 1,
      startsOn: new Date('2026-07-01T00:00:00.000Z'),
      endsOn: new Date('2026-12-31T00:00:00.000Z'),
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
  await prisma.subject.create({
    data: {
      id: e2eFixture.subjectId,
      organizationId: e2eFixture.organizationId,
      code: 'GENERAL',
      name: 'General Studies',
    },
  });
  await prisma.membershipGrade.create({
    data: {
      membershipId: e2eFixture.membershipId,
      gradeId: e2eFixture.authorizedGradeId,
    },
  });
  await prisma.learningJourney.create({
    data: {
      id: e2eFixture.learningJourneyId,
      organizationId: e2eFixture.organizationId,
      title: 'Existing E2E Inquiry Draft',
      academicYearId: e2eFixture.academicYearId,
      semesterId: e2eFixture.semesterId,
      unitId: e2eFixture.unitId,
      gradeId: e2eFixture.authorizedGradeId,
      subjectId: e2eFixture.subjectId,
      createdById: e2eFixture.teacherId,
      updatedById: e2eFixture.teacherId,
      owners: {
        create: { membershipId: e2eFixture.membershipId },
      },
      projects: {
        create: {
          title: 'Inquiry Kickoff',
          description: 'Explore questions through observation and discussion.',
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
  await prisma.learningJourney.create({
    data: {
      id: e2eFixture.forbiddenLearningJourneyId,
      organizationId: e2eFixture.organizationId,
      title: 'Forbidden Grade 2 Draft',
      academicYearId: e2eFixture.academicYearId,
      semesterId: e2eFixture.semesterId,
      unitId: e2eFixture.unitId,
      gradeId: e2eFixture.forbiddenGradeId,
      subjectId: e2eFixture.subjectId,
      createdById: e2eFixture.directorId,
      updatedById: e2eFixture.directorId,
      owners: {
        create: { membershipId: e2eFixture.directorMembershipId },
      },
      projects: {
        create: {
          title: 'Forbidden Scope Project',
          description: 'This project is outside the Grade Teacher scope.',
          startsOn: new Date('2026-09-01T00:00:00.000Z'),
          endsOn: new Date('2026-09-30T00:00:00.000Z'),
          position: 0,
          goals: {
            create: { description: 'Remain outside scope.', position: 0 },
          },
        },
      },
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
