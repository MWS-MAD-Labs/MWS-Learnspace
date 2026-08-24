import React, { useEffect } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider, useApp } from './AppContext';
import { studentAdministrationService } from '../services/studentAdministrationService';
import type { User } from '../types';

vi.mock('../services/studentAdministrationService', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('../services/studentAdministrationService')
    >();
  return {
    ...actual,
    studentAdministrationService: {
      ...actual.studentAdministrationService,
      getStudents: vi.fn(),
      getStaff: vi.fn(),
    },
  };
});

const authenticatedUser: User = {
  id: '11111111-1111-4111-8111-111111111111',
  membershipId: '22222222-2222-4222-8222-222222222222',
  name: 'Coordinator',
  email: 'coordinator@example.test',
  role: 'SPECIAL_ED_COORDINATOR',
  roleTitle: 'Special Education Coordinator',
  unitIds: [],
  gradeIds: [],
  subjectIds: [],
  permissions: ['staff-directory:read'],
};

const emptyStudents = { data: [], meta: { count: 0 } };
const emptyStaff = { data: [], meta: { count: 0 } };

function RefreshHarness({ onMount }: { onMount: () => void }) {
  const { refreshData } = useApp();
  useEffect(onMount, [onMount]);
  return (
    <div>
      <span>Administration workspace</span>
      <button onClick={() => void refreshData()}>Refresh data</button>
    </div>
  );
}

describe('AppProvider administration refresh', () => {
  beforeEach(() => {
    vi.mocked(studentAdministrationService.getStudents).mockReset();
    vi.mocked(studentAdministrationService.getStaff).mockReset();
  });

  it('keeps children mounted during a refresh after the initial load', async () => {
    let resolveRefresh: ((value: typeof emptyStudents) => void) | undefined;
    vi.mocked(studentAdministrationService.getStudents)
      .mockResolvedValueOnce(emptyStudents)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          }),
      );
    vi.mocked(studentAdministrationService.getStaff).mockResolvedValue(
      emptyStaff,
    );
    const onMount = vi.fn();

    render(
      <AppProvider
        authenticatedUser={authenticatedUser}
        organizationId="33333333-3333-4333-8333-333333333333"
      >
        <RefreshHarness onMount={onMount} />
      </AppProvider>,
    );

    expect(await screen.findByText('Administration workspace')).toBeVisible();
    expect(onMount).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh data' }));

    await waitFor(() =>
      expect(studentAdministrationService.getStudents).toHaveBeenCalledTimes(2),
    );
    expect(screen.getByText('Administration workspace')).toBeVisible();
    expect(onMount).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRefresh?.(emptyStudents);
    });
    expect(screen.getByText('Administration workspace')).toBeVisible();
    expect(onMount).toHaveBeenCalledTimes(1);
  });

  it('shows a non-blocking error when a later refresh fails', async () => {
    vi.mocked(studentAdministrationService.getStudents)
      .mockResolvedValueOnce(emptyStudents)
      .mockRejectedValueOnce(new Error('The server could not be reached.'));
    vi.mocked(studentAdministrationService.getStaff).mockResolvedValue(
      emptyStaff,
    );
    const onMount = vi.fn();

    render(
      <AppProvider
        authenticatedUser={authenticatedUser}
        organizationId="33333333-3333-4333-8333-333333333333"
      >
        <RefreshHarness onMount={onMount} />
      </AppProvider>,
    );

    expect(await screen.findByText('Administration workspace')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh data' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Refresh failed',
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The server could not be reached.',
    );
    expect(screen.getByText('Administration workspace')).toBeVisible();
    expect(onMount).toHaveBeenCalledTimes(1);
  });
});
