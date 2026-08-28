import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WeeklyReportView } from './WeeklyReportView';

const testState = vi.hoisted(() => ({
  selectedWeeklyReportId: null as string | null,
  selectedStudentId: '22222222-2222-4222-8222-222222222222',
  secondIepLoading: true,
  setSelectedWeeklyReportId: vi.fn(),
  setSelectedStudentId: vi.fn(),
  setWeeklyReportTrackerRequested: vi.fn(),
  showToast: vi.fn(),
  getSchoolDate: vi.fn(),
  getWeeklyReport: vi.fn(),
  getWeeklyReports: vi.fn(),
  createWeeklyReport: vi.fn(),
  submitWeeklyReport: vi.fn(),
  secondStudentId: '66666666-6666-4666-8666-666666666666',
  report: {
    id: '11111111-1111-4111-8111-111111111111',
    studentId: '22222222-2222-4222-8222-222222222222',
    iepId: '33333333-3333-4333-8333-333333333333',
    year: '2026',
    weekNumber: 14,
    weekRange: 'Week 14',
    weekStart: '2026-11-06',
    weekEnd: '2026-11-10',
    teacherId: '44444444-4444-4444-8444-444444444444',
    teacherName: 'Teacher One',
    status: 'Draft',
    draftStatus: 'On Progress',
    coordinatorReviewStatus: 'Not Started',
    directorApprovalStatus: 'Not Started',
    workflowHistory: [],
    goalProgress: [
      {
        goalId: '99999999-9999-4999-8999-999999999999',
        addressedThisWeek: true,
        rating: 3,
        markedAchievedThisWeek: false,
      },
    ],
    descriptiveObservation: 'Observation',
    homeConnection: 'Home connection',
    createdAt: '2026-08-27T12:00:00.000Z',
    updatedAt: '2026-08-27T12:00:00.000Z',
  },
}));

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    organizationId: '55555555-5555-4555-8555-555555555555',
    selectedStudentId: testState.selectedStudentId,
    setSelectedStudentId: (value: string) => {
      testState.selectedStudentId = value;
      testState.setSelectedStudentId(value);
    },
    selectedWeeklyReportId: testState.selectedWeeklyReportId,
    setSelectedWeeklyReportId: (value: string | null) => {
      testState.selectedWeeklyReportId = value;
      testState.setSelectedWeeklyReportId(value);
    },
    weeklyReportTrackerRequested: false,
    setWeeklyReportTrackerRequested: testState.setWeeklyReportTrackerRequested,
    students: [
      {
        id: testState.report.studentId,
        fullName: 'Student One',
        name: 'Student One',
        grade: 'Grade 5',
        className: '5A',
        specialNeedsFlag: true,
        assignedGPKTeacherId: testState.report.teacherId,
      },
      {
        id: testState.secondStudentId,
        fullName: 'Student Two',
        name: 'Student Two',
        grade: 'Grade 5',
        className: '5B',
        specialNeedsFlag: true,
        assignedGPKTeacherId: testState.report.teacherId,
      },
    ],
    currentUser: {
      id: testState.report.teacherId,
      name: 'Teacher One',
      role: 'SPECIAL_ED_TEACHER',
      isGPK: true,
      isSpecialEdCoordinator: false,
      assignedSpecialNeedsStudentIds: [
        testState.report.studentId,
        testState.secondStudentId,
      ],
      permissions: ['special-ed:read', 'special-ed:write'],
    },
    showToast: testState.showToast,
    refreshData: vi.fn(),
    navigateToIEP: vi.fn(),
  }),
}));

vi.mock('../../hooks/useIEPs', () => ({
  useIEPs: (_organizationId: string, filters: { studentId?: string }) =>
    filters.studentId === testState.secondStudentId
      ? {
          ieps: [],
          status: testState.secondIepLoading ? 'loading' : 'ready',
        }
      : {
          ieps: [
            {
              id: testState.report.iepId,
              studentId: testState.report.studentId,
              goals: [
                {
                  id: '99999999-9999-4999-8999-999999999999',
                  code: 'G-1',
                  performanceArea: 'Reading',
                  measurableGoal: 'Read independently',
                },
              ],
            },
          ],
          status: 'ready',
        },
}));

vi.mock('../../services/attendanceService', () => ({
  attendanceService: {
    getSchoolDate: testState.getSchoolDate,
  },
}));

