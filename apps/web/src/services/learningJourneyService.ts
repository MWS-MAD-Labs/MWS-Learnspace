import {
  academicYearsResponseSchema,
  gradesResponseSchema,
  learningJourneyDetailResponseSchema,
  learningJourneyMutationResponseSchema,
  learningJourneysResponseSchema,
  semestersResponseSchema,
  subjectsResponseSchema,
  unitsResponseSchema,
} from '@learnspace/contracts';
import type {
  AcademicYearsResponse,
  GradesResponse,
  LearningJourneyCreateCommand,
  LearningJourneyDetailResponse,
  LearningJourneyListQuery,
  LearningJourneyMutationResponse,
  LearningJourneyUpdateCommand,
  LearningJourneysResponse,
  SemestersResponse,
  SubjectsResponse,
  UnitsResponse,
} from '@learnspace/contracts';
import type { LearningJourney } from '../types';
import { apiClient } from './apiClient';

function organizationPath(organizationId: string): string {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}`;
}

function queryString(filters: LearningJourneyListQuery = {}): string {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}

export function monthLabel(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`));
}

export function mapJourneyToLegacy(
  journey: LearningJourneyDetailResponse['data'],
): LearningJourney {
  const draftStatus = journey.state === 'DRAFT' ? 'On Progress' : 'Done';
  const principalReviewStatus =
    journey.state === 'PRINCIPAL_REVIEW'
      ? 'On Progress'
      : journey.state === 'DRAFT'
        ? 'Not Started'
        : 'Done';
  const directorApprovalStatus =
    journey.state === 'DIRECTOR_APPROVAL'
      ? 'On Progress'
      : journey.state === 'APPROVED' || journey.state === 'ACTIVE'
        ? 'Done'
        : 'Not Started';
  return {
    id: journey.id,
    organizationId: journey.organizationId,
    version: journey.version,
    academicYearId: journey.academicYear.id,
    semesterId: journey.semester.id,
    unitId: journey.unit.id,
    gradeId: journey.grade.id,
    subjectId: journey.subject.id,
    ownerMembershipIds: journey.owners.map((owner) => owner.membershipId),
    state: journey.state,
    title: journey.title,
    academicYear: journey.academicYear.name,
    semester: journey.semester.name as LearningJourney['semester'],
    unit: journey.unit.name,
    grade: journey.grade.name,
    subject: journey.subject.name,
    ownerIds: journey.owners.map((owner) => owner.userId),
    authorName: journey.createdBy.displayName,
    draftStatus,
    principalReviewStatus,
    directorApprovalStatus,
    workflowHistory: [],
    projects: journey.projects.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      startMonth: monthLabel(project.startsOn),
      endMonth: monthLabel(project.endsOn),
      startDate: project.startsOn,
      endDate: project.endsOn,
      color: project.color ?? undefined,
      order: project.position,
      learningGoals: project.goals.map((goal) => ({
        id: goal.id,
        description: goal.description,
        order: goal.position,
      })),
      crossCurricularConnections: project.connections.map((connection) => ({
        id: connection.id,
        subject: connection.subject,
        description: connection.description,
      })),
    })),
    createdBy: journey.createdBy.id,
    createdAt: journey.createdAt,
    updatedBy: journey.updatedBy.id,
    updatedAt: journey.updatedAt,
  };
}

const monthIndexes = new Map(
  [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ].map((name, index) => [name, index]),
);

export function monthBoundary(label: string, end: boolean): string {
  const [monthName, yearText, ...extra] = label.trim().split(/\s+/);
  const monthIndex = monthIndexes.get(monthName);
  const year = Number(yearText);
  if (extra.length || monthIndex === undefined || !Number.isInteger(year)) {
    throw new Error(`Invalid month label: ${label}`);
  }
  const date = end
    ? new Date(Date.UTC(year, monthIndex + 1, 0))
    : new Date(Date.UTC(year, monthIndex, 1));
  return date.toISOString().slice(0, 10);
}

