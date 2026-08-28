import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WeeklyReportStatusTracker } from './WeeklyReportStatusTracker';

const testState = vi.hoisted(() => ({
  getSchoolDate: vi.fn(),
  getWeeklyReports: vi.fn(),
}));

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    organizationId: '11111111-1111-4111-8111-111111111111',
    currentUser: {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Teacher One',
      role: 'SPECIAL_ED_TEACHER',
      isGPK: true,
      isSpecialEdCoordinator: false,
      assignedSpecialNeedsStudentIds: [
        '33333333-3333-4333-8333-333333333333',
      ],
    },
    students: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        name: 'Student One',
        fullName: 'Student One',
        grade: '5',
        specialNeedsFlag: true,
        assignedGPKTeacherId: '22222222-2222-4222-8222-222222222222',
        assignedGPKTeacherName: 'Teacher One',
      },
    ],
    setSelectedStudentId: vi.fn(),
    showToast: vi.fn(),
    refreshData: vi.fn(),
  }),
}));

vi.mock('../../services/attendanceService', () => ({
  attendanceService: { getSchoolDate: testState.getSchoolDate },
}));

vi.mock('../../services/weeklyReportService', () => ({
  weeklyReportService: {
    getWeeklyReports: testState.getWeeklyReports,
    submitWeeklyReport: vi.fn(),
    coordinatorDecision: vi.fn(),
    directorDecision: vi.fn(),
  },
}));

vi.mock('../common/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WeeklyReportStatusTracker authority loading', () => {
  it('fails closed on school-date failure and retries without browser-date queries', async () => {
    testState.getSchoolDate
      .mockRejectedValueOnce(new Error('School date unavailable'))
      .mockResolvedValueOnce({ data: { schoolDate: '2026-04-08' } });
    testState.getWeeklyReports.mockResolvedValue([]);

    render(<WeeklyReportStatusTracker />);

    expect(await screen.findByText('School date unavailable')).toBeVisible();
    expect(testState.getWeeklyReports).not.toHaveBeenCalled();
    expect(screen.queryByText('Total Reports')).not.toBeInTheDocument();
    expect(screen.queryByText('Student One')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() =>
      expect(testState.getWeeklyReports).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111111',
        { year: 2026, weekNumber: 15 },
        expect.any(AbortSignal),
      ),
    );
    expect(await screen.findByText('Total Reports')).toBeVisible();
    expect(screen.getByText('Student One')).toBeVisible();
  });

  it('does not render synthetic rows or KPIs until report status is ready', async () => {
    let resolveReports: (reports: []) => void = () => undefined;
    testState.getSchoolDate.mockResolvedValue({
      data: { schoolDate: '2026-04-08' },
    });
    testState.getWeeklyReports.mockImplementation(
      () =>
        new Promise<[]>((resolve) => {
          resolveReports = resolve;
        }),
    );

    render(<WeeklyReportStatusTracker />);

    expect(
      await screen.findByText('Loading weekly report statuses…'),
    ).toBeVisible();
    expect(screen.queryByText('Total Reports')).not.toBeInTheDocument();
    expect(screen.queryByText('Student One')).not.toBeInTheDocument();
    expect(screen.queryByText('Not Started')).not.toBeInTheDocument();

    resolveReports([]);

    expect(await screen.findByText('Total Reports')).toBeVisible();
    expect(screen.getByText('Student One')).toBeVisible();
    expect(screen.getAllByText('Not Started')).toHaveLength(3);
  });
});
