import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const session = {
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'principal@example.test',
    name: 'Demo Principal',
    avatarUrl: null,
    status: 'ACTIVE',
  },
  memberships: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      organizationId: '33333333-3333-4333-8333-333333333333',
      organizationName: 'Learnspace Demonstration School',
      role: 'PRINCIPAL',
      roleTitle: 'Principal',
      unitIds: [],
      gradeIds: [],
      subjectIds: [],
      assignedStudentIds: [],
      permissions: ['attendance:read', 'journey:review'],
    },
  ],
  expiresAt: '2026-08-21T00:00:00.000Z',
};

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

describe('App authentication shell', () => {
  it('does not render application data before authentication resolves', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined)),
    );
    render(<App />);

    expect(screen.getByText(/verifying your secure session/i)).toBeVisible();
    expect(screen.queryByText("Today's Attendance")).not.toBeInTheDocument();
  });

  it('renders the dashboard only after the session and authorized students load', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const payload = url.includes('/students')
        ? { data: [], meta: { count: 0 } }
        : session;
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    expect(
      await screen.findByRole('heading', {
        name: /good morning, demo principal/i,
      }),
    ).toBeVisible();
    expect(screen.getByText('Attendance workspace')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/v1/organizations/33333333-3333-4333-8333-333333333333/students',
      ),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(
      fetchMock.mock.calls.some(([input]) => String(input).includes('/staff')),
    ).toBe(false);
    expect(
      screen.queryByRole('button', { name: /simulate role/i }),
    ).not.toBeInTheDocument();
  });

  it('shows an actionable error and retries authorized student loading', async () => {
    let studentAttempts = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (!String(input).includes('/students')) {
          return new Response(JSON.stringify(session), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
        studentAttempts += 1;
        if (studentAttempts === 1) throw new TypeError('offline');
        return new Response(JSON.stringify({ data: [], meta: { count: 0 } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }),
    );
    render(<App />);

    expect(
      await screen.findByRole('heading', {
        name: /student data could not be loaded/i,
      }),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole('button', { name: /retry loading data/i }),
    );

    expect(
      await screen.findByRole('heading', {
        name: /good morning, demo principal/i,
      }),
    ).toBeVisible();
    expect(studentAttempts).toBe(2);
  });

  it('renders login instead of data when no session exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 401 })),
    );
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /sign in to learnspace/i }),
    ).toBeVisible();
    expect(screen.queryByText("Today's Attendance")).not.toBeInTheDocument();
  });

  it('renders the disabled-account state without loading a session', async () => {
    window.history.replaceState({}, '', '/?auth=disabled');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /account disabled/i }),
      ).toBeVisible(),
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Today's Attendance")).not.toBeInTheDocument();
  });
});
