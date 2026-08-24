import { render, screen, waitFor } from '@testing-library/react';
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

  it('renders the dashboard only after a valid API session loads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify(session), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );
    render(<App />);

    expect(
      await screen.findByRole('heading', {
        name: /good morning, demo principal/i,
      }),
    ).toBeVisible();
    expect(screen.getByText("Today's Attendance")).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /simulate role/i }),
    ).not.toBeInTheDocument();
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