vi.mock('../../services/weeklyReportService', () => ({
  weeklyReportService: {
    getWeeklyReports: testState.getWeeklyReports,
    getWeeklyReport: testState.getWeeklyReport,
    createWeeklyReport: testState.createWeeklyReport,
    updateWeeklyReport: vi.fn().mockResolvedValue(testState.report),
    submitWeeklyReport: testState.submitWeeklyReport,
  },
}));

vi.mock('./WeeklyReportStatusTracker', () => ({
  WeeklyReportStatusTracker: () => <div>Tracker is open</div>,
}));

vi.mock('../common/StatusBadge', () => ({
  StatusBadge: () => <span>Status</span>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  testState.selectedWeeklyReportId = null;
  testState.selectedStudentId = testState.report.studentId;
  testState.secondIepLoading = true;
  testState.getSchoolDate.mockResolvedValue({
    data: { schoolDate: '2026-02-18' },
  });
  testState.getWeeklyReport.mockResolvedValue(testState.report);
  testState.getWeeklyReports.mockImplementation(
    (
      _organizationId,
      filters: { studentId?: string; year?: number; weekNumber?: number },
    ) =>
      Promise.resolve(
        filters.studentId === testState.secondStudentId
          ? []
          : [
              {
                ...testState.report,
                year: String(filters.year ?? 2026),
                weekNumber: filters.weekNumber ?? 8,
              },
            ],
      ),
  );
  testState.createWeeklyReport.mockResolvedValue(testState.report);
  testState.submitWeeklyReport.mockResolvedValue({
    ...testState.report,
    draftStatus: 'Done',
    coordinatorReviewStatus: 'On Progress',
  });
});

describe('WeeklyReportView exact-report navigation', () => {
  it('waits for the authoritative school date before querying or enabling the editor', async () => {
    let resolveSchoolDate: (value: { data: { schoolDate: string } }) => void =
      () => undefined;
    testState.getSchoolDate.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSchoolDate = resolve;
        }),
    );

    render(<WeeklyReportView />);

    expect(
      screen.getByText(/loading the selected student and weekly report/i),
    ).toBeVisible();
    expect(testState.getWeeklyReports).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: /save draft & sync iep/i }),
    ).not.toBeInTheDocument();

    resolveSchoolDate({ data: { schoolDate: '2026-04-08' } });

    await waitFor(() =>
      expect(testState.getWeeklyReports).toHaveBeenCalledWith(
        '55555555-5555-4555-8555-555555555555',
        expect.objectContaining({ year: 2026, weekNumber: 15 }),
        expect.any(AbortSignal),
      ),
    );
  });

  it('shows a retry and remains closed when school-date initialization fails', async () => {
    testState.getSchoolDate
      .mockRejectedValueOnce(new Error('School date unavailable'))
      .mockResolvedValueOnce({ data: { schoolDate: '2026-04-08' } });

    render(<WeeklyReportView />);

    expect(
      await screen.findByText(/weekly report period could not be initialized/i),
    ).toBeVisible();
    expect(testState.getWeeklyReports).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect(testState.getWeeklyReports).toHaveBeenCalled());
  });

  it('lets an exact deep link win over an in-flight normal school-date initialization', async () => {
    let resolveSchoolDate: (value: { data: { schoolDate: string } }) => void =
      () => undefined;
    testState.getSchoolDate.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSchoolDate = resolve;
        }),
    );
    const { rerender } = render(<WeeklyReportView />);

    testState.selectedWeeklyReportId = testState.report.id;
    rerender(<WeeklyReportView />);

    await waitFor(() =>
      expect(testState.getWeeklyReports).toHaveBeenCalledWith(
        '55555555-5555-4555-8555-555555555555',
        {
          studentId: testState.report.studentId,
          weekNumber: testState.report.weekNumber,
          year: Number(testState.report.year),
        },
        expect.any(AbortSignal),
      ),
    );

    resolveSchoolDate({ data: { schoolDate: '2026-04-08' } });

    await waitFor(() =>
      expect(testState.getWeeklyReports).not.toHaveBeenCalledWith(
        '55555555-5555-4555-8555-555555555555',
        expect.objectContaining({ weekNumber: 15 }),
        expect.any(AbortSignal),
      ),
    );
  });

  it('suspends the editor immediately when the selected student changes', async () => {
    const { rerender } = render(<WeeklyReportView />);
    expect(
      await screen.findByRole('button', { name: /save draft & sync iep/i }),
    ).toBeVisible();

    fireEvent.change(document.getElementById('weekly-student-select')!, {
      target: { value: testState.secondStudentId },
    });
    rerender(<WeeklyReportView />);

    expect(
      screen.getByText(/loading the selected student and weekly report/i),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /save draft & sync iep/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Observation')).not.toBeInTheDocument();
  });

  it('includes an authoritative selected year outside the former fixed range', async () => {
    testState.selectedWeeklyReportId = testState.report.id;
    testState.getWeeklyReport.mockResolvedValueOnce({
      ...testState.report,
      year: '2035',
    });

    render(<WeeklyReportView />);

    const yearSelect = await screen.findByLabelText(/report year/i);
    expect(yearSelect).toHaveValue('2035');
    expect(
      screen.getByRole('option', { name: '2035' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2030' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2040' })).toBeInTheDocument();
  });

  it('preserves the selected report year when changing student or week', async () => {
    testState.secondIepLoading = false;
    const { rerender } = render(<WeeklyReportView />);
    await screen.findByText(/weekly report governance/i);
    fireEvent.change(screen.getByLabelText(/report year/i), {
      target: { value: '2025' },
    });
    await screen.findByText(/weekly report governance/i);
    fireEvent.click(screen.getByRole('button', { name: /next report week/i }));
    rerender(<WeeklyReportView />);

    await waitFor(() =>
      expect(testState.getWeeklyReports).toHaveBeenCalledWith(
        '55555555-5555-4555-8555-555555555555',
        {
          studentId: testState.report.studentId,
          weekNumber: 9,
          year: 2025,
        },
        expect.any(AbortSignal),
      ),
    );
  });

  it('discards a pending save response after the report context changes', async () => {
    let resolveSave: (value: typeof testState.report) => void = () => undefined;
    testState.createWeeklyReport.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    const { rerender } = render(<WeeklyReportView />);
    fireEvent.click(
      await screen.findByRole('button', { name: /save draft & sync iep/i }),
    );
    expect(testState.createWeeklyReport).toHaveBeenCalledTimes(1);

    fireEvent.change(document.getElementById('weekly-student-select')!, {
      target: { value: testState.secondStudentId },
    });
    rerender(<WeeklyReportView />);
    resolveSave(testState.report);

    await waitFor(() =>
      expect(
        screen.getByText(/loading the selected student and weekly report/i),
      ).toBeVisible(),
    );
    expect(testState.showToast).not.toHaveBeenCalledWith(
      'success',
      expect.anything(),
      expect.anything(),
    );
    expect(screen.queryByText('Observation')).not.toBeInTheDocument();
  });

  it('completes submit after a persisted draft even when the visible context changes', async () => {
    let resolveSave: (value: typeof testState.report) => void = () => undefined;
    testState.createWeeklyReport.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    const { rerender } = render(<WeeklyReportView />);
    await screen.findByText(/read independently/i);
    fireEvent.click(
      screen.getByRole('button', {
        name: /submit for coordinator review/i,
      }),
    );
    expect(testState.createWeeklyReport).toHaveBeenCalledTimes(1);

    fireEvent.change(document.getElementById('weekly-student-select')!, {
      target: { value: testState.secondStudentId },
    });
    rerender(<WeeklyReportView />);
    resolveSave(testState.report);

    await waitFor(() =>
      expect(testState.submitWeeklyReport).toHaveBeenCalledWith(
        '55555555-5555-4555-8555-555555555555',
        expect.objectContaining({
          id: testState.report.id,
          studentId: testState.report.studentId,
        }),
      ),
    );
    expect(
      screen.getByText(/loading the selected student and weekly report/i),
    ).toBeVisible();
  });

  it('returns a mounted tracker view to the editor when a deep link arrives', async () => {
    const { rerender } = render(<WeeklyReportView />);
    fireEvent.click(
      await screen.findByRole('button', {
        name: /manage weekly reports tracker/i,
      }),
    );
    expect(screen.getByText('Tracker is open')).toBeVisible();

    testState.selectedWeeklyReportId = testState.report.id;
    rerender(<WeeklyReportView />);

    await waitFor(() =>
      expect(screen.queryByText('Tracker is open')).not.toBeInTheDocument(),
    );
    expect(await screen.findByText(/weekly report governance/i)).toBeVisible();
    expect(testState.setSelectedWeeklyReportId).toHaveBeenCalledWith(null);
  });
});
