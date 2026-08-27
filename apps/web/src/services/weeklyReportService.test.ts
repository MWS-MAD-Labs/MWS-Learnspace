import { afterEach, describe, expect, it, vi } from 'vitest';
import { weeklyReportService } from './weeklyReportService';

const organizationId = '11111111-1111-4111-8111-111111111111';
const reportId = '22222222-2222-4222-8222-222222222222';

const apiReport = {
  id: reportId,
  version: 3,
  organizationId,
  studentId: '33333333-3333-4333-8333-333333333333',
  student: {
    id: '33333333-3333-4333-8333-333333333333',
    studentNumber: 'S-001',
    fullName: 'Student One',
  },
  iepId: '44444444-4444-4444-8444-444444444444',
  year: 2026,
  weekNumber: 8,
  weekStart: '2026-10-19',
  weekEnd: '2026-10-23',
  teacher: {
    id: '55555555-5555-4555-8555-555555555555',
    displayName: 'Teacher One',
    role: 'SPECIAL_ED_TEACHER',
    roleTitle: null,
  },
  state: 'DRAFT',
  goalProgress: [
    {
      goalId: '66666666-6666-4666-8666-666666666666',
      addressedThisWeek: true,
      id: '77777777-7777-4777-8777-777777777777',
      rating: 3 as const,
      markedAchievedThisWeek: false,
    },
  ],
  descriptiveObservation: 'Participated in routines.',
  homeConnection: 'Practice routines at home.',
  workflowEvents: [],
  createdAt: '2026-10-23T09:00:00.000Z',
  updatedAt: '2026-10-23T09:00:00.000Z',
};

function response(data: unknown): Response {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('weeklyReportService', () => {
  it('lists reports by organization with supported filters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [apiReport], meta: { count: 1 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const reports = await weeklyReportService.getWeeklyReports(organizationId, {
      studentId: apiReport.studentId,
      weekNumber: 8,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/organizations/${organizationId}/weekly-reports?studentId=${apiReport.studentId}&weekNumber=8`,
      expect.objectContaining({ method: 'GET' }),
    );
    expect(reports[0]).toMatchObject({
      id: reportId,
      version: 3,
      draftStatus: 'On Progress',
      goalProgress: [
        { goalId: apiReport.goalProgress[0].goalId, addressedThisWeek: true },
      ],
    });
  });

  it('creates and updates reports with an expected version on update', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(apiReport))
      .mockResolvedValueOnce(response(apiReport));
    vi.stubGlobal('fetch', fetchMock);

    const report = (await weeklyReportService.createWeeklyReport(
      organizationId,
      {
        ...apiReport,
        year: '2026',
        weekRange: 'Oct 19–23, 2026',
        teacherId: apiReport.teacher.id,
        teacherName: apiReport.teacher.displayName,
        status: 'Draft',
        draftStatus: 'On Progress',
        coordinatorReviewStatus: 'Not Started',
        directorApprovalStatus: 'Not Started',
        workflowHistory: [],
      },
    )) as Parameters<typeof weeklyReportService.updateWeeklyReport>[1];
    await weeklyReportService.updateWeeklyReport(organizationId, report);

    const [createUrl, createRequest] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    const [updateUrl, updateRequest] = fetchMock.mock.calls[1] as [
      string,
      RequestInit,
    ];
    expect(createUrl).toBe(
      `/api/v1/organizations/${organizationId}/weekly-reports`,
    );
    expect(createRequest.method).toBe('POST');
    expect(JSON.parse(String(createRequest.body))).not.toHaveProperty(
      'expectedVersion',
    );
    expect(updateUrl).toBe(
      `/api/v1/organizations/${organizationId}/weekly-reports/${reportId}`,
    );
    expect(updateRequest.method).toBe('PUT');
    expect(JSON.parse(String(updateRequest.body))).toMatchObject({
      expectedVersion: 3,
    });
  });

  it('posts versioned workflow commands to the P5-010 endpoints', async () => {
    const fetchMock = vi.fn().mockImplementation(() => response(apiReport));
    vi.stubGlobal('fetch', fetchMock);
    const report = {
      ...apiReport,
      year: '2026',
      weekRange: 'Oct 19–23, 2026',
      teacherId: apiReport.teacher.id,
      teacherName: apiReport.teacher.displayName,
      status: 'Draft' as const,
      draftStatus: 'On Progress' as const,
      coordinatorReviewStatus: 'Not Started' as const,
      directorApprovalStatus: 'Not Started' as const,
      workflowHistory: [],
    };

    await weeklyReportService.submitWeeklyReport(organizationId, report);
    await weeklyReportService.coordinatorDecision(
      organizationId,
      report,
      'APPROVE',
      'Reviewed.',
    );
    await weeklyReportService.directorDecision(
      organizationId,
      report,
      'RETURN',
      'Please revise.',
    );

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `/api/v1/organizations/${organizationId}/weekly-reports/${reportId}/submit`,
      `/api/v1/organizations/${organizationId}/weekly-reports/${reportId}/coordinator-decision`,
      `/api/v1/organizations/${organizationId}/weekly-reports/${reportId}/director-decision`,
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1].body))).toEqual({
      expectedVersion: 3,
      decision: 'APPROVE',
      comment: 'Reviewed.',
    });
  });
});
