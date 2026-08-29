const createdAt = '2026-08-24T12:00:00.000Z';
const academicYear = '2026-2027';

export const REHEARSAL_USERS = [
  {
    id: 'rehearsal-coordinator',
    name: 'Rehearsal Coordinator',
    email: 'rehearsal.coordinator@example.test',
    role: 'SPECIAL_ED_COORDINATOR' as const,
    roleTitle: 'Special Education Coordinator',
    unitIds: ['Elementary'],
    gradeIds: ['Grade 1'],
    subjectIds: ['Science'],
    permissions: ['VIEW_ALL'],
  },
  {
    id: 'rehearsal-gpk',
    name: 'Rehearsal GPK Teacher',
    email: 'rehearsal.gpk@example.test',
    role: 'SPECIAL_ED_TEACHER' as const,
    roleTitle: 'GPK Teacher',
    unitIds: ['Elementary'],
    gradeIds: ['Grade 1'],
    subjectIds: ['Special Education'],
    permissions: ['VIEW_ASSIGNED_SPECIAL_STUDENTS'],
    maxSpecialNeedsStudents: 2,
  },
];

export const REHEARSAL_STUDENTS = [
  {
    id: 'rehearsal-student',
    studentNumber: 'REHEARSAL-001',
    fullName: 'Rehearsal Student',
    gender: 'Unspecified' as const,
    dateOfBirth: '2018-01-01',
    grade: 'Grade 1',
    className: '1-A Rehearsal',
    unit: 'Elementary',
    specialNeedsFlag: true,
    active: true,
    assignedGPKTeacherId: 'rehearsal-gpk',
    gpkMaxCaseload: 2,
  },
];

export const REHEARSAL_LEARNING_JOURNEYS = [
  {
    id: 'rehearsal-journey',
    title: 'Rehearsal Science Journey',
    academicYear,
    semester: 'Semester 1' as const,
    unit: 'Elementary',
    grade: 'Grade 1',
    subject: 'Science',
    status: 'Draft',
    ownerIds: ['rehearsal-coordinator'],
    createdBy: 'rehearsal-coordinator',
    updatedBy: 'rehearsal-coordinator',
    createdAt,
    updatedAt: createdAt,
    projects: [
      {
        id: 'rehearsal-project',
        title: 'Plant Growth',
        description: 'Observe plant growth during the import rehearsal.',
        startMonth: '2026-08',
        endMonth: '2026-09',
        startDate: '2026-08-01',
        endDate: '2026-09-30',
        order: 0,
        learningGoals: [
          {
            id: 'rehearsal-learning-goal',
            description: 'Describe observable plant changes.',
            order: 0,
          },
        ],
        crossCurricularConnections: [],
      },
    ],
  },
];

export const REHEARSAL_OBSERVATION_DEFINITIONS = [
  {
    id: 'rehearsal-fedc-definition',
    type: 'FEDC' as const,
    title: 'Rehearsal FEDC',
    version: '1.0',
    updatedBy: 'rehearsal-coordinator',
    lastUpdated: createdAt,
    isActive: true,
    milestones: [],
  },
  {
    id: 'rehearsal-sensory-definition',
    type: 'SENSORY_PROFILE' as const,
    title: 'Rehearsal Sensory Profile',
    version: '1.0',
    updatedBy: 'rehearsal-coordinator',
    lastUpdated: createdAt,
    isActive: true,
    items: [],
  },
  {
    id: 'rehearsal-sfa-definition',
    type: 'SFA' as const,
    title: 'Rehearsal SFA',
    version: '1.0',
    updatedBy: 'rehearsal-coordinator',
    lastUpdated: createdAt,
    isActive: true,
  },
];

export const REHEARSAL_FEDC_OBSERVATIONS = [
  {
    id: 'rehearsal-fedc-observation',
    studentId: 'rehearsal-student',
    observerId: 'rehearsal-coordinator',
    observationType: 'FEDC' as const,
    observationDate: '2026-08-20',
    recordYear: '2026',
    status: 'Completed' as const,
    responses: {},
    milestoneScores: {},
    totalScore: 0,
    maxPossibleScore: 0,
    createdAt,
    updatedAt: createdAt,
  },
];

