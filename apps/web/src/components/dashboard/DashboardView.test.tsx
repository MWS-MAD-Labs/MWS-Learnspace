import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardView } from './DashboardView';

const setActiveTab = vi.fn();
const navigateToWeeklyReportTracker = vi.fn();
vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    currentUser: {
      name: 'Scoped Teacher',
      permissions: ['attendance:read', 'journey:read'],
    },
    organizationId: '11111111-1111-4111-8111-111111111111',
    setActiveTab,
    navigateToJourneyEditor: vi.fn(),
    navigateToWeeklyReportTracker,
  }),
}));

const payload = {
  data: {
    generatedAt: '2026-08-27T12:00:00.000Z',
    role: 'GRADE_TEACHER',
    students: { total: 3, specialSupport: 1 },
    attendance: {
      schoolDate: '2026-08-27',
      totalStudents: 3,
      recorded: 2,
      present: 1,
      late: 1,
      absent: 0,
    },
    journeys: { total: 2, approved: 1, inReview: 1, draft: 0 },
    specialEducation: {
      activeIeps: 1,
      activeGoals: 3,
      achievedGoals: 1,
      weeklyReportsDue: 1,
    },
    recentJourneys: [],
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('DashboardView authorized aggregate states', () => {
  it('renders loading and then an authorized empty recent-journey state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })),
    );
    render(<DashboardView />);
    expect(
      screen.getByText(/loading your authorized dashboard/i),
    ).toBeVisible();
    expect(
      await screen.findByText(
        /no learning journeys are available in your current scope/i,
      ),
    ).toBeVisible();
    expect(screen.getByText('2/3')).toBeVisible();
  });

  it('opens the weekly-report tracker without inventing a student target', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })),
    );
    render(<DashboardView />);
    fireEvent.click(
      await screen.findByRole('button', { name: /iep milestones/i }),
    );
    expect(navigateToWeeklyReportTracker).toHaveBeenCalledTimes(1);
  });

  it('shows an actionable error and retries the aggregate request', async () => {
    let attempts = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        attempts += 1;
        if (attempts === 1) throw new TypeError('offline');
        return new Response(JSON.stringify(payload), { status: 200 });
      }),
    );
    render(<DashboardView />);
    expect(
      await screen.findByRole('heading', {
        name: /dashboard could not be loaded/i,
      }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /retry dashboard/i }));
    expect(await screen.findByText('2/3')).toBeVisible();
    expect(attempts).toBe(2);
  });
});