export function journeyCommand(
  journey: LearningJourney,
): LearningJourneyCreateCommand {
  if (
    !journey.academicYearId ||
    !journey.semesterId ||
    !journey.unitId ||
    !journey.gradeId ||
    !journey.subjectId ||
    !journey.ownerMembershipIds?.length
  ) {
    throw new Error('Select valid academic scope and at least one owner.');
  }
  return {
    title: journey.title,
    academicYearId: journey.academicYearId,
    semesterId: journey.semesterId,
    unitId: journey.unitId,
    gradeId: journey.gradeId,
    subjectId: journey.subjectId,
    ownerMembershipIds: journey.ownerMembershipIds,
    projects: journey.projects.map((project, projectIndex) => ({
      title: project.title,
      description: project.description,
      startsOn: project.startDate ?? monthBoundary(project.startMonth, false),
      endsOn: project.endDate ?? monthBoundary(project.endMonth, true),
      color: project.color ?? null,
      position: projectIndex,
      goals: project.learningGoals.map((goal, goalIndex) => ({
        description: goal.description,
        position: goalIndex,
      })),
      connections: project.crossCurricularConnections.map(
        (connection, connectionIndex) => ({
          subject: connection.subject,
          description: connection.description,
          position: connectionIndex,
        }),
      ),
    })),
  };
}

export const learningJourneyService = {
  getJourneys(
    organizationId: string,
    filters: LearningJourneyListQuery = {},
    signal?: AbortSignal,
  ): Promise<LearningJourneysResponse> {
    return apiClient.request(
      `${organizationPath(organizationId)}/learning-journeys${queryString(filters)}`,
      { schema: learningJourneysResponseSchema, signal },
    );
  },
  getJourney(
    organizationId: string,
    journeyId: string,
    signal?: AbortSignal,
  ): Promise<LearningJourneyDetailResponse> {
    return apiClient.request(
      `${organizationPath(organizationId)}/learning-journeys/${encodeURIComponent(journeyId)}`,
      { schema: learningJourneyDetailResponseSchema, signal },
    );
  },
  createJourney(
    organizationId: string,
    command: LearningJourneyCreateCommand,
    signal?: AbortSignal,
  ): Promise<LearningJourneyMutationResponse> {
    return apiClient.request(
      `${organizationPath(organizationId)}/learning-journeys`,
      {
        method: 'POST',
        body: command,
        schema: learningJourneyMutationResponseSchema,
        signal,
      },
    );
  },
  updateJourney(
    organizationId: string,
    journeyId: string,
    command: LearningJourneyUpdateCommand,
    signal?: AbortSignal,
  ): Promise<LearningJourneyMutationResponse> {
    return apiClient.request(
      `${organizationPath(organizationId)}/learning-journeys/${encodeURIComponent(journeyId)}`,
      {
        method: 'PUT',
        body: command,
        schema: learningJourneyMutationResponseSchema,
        signal,
      },
    );
  },
  getAcademicYears(
    organizationId: string,
    signal?: AbortSignal,
  ): Promise<AcademicYearsResponse> {
    return apiClient.request(
      `${organizationPath(organizationId)}/academic-years`,
      {
        schema: academicYearsResponseSchema,
        signal,
      },
    );
  },
  getSemesters(
    organizationId: string,
    signal?: AbortSignal,
  ): Promise<SemestersResponse> {
    return apiClient.request(`${organizationPath(organizationId)}/semesters`, {
      schema: semestersResponseSchema,
      signal,
    });
  },
  getUnits(
    organizationId: string,
    signal?: AbortSignal,
  ): Promise<UnitsResponse> {
    return apiClient.request(`${organizationPath(organizationId)}/units`, {
      schema: unitsResponseSchema,
      signal,
    });
  },
  getGrades(
    organizationId: string,
    signal?: AbortSignal,
  ): Promise<GradesResponse> {
    return apiClient.request(`${organizationPath(organizationId)}/grades`, {
      schema: gradesResponseSchema,
      signal,
    });
  },
  getSubjects(
    organizationId: string,
    signal?: AbortSignal,
  ): Promise<SubjectsResponse> {
    return apiClient.request(`${organizationPath(organizationId)}/subjects`, {
      schema: subjectsResponseSchema,
      signal,
    });
  },
};
