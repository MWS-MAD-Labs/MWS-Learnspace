import { afterEach, describe, expect, it, vi } from 'vitest';
import { iepService, mapIEPToLegacy } from './iepService';

const organizationId = '11111111-1111-4111-8111-111111111111';
const iepId = '22222222-2222-4222-8222-222222222222';
const studentId = '33333333-3333-4333-8333-333333333333';
const academicYearId = '44444444-4444-4444-8444-444444444444';
const semesterId = '55555555-5555-4555-8555-555555555555';
const goalId = '66666666-6666-4666-8666-666666666666';

const apiIEP = {
  id: iepId,
  organizationId,
  version: 3,
  student: {
    id: studentId,
    studentNumber: 'S-001',
    fullName: 'Student One',
  },
  academicYear: {
    id: academicYearId,
    organizationId,
    name: '2026-2027',
    startsOn: '2026-07-01',
    endsOn: '2027-06-30',
  },
  semester: {
    id: semesterId,
    organizationId,
    academicYearId,
    name: 'Semester 1',
    position: 0,
    startsOn: '2026-07-01',
    endsOn: '2026-12-31',
  },
  state: 'DRAFT',
  consideration: 'Individual support',
  primaryClassification: 'Autism spectrum',
  currentPlacement: 'General education with support',
  homePartnershipSupport: 'Visual routine at home',
  homePartnershipRecommendations: 'Practice transitions',
  progressMeasurementMethods: ['Weekly report'],
  parentCommunicationMethods: ['Portal'],
  parentApproved: true,
  parentName: 'Parent One',
  parentApprovalDate: '2026-08-20',
  startsOn: '2026-07-01',
  endsOn: '2027-06-30',
  teamMembers: [],
  performanceAreas: [],
  accommodations: [],
  goals: [
    {
      id: goalId,
      code: 'GL-001',
      performanceArea: 'Academic',
      measurableGoal: 'Read independently.',
      evaluationMethod: 'Work samples',
      schedule: 'Weekly',
      targetDate: '2027-03-01',
      position: 0,
    },
  ],
  services: [],
  createdBy: {
    id: '77777777-7777-4777-8777-777777777777',
    displayName: 'Coordinator One',
  },
  updatedBy: {
    id: '77777777-7777-4777-8777-777777777777',
    displayName: 'Coordinator One',
  },
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-08-21T10:00:00.000Z',
};

afterEach(() => vi.unstubAllGlobals());

describe('iepService', () => {
  it('lists student IEPs using the organization API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [apiIEP], meta: { count: 1 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const records = await iepService.getIEPs(organizationId, { studentId });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/organizations/${organizationId}/ieps?studentId=${studentId}`,
      expect.objectContaining({ method: 'GET' }),
    );
    expect(records[0]).toMatchObject({
      id: iepId,
      studentId,
      academicYearId,
      state: 'DRAFT',
      status: 'Draft',
    });
  });

  it('creates a default draft with academic-year dates and no inferred semester', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [apiIEP.academicYear], meta: { count: 1 } }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [apiIEP.semester], meta: { count: 1 } }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { ...apiIEP, semester: null } }), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const record = mapIEPToLegacy(apiIEP);
    record.id = 'temporary-draft';
    record.version = undefined;
    record.academicYearId = undefined;
    record.semesterId = undefined;
    record.startsOn = undefined;
    record.endsOn = undefined;

    await iepService.createIEP(organizationId, record);

    const [url, request] = fetchMock.mock.calls[2] as [string, RequestInit];
    const body = JSON.parse(String(request.body));
    expect(url).toBe(`/api/v1/organizations/${organizationId}/ieps`);
    expect(request.method).toBe('POST');
    expect(body).toMatchObject({
      academicYearId,
      semesterId: null,
      startsOn: '2026-07-01',
      endsOn: '2027-06-30',
    });
    expect(body).not.toHaveProperty('expectedVersion');
  });

  it('preserves server goal IDs and excludes derived achievement fields from updates', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [apiIEP], meta: { count: 1 } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: apiIEP }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const record = (await iepService.getIEPs(organizationId))[0];
    record.goals.push({
      id: 'goal-local-1',
      code: 'GL-002',
      performanceArea: 'Motor',
      measurableGoal: 'Use adapted pencil grip.',
      evaluationMethod: 'Observation',
      schedule: 'Weekly',
      active: true,
      achieved: true,
      achievedDate: '2026-10-02',
      timesAddressed: 2,
    });

    await iepService.updateIEP(organizationId, record);

    const [url, request] = fetchMock.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(String(request.body));
    expect(url).toBe(`/api/v1/organizations/${organizationId}/ieps/${iepId}`);
    expect(request.method).toBe('PUT');
    expect(record.goals[0].id).toBe(goalId);
    expect(body.expectedVersion).toBe(3);
    expect(body.goals[0]).toMatchObject({ code: 'GL-001', position: 0 });
    expect(body.goals[1]).toMatchObject({ code: 'GL-002', position: 1 });
    expect(body.goals[0]).not.toHaveProperty('id');
    expect(body.goals[1]).not.toHaveProperty('id');
    expect(body.goals[0]).not.toHaveProperty('achieved');
    expect(body.goals[0]).not.toHaveProperty('achievedDate');
    expect(body.goals[0]).not.toHaveProperty('timesAddressed');
  });
});
