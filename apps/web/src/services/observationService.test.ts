import { afterEach, describe, expect, it, vi } from 'vitest';
import { observationService } from './observationService';

const organizationId = '11111111-1111-4111-8111-111111111111';
const definitionId = '22222222-2222-4222-8222-222222222222';
const assignmentId = '33333333-3333-4333-8333-333333333333';
const studentId = '44444444-4444-4444-8444-444444444444';
const membershipId = '55555555-5555-4555-8555-555555555555';
const userId = '66666666-6666-4666-8666-666666666666';

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
