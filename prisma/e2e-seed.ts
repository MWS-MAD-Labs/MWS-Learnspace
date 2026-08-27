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
  iepAuthorId: '20000000-0000-4000-8000-000000000006',
  iepAuthorEmail: 'p5.iep.author@example.test',
  iepUnassignedId: '20000000-0000-4000-8000-000000000007',
  iepUnassignedEmail: 'p5.iep.unassigned@example.test',
  membershipId: '30000000-0000-4000-8000-000000000001',
  directorMembershipId: '30000000-0000-4000-8000-000000000002',
  principalMembershipId: '30000000-0000-4000-8000-000000000003',
  specialEdCoordinatorMembershipId: '30000000-0000-4000-8000-000000000004',
  specialistMembershipId: '30000000-0000-4000-8000-000000000005',
  iepAuthorMembershipId: '30000000-0000-4000-8000-000000000006',
  iepUnassignedMembershipId: '30000000-0000-4000-8000-000000000007',
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
  iepId: '74000000-0000-4000-8000-000000000001',
  iepGoalId: '75000000-0000-4000-8000-000000000001',
  iepStudentAssignmentId: '76000000-0000-4000-8000-000000000001',
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
    {
      id: '80000000-0000-4000-8000-000000000004',
      enrollmentId: '90000000-0000-4000-8000-000000000004',
      number: 'E2E-IEP-001',
      name: 'River IEP Student',
      specialNeedsFlag: true,
      nickname: 'River',
      primaryClassification: 'Autism Spectrum Disorder',
      currentPlacement: 'Inclusive Grade 1 classroom with specialized support',
    },
    {
      id: '80000000-0000-4000-8000-000000000005',
      enrollmentId: '90000000-0000-4000-8000-000000000005',
      number: 'E2E-IEP-002',
      name: 'Skyler Inaccessible Student',
      specialNeedsFlag: true,
      nickname: 'Skyler',
      primaryClassification: 'Specific Learning Disability',
      currentPlacement: 'Grade 1 classroom with resource support',
    },
  ],
} as const;