export const REHEARSAL_SENSORY_PROFILE_OBSERVATIONS = [
  {
    id: 'rehearsal-sensory-observation',
    studentId: 'rehearsal-student',
    observerId: 'rehearsal-coordinator',
    observationType: 'SENSORY_PROFILE' as const,
    observationDate: '2026-08-21',
    recordYear: '2026',
    status: 'Completed' as const,
    responses: {},
    sectionScores: {},
    totalRawScore: 0,
    createdAt,
    updatedAt: createdAt,
  },
];

export const REHEARSAL_SFA_OBSERVATIONS = [
  {
    id: 'rehearsal-sfa-observation',
    studentId: 'rehearsal-student',
    observerId: 'rehearsal-coordinator',
    observationType: 'SFA' as const,
    assessmentDate: '2026-08-22',
    observationDate: '2026-08-22',
    recordYear: '2026',
    status: 'Completed' as const,
    programRecommendation: 'Regular',
    respondents: [],
    participationScores: {},
    taskSupports: {},
    activityPerformance: {},
    adaptations: [],
    participationAverage: 0,
    totalParticipationRawScore: 0,
    createdAt,
    updatedAt: createdAt,
  },
];

export const REHEARSAL_IEPS = [
  {
    id: 'rehearsal-iep',
    studentId: 'rehearsal-student',
    assignedTeacherId: 'rehearsal-gpk',
    academicYear,
    semester: 'Semester 1' as const,
    unit: 'Elementary',
    status: 'Draft',
    consideration: 'Synthetic import rehearsal plan.',
    primaryClassification: 'Synthetic classification',
    currentPlacement: 'General education with support',
    createdBy: 'rehearsal-coordinator',
    updatedBy: 'rehearsal-coordinator',
    createdAt,
    updatedAt: createdAt,
    teamMembers: [],
    performanceAreas: [],
    academicAccommodations: {},
    instructionalAccommodations: [],
    environmentalAccommodations: [],
    assessmentAccommodations: [],
    goals: [
      {
        id: 'rehearsal-iep-goal',
        code: 'G-1',
        performanceArea: 'Communication',
        measurableGoal: 'Complete one synthetic rehearsal goal.',
        evaluationMethod: 'Weekly observation',
        schedule: 'Weekly',
        active: true,
      },
    ],
    serviceSchedule: [],
  },
];

export const REHEARSAL_WEEKLY_REPORTS = [
  {
    id: 'rehearsal-weekly-report',
    studentId: 'rehearsal-student',
    iepId: 'rehearsal-iep',
    teacherId: 'rehearsal-gpk',
    year: '2026',
    weekNumber: 34,
    weekStart: '2026-08-17',
    weekEnd: '2026-08-23',
    status: 'Draft',
    descriptiveObservation: 'Synthetic weekly observation.',
    homeConnection: 'Synthetic home connection.',
    createdAt,
    updatedAt: createdAt,
    goalProgress: [
      {
        id: 'rehearsal-goal-progress',
        goalId: 'rehearsal-iep-goal',
        addressedThisWeek: true,
        rating: 3,
        notes: 'Synthetic progress note.',
      },
    ],
  },
];

export const REHEARSAL_OBSERVATION_ASSIGNMENTS = [
  {
    id: 'rehearsal-fedc-assignment',
    studentId: 'rehearsal-student',
    instrumentType: 'FEDC' as const,
    assignedToUserId: 'rehearsal-coordinator',
    assignedByCoordinatorId: 'rehearsal-coordinator',
    academicYear,
    dueDate: '2026-08-20',
    status: 'COMPLETED' as const,
    recordId: 'rehearsal-fedc-observation',
    assignedDate: createdAt,
    completedAt: createdAt,
  },
];
