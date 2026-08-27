import { fedcObservationSchema } from '@learnspace/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { observationService } from './observationService';

const organizationId = '11111111-1111-4111-8111-111111111111';
const definitionId = '22222222-2222-4222-8222-222222222222';
const assignmentId = '33333333-3333-4333-8333-333333333333';
const studentId = '44444444-4444-4444-8444-444444444444';
const membershipId = '55555555-5555-4555-8555-555555555555';
const userId = '66666666-6666-4666-8666-666666666666';
const observationId = '77777777-7777-4777-8777-777777777777';

const definition = {
  id: definitionId,
  organizationId,
  definitionKey: 'fedc',
  version: 2,
  type: 'FEDC' as const,
  title: 'FEDC Instrument',
  framework: null,
  description: null,
  targetAges: null,
  defaultFrequency: null,
  body: { itemCount: 24 },
  isActive: true,
  publishedAt: '2026-08-26T00:00:00.000Z',
  createdAt: '2026-08-26T00:00:00.000Z',
};

const assignment = {
  id: assignmentId,
  organizationId,
  status: 'PENDING' as const,
  academicYear: '2026-2027',
  dueDate: '2026-11-30',
  priority: 'Routine Annual',
  notes: 'Observe classroom transitions.',
  assignedAt: '2026-08-26T00:00:00.000Z',
  completedAt: null,
  cancelledAt: null,
  cancellationReason: null,
  student: {
    id: studentId,
    organizationId,
    studentNumber: 'S-001',
    fullName: 'Student One',
    nickname: null,
    avatarUrl: null,
  },
  definition: {
    id: definition.id,
    definitionKey: definition.definitionKey,
    version: definition.version,
    type: definition.type,
    title: definition.title,
    body: definition.body,
    isActive: true,
    publishedAt: definition.publishedAt,
  },
  assignedTo: {
    membershipId,
    userId,
    displayName: 'Specialist One',
    role: 'SPECIALIST' as const,
    roleTitle: 'Occupational Therapist',
  },
  assignedBy: { id: userId, displayName: 'Coordinator' },
  cancelledBy: null,
  hasObservationRecord: false,
};

const fedcObservation = {
  id: observationId,
  organizationId,
  assignmentId,
  studentId,
  student: {
    id: studentId,
    organizationId,
    studentNumber: 'S-001',
    fullName: 'Student One',
    nickname: null,
    avatarUrl: null,
  },
  definitionId,
  observerId: userId,
  definition: {
    id: definitionId,
    organizationId,
    definitionKey: 'fedc',
    version: 2,
    type: 'FEDC',
    title: 'FEDC Instrument',
    framework: null,
    description: null,
    targetAges: null,
    defaultFrequency: null,
    body: {
      milestones: [
        {
          id: 1,
          title: 'Self regulation',
          maxScore: 3,
          items: [
            {
              id: 'fedc-1-1',
              number: '1',
              text: 'Maintains regulation.',
              milestoneId: 1,
            },
          ],
        },
      ],
    },
    isActive: true,
    publishedAt: '2026-08-26T00:00:00.000Z',
    createdAt: '2026-08-26T00:00:00.000Z',
  },
  observer: { id: userId, displayName: 'Specialist One' },
  observationDate: '2026-08-26',
  status: 'IN_PROGRESS',
  responses: {
    'fedc-1-1': { itemId: 'fedc-1-1', rating: 'S', score: 3 },
  },
  milestoneScores: { 1: 3 },
  totalScore: 3,
  maxPossibleScore: 72,
  notes: 'Observed in class.',
  completedAt: null,
  createdAt: '2026-08-26T00:00:00.000Z',
  updatedAt: '2026-08-26T00:00:00.000Z',
};

const fedcCommand = {
  observationDate: '2026-08-26',
  responses: {
    'fedc-1-1': { itemId: 'fedc-1-1', rating: 'S' as const },
  },
  notes: 'Observed in class.',
};