export async function seedE2eDatabase(prisma: PrismaClient) {
  // Test fixtures must reset append-only audit/workflow tables without weakening
  // their production triggers. CASCADE is confined to the guarded test seed.
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "public"."Organization" CASCADE',
  );

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
      {
        id: e2eFixture.iepAuthorId,
        email: e2eFixture.iepAuthorEmail,
        displayName: 'Avery IEP Author',
        status: 'ACTIVE',
      },
      {
        id: e2eFixture.iepUnassignedId,
        email: e2eFixture.iepUnassignedEmail,
        displayName: 'Uma Unassigned Teacher',
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
      {
        id: e2eFixture.iepAuthorMembershipId,
        organizationId: e2eFixture.organizationId,
        userId: e2eFixture.iepAuthorId,
        role: 'SPECIAL_ED_TEACHER',
        roleTitle: 'Assigned Special Education Teacher',
        status: 'ACTIVE',
      },
      {
        id: e2eFixture.iepUnassignedMembershipId,
        organizationId: e2eFixture.organizationId,
        userId: e2eFixture.iepUnassignedId,
        role: 'SPECIAL_ED_TEACHER',
        roleTitle: 'Unassigned Special Education Teacher',
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
        specialNeedsFlag:
          'specialNeedsFlag' in student ? student.specialNeedsFlag : false,
        nickname: 'nickname' in student ? student.nickname : null,
        primaryClassification:
          'primaryClassification' in student
            ? student.primaryClassification
            : null,
        currentPlacement:
          'currentPlacement' in student ? student.currentPlacement : null,
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

  const iepStudent = e2eFixture.students[3];
  await prisma.staffStudentAssignment.create({
    data: {
      id: e2eFixture.iepStudentAssignmentId,
      organizationId: e2eFixture.organizationId,
      membershipId: e2eFixture.iepAuthorMembershipId,
      studentId: iepStudent.id,
      roleContext: 'IEP_CASE_MANAGER',
      startsOn: new Date('2026-07-01T00:00:00.000Z'),
      maxCaseload: 8,
    },
  });

  await prisma.iEP.create({
    data: {
      id: e2eFixture.iepId,
      organizationId: e2eFixture.organizationId,
      studentId: iepStudent.id,
      academicYearId: e2eFixture.academicYearId,
      semesterId: null,
      state: 'DRAFT',
      consideration: 'Individualized special education support',
      primaryClassification: 'Autism Spectrum Disorder',
      currentPlacement: 'Inclusive Grade 1 classroom with specialized support',
      homePartnershipSupport:
        'Use the same visual schedule and calm-break language at home.',
      homePartnershipRecommendations:
        'Practice requesting a break during one predictable transition daily.',
      progressMeasurementMethods: [
        'Weekly case-manager observation log',
        'Monthly work-sample review',
      ],
      parentCommunicationMethods: [
        'Weekly portal update',
        'Term review conference',
      ],
      parentApproved: false,
      startsOn: new Date('2026-07-01T00:00:00.000Z'),
      endsOn: new Date('2027-06-30T00:00:00.000Z'),
      createdById: e2eFixture.iepAuthorId,
      updatedById: e2eFixture.iepAuthorId,
      teamMembers: {
        create: [
          {
            role: 'Special Education Case Manager',
            name: 'Avery IEP Author',
            initials: 'AA',
            confirmed: true,
            position: 0,
          },
          {
            role: 'Occupational Therapist',
            name: 'Sam Observation Specialist',
            initials: 'SO',
            confirmed: true,
            position: 1,
          },
          {
            role: 'School Principal',
            name: 'Priya P5 Principal',
            initials: 'PP',
            confirmed: false,
            position: 2,
          },
        ],
      },
      performanceAreas: {
        create: {
          name: 'Self-regulation and transitions',
          category: 'Social/Emotional',
          strengths:
            'Responds well to visual routines and communicates preferences clearly.',
          needs:
            'Needs explicit preparation and a consistent strategy for unexpected transitions.',
          impactOfNeed:
            'Unexpected changes can delay participation in the next learning activity.',
          informationSource: 'Teacher observation and sensory profile',
          assessmentProcess: 'Structured classroom observation',
          assessmentDate: new Date('2026-08-18T00:00:00.000Z'),
          summaryOfResults:
            'River independently follows predictable transitions and needs one prompt when routines change.',
          position: 0,
        },
      },
      accommodations: {
        create: [
          {
            category: 'ACADEMIC',
            subject: 'General Studies',
            code: 'A',
            description: 'Provide visual directions with each multi-step task.',
            position: 0,
          },
          {
            category: 'INSTRUCTIONAL',
            description: 'Use a first-then card before transitions.',
            position: 0,
          },
          {
            category: 'ENVIRONMENTAL',
            description: 'Provide access to a quiet regulation space.',
            position: 0,
          },
          {
            category: 'ASSESSMENT',
            description: 'Allow one planned movement break during assessments.',
            position: 0,
          },
        ],
      },
      goals: {
        create: {
          id: e2eFixture.iepGoalId,
          code: 'P5-008-G1',
          performanceArea: 'Social/Emotional',
          longTermGoal:
            'River will participate independently across daily classroom transitions.',
          shortTermGoal:
            'River will use the taught break-request strategy during transitions.',
          measurableGoal:
            'River will independently request a break during an unexpected transition in 4 of 5 observed opportunities.',
          strategyActivity:
            'Model and rehearse the break-request phrase before schedule changes.',
          learningExpectation:
            'Communicate a self-regulation need before leaving an activity.',
          learningStrategy: 'Visual first-then card and verbal rehearsal',
          evaluationMethod: 'Weekly case-manager observation checklist',
          schedule: 'Weekly',
          targetDate: new Date('2027-03-31T00:00:00.000Z'),
          active: true,
          position: 0,
        },
      },
      services: {
        create: {
          serviceName: 'Special Education Case Management',
          type: 'INDIVIDUAL',
          duration: '30 minutes',
          frequency: 'Twice weekly',
          location: 'Inclusive classroom and resource room',
          days: 'Tuesday and Thursday',
          position: 0,
        },
      },
    },
  });
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
