import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';

const navigateToWeeklyReport = vi.fn();
const navigateToObservation = vi.fn();
const navigateToIEP = vi.fn();
const navigateToAttendanceStudent = vi.fn();
const setSearchQuery = vi.fn();
let searchQuery = '';
let currentPermissions = ['special-ed:read'];
let currentRole = 'SPECIAL_ED_TEACHER';
let currentGradeIds: string[] = [];

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    logout: vi.fn(),
    session: { memberships: [{ permissions: [] }] },
  }),
}));

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    organizationId: '11111111-1111-4111-8111-111111111111',
    currentUser: {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Teacher',
      role: currentRole,
      roleTitle: 'Special Education Teacher',
      permissions: currentPermissions,
      unitIds: [],
      gradeIds: currentGradeIds,
    },
    allUsers: [],
    activeTab: 'DASHBOARD',
    setActiveTab: vi.fn(),
    specialEdSubTab: 'FEDC',
    setSpecialEdSubTab: vi.fn(),
    searchQuery,
    setSearchQuery: (value: string) => {
      searchQuery = value;
      setSearchQuery(value);
    },
    navigateToJourneyEditor: vi.fn(),
    navigateToIEP,
    navigateToWeeklyReport,
    navigateToObservation,
    navigateToAttendanceStudent,
    setSelectedStudentId: vi.fn(),
  }),
}));

