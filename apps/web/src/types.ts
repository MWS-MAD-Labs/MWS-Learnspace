export type UserRole =
  | 'PRINCIPAL'
  | 'DIRECTOR'
  | 'GRADE_TEACHER'
  | 'SUBJECT_TEACHER'
  | 'SPECIAL_ED_COORDINATOR'
  | 'SPECIAL_ED_TEACHER'
  | 'SPECIALIST';

export interface User {
  id: string;
  membershipId?: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  avatarUrl?: string;
  unitIds: string[];
  gradeIds: string[];
  subjectIds: string[];
  isGPK?: boolean;
  isSpecialEdCoordinator?: boolean;
  assignedStudentIds?: string[];
  assignedSpecialNeedsStudentIds?: string[];
  maxSpecialNeedsStudents?: number;
  permissions: string[];
}

export interface Student {
  id: string;
  studentNumber: string;
  fullName: string;
  nickname?: string;
  name?: string;
  gender: 'Male' | 'Female' | 'Other' | 'Unspecified';
  dateOfBirth: string;
  age?: number;
  grade: string;
  className: string;
  unit: string;
  parentGuardianName: string;
  parentGuardianPhone: string;
  address: string;
  specialNeedsFlag: boolean;
  active: boolean;
  avatarUrl?: string;
  primaryClassification?: string;
  currentPlacement?: string;
  primaryDiagnosis?: string;
  assignedGPKTeacherId?: string;
  assignedGPKMembershipId?: string;
  assignedGPKTeacherName?: string;
  gpkMaxCaseload?: number;
}

export type ObservationInstrumentType = 'FEDC' | 'SENSORY_PROFILE' | 'SFA';

export type ObservationAssignmentStatus =
  | 'Pending'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ObservationAssignment {
  id: string;
  studentId: string;
  studentName: string;
  studentGrade?: string;
  definitionId: string;
  definitionVersion: number;
  instrumentType: ObservationInstrumentType;
  instrumentTitle?: string;
  definitionBody?: Record<string, unknown>;
  academicYear: string; // e.g. "2026-2027"
  assignedToUserId: string;
  assignedToMembershipId?: string;
  assignedToUserName: string;
  assignedToRole?: string; // e.g. "Occupational Therapist", "Speech Therapist", "GPK Teacher"
  assignedToUserRole?: string;
  assignedByUserId?: string;
  assignedByUserName?: string;
  assignedByCoordinatorId?: string;
  assignedByCoordinatorName?: string;
  assignedDate?: string;
  dueDate: string; // e.g. "2026-11-30"
  status: ObservationAssignmentStatus;
  priority?:
    | 'Routine Annual'
    | 'Urgent Re-Evaluation'
    | 'New Admission Diagnostic'
    | string;
  notes?: string;
  createdAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  recordId?: string;
}

export interface ObservationDefinition {
  id: string;
  definitionKey: string;
  type: ObservationInstrumentType;
  title: string;
  framework: string;
  description: string;
  targetAges: string;
  defaultFrequency: string;
  version: number;
  itemCount: number;
  sectionsCount: number;
  maxScore: number;
  lastUpdated: string;
  updatedBy: string;
  isActive: boolean;
  body: Record<string, unknown>;
  isNew?: boolean;
}

export interface ObservationFormDefinition {
  id: string;
  type: 'FEDC' | 'SENSORY_PROFILE' | 'SFA';
  title: string;
  framework: string;
  description: string;
  targetAges: string;
  defaultFrequency: string;
  version: string;
  itemCount: number;
  lastUpdated: string;
  updatedBy: string;
  isActive: boolean;
  body?: Record<string, unknown>;
}

export interface SpecialNeedsAssignment {
  id: string;
  studentId: string;
  teacherId: string;
  role: string;
  activeFrom: string;
  activeTo?: string;
}

// Learning Journey Types
export type LJDraftStatus =
  | 'Not Started'
  | 'On Progress'
  | 'Done'
  | 'Draft'
  | 'SUBMITTED'
  | 'IN_PROGRESS';
export type LJReviewStatus =
  | 'Not Started'
  | 'On Progress'
  | 'Returned'
  | 'Done'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PENDING';