const sensoryObservation = {
  id: observationId,
  organizationId,
  assignmentId,
  studentId,
  student: fedcObservation.student,
  definitionId,
  observerId: userId,
  definition: {
    ...fedcObservation.definition,
    definitionKey: 'sensory-profile',
    type: 'SENSORY_PROFILE',
    title: 'Sensory Profile Instrument',
    body: {
      items: [
        {
          id: 'sensory-1',
          number: 1,
          text: 'Responds to unexpected sounds.',
          section: 'Auditory',
        },
      ],
    },
  },
  observer: fedcObservation.observer,
  observationDate: '2026-08-26',
  status: 'IN_PROGRESS',
  responses: { 'sensory-1': 0 },
  sectionScores: {
    auditory: { raw: 0, max: 5 },
    visual: { raw: 0, max: 0 },
    touch: { raw: 0, max: 0 },
    movement: { raw: 0, max: 0 },
    behavioral: { raw: 0, max: 0 },
  },
  totalRawScore: 0,
  teacherContactFrequency: 'Daily',
  teacherContactLength: 'Full school year',
  notes: 'Observed in class.',
  completedAt: null,
  createdAt: '2026-08-26T00:00:00.000Z',
  updatedAt: '2026-08-26T00:00:00.000Z',
};

const sensoryCommand = {
  observationDate: '2026-08-26',
  responses: { 'sensory-1': 0 as const },
  teacherContactFrequency: 'Daily',
  teacherContactLength: 'Full school year',
  notes: 'Observed in class.',
};

const sfaObservation = {
  id: observationId,
  organizationId,
  assignmentId,
  studentId,
  student: fedcObservation.student,
  definitionId,
  observerId: userId,
  definition: {
    ...fedcObservation.definition,
    definitionKey: 'sfa',
    type: 'SFA',
    title: 'School Function Assessment',
    body: {
      participationItems: [
        { id: 'regularClassroom', label: 'Regular classroom' },
      ],
      taskSupportItems: [
        { id: 'physicalAssistance', label: 'Physical assistance' },
      ],
      activityPerformanceItems: [{ id: 'travel', label: 'Travel' }],
      adaptationOptions: [{ id: 'visualSchedule', label: 'Visual schedule' }],
    },
  },
  observer: fedcObservation.observer,
  assessmentDate: '2026-08-26',
  observationDate: '2026-08-25',
  status: 'IN_PROGRESS',
  programRecommendation: 'Regular',
  respondents: [
    {
      name: 'Teacher One',
      role: 'Homeroom Teacher',
      initials: 'TO',
    },
  ],
  primaryLanguage: 'English',
  writingMethod: 'Pencil',
  mobilityMethod: 'Independent',
  conditionsAffectingPerformance: 'Busy settings',
  participationScores: { regularClassroom: 4 },
  totalParticipationRawScore: 4,
  participationAverage: 4,
  taskSupports: { physicalAssistance: 2 },
  activityPerformance: { travel: 3 },
  adaptations: ['visualSchedule'],
  notes: 'Observed across settings.',
  completedAt: null,
  createdAt: '2026-08-26T00:00:00.000Z',
  updatedAt: '2026-08-26T00:00:00.000Z',
};

const sfaCommand = {
  assessmentDate: '2026-08-26',
  observationDate: '2026-08-25',
  programRecommendation: 'Regular',
  respondents: [
    {
      id: 'client-respondent-id',
      name: 'Teacher One',
      role: 'Homeroom Teacher',
      initials: 'TO',
    },
  ],
  primaryLanguage: 'English',
  writingMethod: 'Pencil',
  mobilityMethod: 'Independent',
  conditionsAffectingPerformance: 'Busy settings',
  participationScores: { regularClassroom: 4 },
  settings: { regularClassroom: { rating: 4, notes: 'Small group' } },
  participationNotes: 'Benefits from structure.',
  taskSupports: { physicalAssistance: 2 },
  taskSupportNotes: 'Prompt as needed.',
  activityPerformance: { travel: 3 },
  adaptations: ['visualSchedule'],
  adaptationsNotes: 'Review monthly.',
  notes: 'Observed across settings.',
  status: 'COMPLETED',
  id: observationId,
  studentId,
  observerId: userId,
  assignmentId,
  participationAverage: 4,
  totalParticipationRawScore: 4,
};