afterEach(() => {
  searchQuery = '';
  currentPermissions = ['special-ed:read'];
  currentRole = 'SPECIAL_ED_TEACHER';
  currentGradeIds = [];
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('AppShell aggregate navigation', () => {
  it('fetches notification action items before the dropdown opens', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/notifications')) {
        return new Response(
          JSON.stringify({
            data: [],
            meta: { count: 0 },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          data: [],
          meta: { count: 0, limit: 10, offset: 0, hasMore: false },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    await vi.waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/notifications'),
        expect.objectContaining({ method: 'GET' }),
      ),
    );
  });

  it('routes an attendance student result to its authorized class and roster', async () => {
    currentPermissions = ['attendance:read'];
    currentRole = 'GRADE_TEACHER';
    currentGradeIds = ['99999999-9999-4999-8999-999999999999'];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('/notifications')) {
          return new Response(
            JSON.stringify({ data: [], meta: { count: 0 } }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            data: [
              {
                id: '44444444-4444-4444-8444-444444444444',
                kind: 'STUDENT',
                title: 'Student One',
                subtitle: 'Student · S-001',
                studentId: '44444444-4444-4444-8444-444444444444',
                classId: '99999999-9999-4999-8999-999999999999',
                updatedAt: '2026-08-27T12:00:00.000Z',
              },
            ],
            meta: { count: 1, limit: 10, offset: 0, hasMore: false },
          }),
          { status: 200 },
        );
      }),
    );
    const { rerender } = render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );
    fireEvent.change(screen.getByRole('combobox', { name: /global search/i }), {
      target: { value: 'student one' },
    });
    rerender(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );
    fireEvent.click(
      await screen.findByRole('option', { name: /student one/i }),
    );
    expect(navigateToAttendanceStudent).toHaveBeenCalledWith(
      '44444444-4444-4444-8444-444444444444',
      '99999999-9999-4999-8999-999999999999',
    );
  });

  it('routes a special-ed-only student result to the observation workspace', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('/notifications')) {
          return new Response(
            JSON.stringify({
              data: [],
              meta: { count: 0 },
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            data: [
              {
                id: '44444444-4444-4444-8444-444444444444',
                kind: 'STUDENT',
                title: 'Student One',
                subtitle: 'Student · S-001',
                studentId: '44444444-4444-4444-8444-444444444444',
                classId: '99999999-9999-4999-8999-999999999999',
                updatedAt: '2026-08-27T12:00:00.000Z',
              },
            ],
            meta: { count: 1, limit: 10, offset: 0, hasMore: false },
          }),
          { status: 200 },
        );
      }),
    );
    const { rerender } = render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );
    fireEvent.change(screen.getByRole('combobox', { name: /global search/i }), {
      target: { value: 'student one' },
    });
    rerender(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    fireEvent.click(
      await screen.findByRole('option', { name: /student one/i }),
    );
    expect(navigateToObservation).toHaveBeenCalledWith(
      '44444444-4444-4444-8444-444444444444',
    );
  });

  it('routes a coordinator student result to that student’s all-results view', async () => {
    currentRole = 'SPECIAL_ED_COORDINATOR';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('/notifications')) {
          return new Response(
            JSON.stringify({ data: [], meta: { count: 0 } }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            data: [
              {
                id: '44444444-4444-4444-8444-444444444444',
                kind: 'STUDENT',
                title: 'Student One',
                subtitle: 'Student · S-001',
                studentId: '44444444-4444-4444-8444-444444444444',
                updatedAt: '2026-08-27T12:00:00.000Z',
              },
            ],
            meta: { count: 1, limit: 10, offset: 0, hasMore: false },
          }),
          { status: 200 },
        );
      }),
    );
    const { rerender } = render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );
    fireEvent.change(screen.getByRole('combobox', { name: /global search/i }), {
      target: { value: 'student one' },
    });
    rerender(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    fireEvent.click(
      await screen.findByRole('option', { name: /student one/i }),
    );
    expect(navigateToObservation).toHaveBeenCalledWith(
      '44444444-4444-4444-8444-444444444444',
      'FEDC',
      undefined,
      'ALL_RESULTS',
    );
  });

  it('supports arrow navigation and Escape dismissal in the search combobox', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('/notifications')) {
          return new Response(
            JSON.stringify({ data: [], meta: { count: 0 } }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            data: [
              {
                id: '77777777-7777-4777-8777-777777777777',
                kind: 'STUDENT',
                title: 'First Student',
                subtitle: 'Student · S-001',
                studentId: '77777777-7777-4777-8777-777777777777',
                updatedAt: '2026-08-27T12:00:00.000Z',
              },
              {
                id: '88888888-8888-4888-8888-888888888888',
                kind: 'STUDENT',
                title: 'Second Student',
                subtitle: 'Student · S-002',
                studentId: '88888888-8888-4888-8888-888888888888',
                updatedAt: '2026-08-26T12:00:00.000Z',
              },
            ],
            meta: { count: 2, limit: 10, offset: 0, hasMore: false },
          }),
          { status: 200 },
        );
      }),
    );
    const { rerender } = render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );
    const combobox = screen.getByRole('combobox', { name: /global search/i });
    fireEvent.change(combobox, { target: { value: 'student' } });
    rerender(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );
    await screen.findByRole('option', { name: /second student/i });
    await waitFor(() =>
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        'global-search-option-0',
      ),
    );

    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    expect(combobox).toHaveAttribute(
      'aria-activedescendant',
      'global-search-option-1',
    );
    fireEvent.keyDown(combobox, { key: 'ArrowUp' });
    expect(combobox).toHaveAttribute(
      'aria-activedescendant',
      'global-search-option-0',
    );
    fireEvent.keyDown(combobox, { key: 'Escape' });
    rerender(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );
    expect(combobox).toHaveValue('');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens the exact weekly report returned by global search', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: [
                {
                  id: '33333333-3333-4333-8333-333333333333',
                  kind: 'WEEKLY_REPORT',
                  title: 'Student One · Week 14',
                  subtitle: 'Weekly Report · 2026',
                  studentId: '44444444-4444-4444-8444-444444444444',
                  parentId: '55555555-5555-4555-8555-555555555555',
                  state: 'DRAFT',
                  updatedAt: '2026-08-27T12:00:00.000Z',
                },
              ],
              meta: { count: 1, limit: 10, offset: 0, hasMore: false },
            }),
            { status: 200 },
          ),
      ),
    );
    const { rerender } = render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );
    fireEvent.change(screen.getByRole('combobox', { name: /global search/i }), {
      target: { value: 'week 14' },
    });
    rerender(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    const option = await screen.findByRole('option', {
      name: /student one · week 14/i,
    });
    expect(
      screen.getByRole('listbox', { name: /global search results/i }),
    ).toContainElement(option);
    const combobox = screen.getByRole('combobox', { name: /global search/i });
    await waitFor(() =>
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        'global-search-option-0',
      ),
    );
    fireEvent.keyDown(combobox, {
      key: 'Enter',
    });
    expect(navigateToWeeklyReport).toHaveBeenCalledWith(
      '44444444-4444-4444-8444-444444444444',
      '33333333-3333-4333-8333-333333333333',
    );
  });

  it('opens the exact observation assignment and instrument from notifications', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: [
                {
                  id: 'observation-due:66666666-6666-4666-8666-666666666666',
                  kind: 'OBSERVATION_DUE',
                  title: 'Observation Action Required',
                  message: 'Sensory Profile for Student One is due 2026-08-28.',
                  occurredAt: '2026-08-27T12:00:00.000Z',
                  target: {
                    tab: 'SPECIAL_ED_OBSERVATION',
                    recordId: '66666666-6666-4666-8666-666666666666',
                    studentId: '44444444-4444-4444-8444-444444444444',
                    observationType: 'SENSORY_PROFILE',
                  },
                },
              ],
              meta: { count: 1 },
            }),
            { status: 200 },
          ),
      ),
    );
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    fireEvent.click(
      await screen.findByRole('button', {
        name: /observation action required/i,
      }),
    );

    expect(navigateToObservation).toHaveBeenCalledWith(
      '44444444-4444-4444-8444-444444444444',
      'SENSORY_PROFILE',
      '66666666-6666-4666-8666-666666666666',
    );
  });
});