export type LJApprovalStatus =
  | 'Not Started'
  | 'On Progress'
  | 'Returned'
  | 'Done'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PENDING';

export interface CrossCurricularConnection {
  id: string;
  subject: string;
  description: string;
}

export interface LearningGoal {
  id: string;
  description: string;
  order: number;
}

export interface LearningJourneyProject {
  id: string;
  title: string;
  description: string;
  startMonth: string; // e.g. "August 2026" or "2026-08"
  endMonth: string; // e.g. "September 2026" or "2026-09"
  startDate?: string;
  endDate?: string;
  color?: string;
  crossCurricularConnections: CrossCurricularConnection[];
  learningGoals: LearningGoal[];
  order: number;
}

export interface WorkflowHistoryEntry {
  id: string;
  stage:
    | 'Draft'
    | 'Principal Review'
    | 'Coordinator Review'
    | 'Director Approval'
    | 'DRAFT'
    | 'COORDINATOR_REVIEW'
    | 'DIRECTOR_APPROVAL';
  action?:
    | 'Submitted'
    | 'Returned'
    | 'Approved'
    | 'Updated'
    | 'SUBMITTED'
    | 'APPROVED'
    | 'RETURNED'
    | 'UPDATED'
    | string;
  status: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  timestamp: string;
  comment?: string;
  notes?: string;
}