function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('observationService', () => {
  it('loads definitions and assignments through runtime schemas', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response({ data: [definition], meta: { count: 1 } }),
      )
      .mockResolvedValueOnce(
        response({ data: [assignment], meta: { count: 1 } }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await observationService.getDefinitions(organizationId);
    await observationService.getAssignments(organizationId);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `/api/v1/organizations/${organizationId}/observation-definitions`,
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `/api/v1/organizations/${organizationId}/observation-assignments`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('publishes a definition version instead of overwriting the definition', async () => {
    const fetchMock = vi.fn(async () => response({ data: definition }, 201));
    vi.stubGlobal('fetch', fetchMock);

    await observationService.createDefinitionVersion(
      organizationId,
      definitionId,
      {
        title: 'FEDC Instrument v3',
        body: { itemCount: 25 },
        isActive: true,
      },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/organizations/${organizationId}/observation-definitions/${definitionId}/versions`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          title: 'FEDC Instrument v3',
          body: { itemCount: 25 },
          isActive: true,
        }),
      }),
    );
  });

  it('uses assignment and observation FEDC mutation routes without submitting scores', async () => {
    expect(fedcObservationSchema.safeParse(fedcObservation)).toMatchObject({
      success: true,
    });
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => response({ data: fedcObservation }));
    vi.stubGlobal('fetch', fetchMock);

    await observationService.createFEDCObservation(
      organizationId,
      assignmentId,
      fedcCommand,
    );
    await observationService.saveFEDCObservationDraft(
      organizationId,
      assignmentId,
      fedcCommand,
    );
    await observationService.completeFEDCObservation(
      organizationId,
      assignmentId,
      fedcCommand,
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `/api/v1/organizations/${organizationId}/observation-assignments/${assignmentId}/fedc-observation`,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `/api/v1/organizations/${organizationId}/observation-assignments/${assignmentId}/fedc-observation`,
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `/api/v1/organizations/${organizationId}/observation-assignments/${assignmentId}/fedc-observation/complete`,
      expect.objectContaining({ method: 'POST' }),
    );

    fetchMock.mock.calls.forEach((call) => {
      const init = call[1] as RequestInit;
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body).toEqual(fedcCommand);
      expect(body).not.toHaveProperty('milestoneScores');
      expect(body).not.toHaveProperty('totalScore');
      expect(body).not.toHaveProperty('maxPossibleScore');
      expect(JSON.stringify(body)).not.toContain('"score"');
    });
  });

  it('uses assignment-bound Sensory mutation routes and preserves rating zero without client scores', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => response({ data: sensoryObservation }));
    vi.stubGlobal('fetch', fetchMock);

    await observationService.createSensoryObservation(
      organizationId,
      assignmentId,
      sensoryCommand,
    );
    await observationService.saveSensoryObservationDraft(
      organizationId,
      assignmentId,
      sensoryCommand,
    );
    await observationService.completeSensoryObservation(
      organizationId,
      assignmentId,
      sensoryCommand,
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `/api/v1/organizations/${organizationId}/observation-assignments/${assignmentId}/sensory-profile-observation`,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `/api/v1/organizations/${organizationId}/observation-assignments/${assignmentId}/sensory-profile-observation`,
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `/api/v1/organizations/${organizationId}/observation-assignments/${assignmentId}/sensory-profile-observation/complete`,
      expect.objectContaining({ method: 'POST' }),
    );
    fetchMock.mock.calls.forEach((call) => {
      const init = call[1] as RequestInit;
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body).toEqual(sensoryCommand);
      expect(body).not.toHaveProperty('sectionScores');
      expect(body).not.toHaveProperty('totalRawScore');
      expect(body).not.toHaveProperty('maxPossibleScore');
      expect(body.responses).toEqual({ 'sensory-1': 0 });
    });
  });

  it('loads Sensory detail, student history, and reference routes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ data: sensoryObservation }))
      .mockResolvedValueOnce(
        response({ data: [sensoryObservation], meta: { count: 1 } }),
      )
      .mockResolvedValueOnce(response({ data: sensoryObservation }));
    vi.stubGlobal('fetch', fetchMock);

    const detail = await observationService.getSensoryObservation(
      organizationId,
      assignmentId,
    );
    const history = await observationService.getStudentSensoryObservations(
      organizationId,
      studentId,
    );
    const reference = await observationService.getStudentSensoryReference(
      organizationId,
      studentId,
    );

    expect(detail.responses['sensory-1']).toBe(0);
    expect(history).toHaveLength(1);
    expect(reference.latestObservation?.id).toBe(observationId);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `/api/v1/organizations/${organizationId}/observation-assignments/${assignmentId}/sensory-profile-observation`,
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `/api/v1/organizations/${organizationId}/students/${studentId}/sensory-profile-observations`,
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `/api/v1/organizations/${organizationId}/students/${studentId}/sensory-profile-observations/reference`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('uses assignment-bound SFA mutation routes without client status, identity, or totals', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => response({ data: sfaObservation }));
    vi.stubGlobal('fetch', fetchMock);

    await observationService.createSFAObservation(
      organizationId,
      assignmentId,
      sfaCommand,
    );
    await observationService.saveSFAObservationDraft(
      organizationId,
      assignmentId,
      sfaCommand,
    );
    await observationService.completeSFAObservation(
      organizationId,
      assignmentId,
      sfaCommand,
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `/api/v1/organizations/${organizationId}/observation-assignments/${assignmentId}/sfa-observation`,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `/api/v1/organizations/${organizationId}/observation-assignments/${assignmentId}/sfa-observation`,
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `/api/v1/organizations/${organizationId}/observation-assignments/${assignmentId}/sfa-observation/complete`,
      expect.objectContaining({ method: 'POST' }),
    );

    fetchMock.mock.calls.forEach((call) => {
      const init = call[1] as RequestInit;
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body).not.toHaveProperty('status');
      expect(body).not.toHaveProperty('id');
      expect(body).not.toHaveProperty('studentId');
      expect(body).not.toHaveProperty('observerId');
      expect(body).not.toHaveProperty('assignmentId');
      expect(body).not.toHaveProperty('participationAverage');
      expect(body).not.toHaveProperty('totalParticipationRawScore');
      expect(body.respondents).toEqual([
        {
          name: 'Teacher One',
          role: 'Homeroom Teacher',
          initials: 'TO',
        },
      ]);
    });
  });

  it('loads SFA detail, student history, and reference routes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ data: sfaObservation }))
      .mockResolvedValueOnce(
        response({ data: [sfaObservation], meta: { count: 1 } }),
      )
      .mockResolvedValueOnce(response({ data: sfaObservation }));
    vi.stubGlobal('fetch', fetchMock);

    const detail = await observationService.getSFAObservation(
      organizationId,
      assignmentId,
    );
    const history = await observationService.getStudentSFAObservations(
      organizationId,
      studentId,
    );
    const reference = await observationService.getStudentSFAReference(
      organizationId,
      studentId,
    );

    expect(detail.participationAverage).toBe(4);
    expect(detail.definition?.body).toEqual(sfaObservation.definition.body);
    expect(history).toHaveLength(1);
    expect(reference.latestObservation?.id).toBe(observationId);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `/api/v1/organizations/${organizationId}/observation-assignments/${assignmentId}/sfa-observation`,
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `/api/v1/organizations/${organizationId}/students/${studentId}/sfa-observations`,
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `/api/v1/organizations/${organizationId}/students/${studentId}/sfa-observations/reference`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('loads FEDC detail, student history, and reference routes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ data: fedcObservation }))
      .mockResolvedValueOnce(
        response({ data: [fedcObservation], meta: { count: 1 } }),
      )
      .mockResolvedValueOnce(response({ data: fedcObservation }));
    vi.stubGlobal('fetch', fetchMock);

    const detail = await observationService.getFEDCObservation(
      organizationId,
      assignmentId,
    );
    const history = await observationService.getStudentFEDCObservations(
      organizationId,
      studentId,
    );
    const reference = await observationService.getStudentFEDCReference(
      organizationId,
      studentId,
    );

    expect(detail.totalScore).toBe(3);
    expect(history).toHaveLength(1);
    expect(reference.latestObservation?.id).toBe(observationId);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `/api/v1/organizations/${organizationId}/observation-assignments/${assignmentId}/fedc-observation`,
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `/api/v1/organizations/${organizationId}/students/${studentId}/fedc-observations`,
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `/api/v1/organizations/${organizationId}/students/${studentId}/fedc-observations/reference`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('creates, cancels, and deletes assignments with the contract payloads', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ data: assignment }))
      .mockResolvedValueOnce(response({ data: assignment }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await observationService.createAssignment(organizationId, {
      assignedToMembershipId: membershipId,
      studentId,
      definitionId,
      academicYear: '2026-2027',
      dueDate: '2026-11-30',
      priority: 'Routine Annual',
      notes: 'Observe classroom transitions.',
    });
    await observationService.cancelAssignment(organizationId, assignmentId, {
      reason: 'No longer required.',
    });
    await observationService.deleteAssignment(organizationId, assignmentId);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `/api/v1/organizations/${organizationId}/observation-assignments`,
      expect.objectContaining({ method: 'POST' }),
    );
    const createCall = fetchMock.mock.calls[0] as unknown as [
      RequestInfo | URL,
      RequestInit,
    ];
    expect(JSON.parse(createCall[1].body as string)).toEqual({
      definitionId,
      assignedToMembershipId: membershipId,
      studentId,
      academicYear: '2026-2027',
      dueDate: '2026-11-30',
      priority: 'Routine Annual',
      notes: 'Observe classroom transitions.',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `/api/v1/organizations/${organizationId}/observation-assignments/${assignmentId}/cancel`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'No longer required.' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `/api/v1/organizations/${organizationId}/observation-assignments/${assignmentId}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