export interface LearningJourney {
  id: string;
  organizationId?: string;
  version?: number;
  academicYearId?: string;
  semesterId?: string;
  unitId?: string;
  gradeId?: string;
  subjectId?: string;
  ownerMembershipIds?: string[];
  state?:
    | 'DRAFT'
    | 'PRINCIPAL_REVIEW'
    | 'COORDINATOR_REVIEW'
    | 'DIRECTOR_APPROVAL'
    | 'APPROVED'
    | 'ACTIVE'
    | 'ARCHIVED';
  title: string;
  academicYear: string; // "2026-2027"
  semester: 'Semester 1' | 'Semester 2';
  unit: string; // "Elementary", "Early Years", "Junior High"
  grade: string; // "Grade 1", "Grade 2", "K1", etc.
  subject: string; // "Physical Education", "Science", "Math", "English"
  unitName?: string; // "Unit 1: Foundation", etc.
  ownerIds: string[];
  authorName: string;
  draftStatus: LJDraftStatus;
  principalReviewStatus: LJReviewStatus;
  directorApprovalStatus: LJApprovalStatus;
  workflowHistory: WorkflowHistoryEntry[];
  projects: LearningJourneyProject[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

// Special Education - FEDC
export type FEDCRating = 'T' | 'K' | 'S' | 'H'; // T=1, K=2, S=3, H=0

export interface FEDCItem {
  id: string;
  number: string;
  text: string;
  milestoneId: number;
}

export interface FEDCMilestone {
  id: number;
  title: string;
  subtitle?: string;
  description?: string;
  maxScore: number;
  items: FEDCItem[];
}

export interface FEDCItemResponse {
  itemId: string;
  rating?: FEDCRating;
  score?: number;
  masteredAge?: string; // e.g. "4th 6bln"
}

export interface FEDCObservationRecord {
  id: string;
  organizationId?: string;
  assignmentId?: string;
  studentId: string;
  student?: {
    id: string;
    fullName: string;
    studentNumber?: string | null;
    avatarUrl?: string | null;
  };
  definition?: {
    id: string;
    key: string;
    version: number;
    title: string;
    body: Record<string, unknown>;
  };
  observationType: 'FEDC';
  recordYear: string; // derived from observationDate for API records
  observationDate: string; // "2026-10-14"
  observerId: string;
  observerName: string;
  observer?: {
    id?: string;
    userId?: string;
    displayName: string;
  };
  status: 'Draft' | 'Completed' | 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
  responses: Record<string, FEDCItemResponse>;
  milestoneScores: Record<number, number>;
  totalScore: number;
  maxPossibleScore: number;
  notes?: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Special Education - Sensory Profile
export type SensoryRating = 0 | 1 | 2 | 3 | 4 | 5;

export interface SensoryProfileItem {
  id: string;
  number: number;
  section: 'Auditory' | 'Visual' | 'Touch' | 'Movement' | 'Behavioral';
  text: string;
  quadrant?: 'SK' | 'AV' | 'SN' | 'RG'; // Seeking, Avoiding, Sensitivity, Registration
  schoolFactor?: string; // "School Factor 1", "School Factor 2", etc.
  factorLabel?: string; // "SENSORY SENSITIVE", "LOW REGISTRATION", "SUPPORT", etc.
}

export interface SensoryProfileRecord {
  id: string;
  organizationId?: string;
  assignmentId?: string;
  studentId: string;
  student?: {
    id: string;
    fullName: string;
    studentNumber?: string | null;
    avatarUrl?: string | null;
  };
  definition?: {
    id: string;
    key: string;
    version: number;
    title: string;
    body: Record<string, unknown>;
  };
  observationType: 'SENSORY_PROFILE';
  recordYear: string;
  observationDate: string;
  observerId: string;
  observerName: string;
  observer?: {
    id?: string;
    userId?: string;
    displayName: string;
  };
  teacherContactFrequency: string;
  teacherContactLength: string;
  status: 'Draft' | 'Completed' | 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
  responses: Record<string, SensoryRating>;
  sectionScores: Record<string, { raw: number; max: number }>;
  totalRawScore: number;
  maxPossibleScore?: number;
  notes?: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Special Education - SFA (School Function Assessment)
export interface SFARespondent {
  id?: string;
  name: string;
  role: string;
  initials: string;
}

export interface SFAObservationRecord {
  id: string;
  organizationId?: string;
  assignmentId?: string;
  studentId: string;
  student?: {
    id: string;
    fullName: string;
    studentNumber?: string | null;
    avatarUrl?: string | null;
  };
  definition?: {
    id: string;
    key: string;
    version: number;
    title: string;
    body: Record<string, unknown>;
  };
  observationType: 'SFA';
  recordYear: string;
  assessmentDate: string;
  observationDate?: string;
  observerId: string;
  observerName: string;
  observer?: {
    id?: string;
    userId?: string;
    displayName: string;
  };
  coordinatorName: string;
  status: 'Draft' | 'Completed' | 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
  programRecommendation: 'Regular' | 'Special Education' | string;
  respondents: SFARespondent[];
  primaryLanguage: string;
  writingMethod: string;
  mobilityMethod: string;
  conditionsAffectingPerformance: string;

  // Part 1: Participation (1-6 scale)
  participationScores: Record<string, number | undefined> & {
    regularClassroom?: number;
    specialEdClassroom?: number;
    playgroundRecess?: number;
    transportation?: number;
    bathroomToilet?: number;
    transitions?: number;
    mealSnackTime?: number;
  };
  totalParticipationRawScore?: number;
  settings?: Record<string, { rating: number; notes?: string }>;
  participationNotes?: string;
  participationAverage: number;

  // Part 2: Task Supports (1-4 scale)
  taskSupports: Record<string, number | undefined> & {
    physicalAssistance?: number;
    physicalAdaptation?: number;
    cognitiveAssistance?: number;
    cognitiveAdaptation?: number;
  };
  taskSupportNotes?: string;

  // Part 3: Activity Performance (1-4 scale)
  activityPerformance: Record<string, number>;

  // Adaptations Checklist
  adaptations: string[];
  adaptationsNotes?: string;
  notes?: string;
  completedAt?: string | null;

  createdAt: string;
  updatedAt: string;
}

// Special Education - IEP
export interface IEPTeamMember {
  id: string;
  role: string;
  name: string;
  initial: string;
  confirmed: boolean;
}

export interface IEPPerformanceArea {
  id: string;
  name: string;
  category:
    'Academic' | 'Behavioral' | 'Social/Emotional' | 'Communication' | 'Motor';
  strengths: string;
  needs: string;
  impactOfNeed?: string;
  informationSource?: string;
  assessmentProcess?: string;
  assessmentDate?: string;
  summaryOfResults?: string;
}

export interface IEPGoalAddressLog {
  reportId: string;
  weekNumber: number;
  weekRange?: string;
  date: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  markedAchieved?: boolean;
}

export interface IEPGoal {
  id: string;
  code: string; // e.g. "GL-001"
  performanceArea: string;
  longTermGoal?: string;
  shortTermGoal?: string;
  measurableGoal: string;
  strategyActivity?: string;
  learningExpectation?: string;
  learningStrategy?: string;
  evaluationMethod: string;
  schedule: string; // e.g. "Bi-weekly", "Weekly", "Monthly"
  targetDate?: string;
  active: boolean;
  achieved: boolean;
  achievedDate?: string;
  achievedNote?: string;
  achievedInReportId?: string;
  lastAddressedDate?: string;
  lastAddressedWeek?: number;
  lastAddressedRating?: 1 | 2 | 3 | 4 | 5;
  timesAddressed?: number;
  addressedHistory?: IEPGoalAddressLog[];
}

export interface IEPServiceScheduleItem {
  id: string;
  serviceName: string;
  type: '1:1' | 'Group' | 'Consultation';
  duration: string; // e.g. "30 mins / 2x per week"
  frequency?: string;
  location: string; // e.g. "Therapy Room A", "Room 102"
  days?: string;
}

export interface IEPRecord {
  id: string;
  studentId: string;
  studentName?: string;
  grade?: string;
  year: string; // "2026"
  academicYear: string; // "2026-2027"
  semester: string;
  unit: string;
  status: 'Draft' | 'Active' | 'Archived' | 'In Review' | 'Approved';
  draftStatus: LJDraftStatus;
  coordinatorReviewStatus: LJReviewStatus;
  directorApprovalStatus: LJApprovalStatus;
  assignedTeacherId?: string;
  assignedTeacherName?: string;
  workflowHistory: WorkflowHistoryEntry[];
  consideration: string;
  primaryClassification: string;
  currentPlacement: string;

  teamMembers: IEPTeamMember[];
  performanceAreas: IEPPerformanceArea[];

  // Services & Accommodations
  academicAccommodations: {
    math?: 'M' | 'A' | 'P' | 'B' | string;
    science?: 'M' | 'A' | 'P' | 'B' | string;
    english?: 'M' | 'A' | 'P' | 'B' | string;
    bahasaIndonesia?: 'M' | 'A' | 'P' | 'B' | string;
    pe?: 'M' | 'A' | 'P' | 'B' | string;
    makerspace?: 'M' | 'A' | 'P' | 'B' | string;
    religion?: 'M' | 'A' | 'P' | 'B' | string;
    [key: string]: string | undefined;
  };
  instructionalAccommodations: string[];
  environmentalAccommodations: string[];
  assessmentAccommodations: string[];

  goals: IEPGoal[];
  serviceSchedule: IEPServiceScheduleItem[];

  progressMeasurementMethods: string[];
  parentCommunicationMethods: string[];

  homePartnershipSupport: string;
  homePartnershipRecommendations: string;

  parentApproval: {
    agreed: boolean;
    parentName: string;
    date: string;
  };

  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

// Special Education - Weekly IEP Report
export interface WeeklyGoalProgress {
  goalId: string;
  addressedThisWeek: boolean;
  rating?: 1 | 2 | 3 | 4 | 5; // 1-5 scale
  notes?: string;
  markedAchievedThisWeek?: boolean;
  achievedDate?: string;
  achievedNote?: string;
}

export interface IEPReport {
  id: string;
  studentId: string;
  studentName?: string;
  grade?: string;
  iepId: string;
  year: string;
  weekNumber: number;
  weekRange: string; // e.g. "Nov 6–10, 2026" or "10–14 August 2026"
  weekStart: string; // "2026-11-06"
  weekEnd: string; // "2026-11-10"
  teacherId: string;
  teacherName: string;
  status: 'Draft' | 'Completed' | 'In Review' | 'Approved';
  draftStatus: LJDraftStatus;
  coordinatorReviewStatus: LJReviewStatus;
  directorApprovalStatus: LJApprovalStatus;
  workflowHistory: WorkflowHistoryEntry[];
  goalProgress: WeeklyGoalProgress[];
  descriptiveObservation: string;
  homeConnection: string;
  createdAt: string;
  updatedAt: string;
}
