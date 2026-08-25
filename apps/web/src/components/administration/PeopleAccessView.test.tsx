import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../context/AuthContext';
import { organizationAdministrationService } from '../../services/organizationAdministrationService';
import { PeopleAccessView } from './PeopleAccessView';

vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../services/organizationAdministrationService', () => ({
  organizationAdministrationService: {
    getAccounts: vi.fn(),
    getUnits: vi.fn(),
    getGrades: vi.fn(),
    getSubjects: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
  },
}));

const organizationId = '11111111-1111-4111-8111-111111111111';
const unitId = '22222222-2222-4222-8222-222222222222';
const gradeId = '33333333-3333-4333-8333-333333333333';
const account = {
  membershipId: '44444444-4444-4444-8444-444444444444',
  organizationId,
  userId: '55555555-5555-4555-8555-555555555555',
  email: 'director@example.test',
  displayName: 'Director One',
  avatarUrl: null,
  userStatus: 'ACTIVE' as const,
  role: 'DIRECTOR' as const,
  roleTitle: 'Director',
  membershipStatus: 'ACTIVE' as const,
  unitIds: [],
  gradeIds: [],
  subjectIds: [],
  updatedAt: '2026-08-24T00:00:00.000Z',
};
const mockedUseAuth = vi.mocked(useAuth);
const service = vi.mocked(organizationAdministrationService);

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    status: 'authenticated',
    currentUser: {
      id: account.userId,
      name: account.displayName,
      email: account.email,
      role: 'DIRECTOR',
      roleTitle: 'Director',
      unitIds: [],
      gradeIds: [],
      subjectIds: [],
      permissions: ['organization:admin'],
    },
    session: {
      user: {
        id: account.userId,
        name: account.displayName,
        email: account.email,
        avatarUrl: null,
        status: 'ACTIVE',
      },
      memberships: [
        {
          id: account.membershipId,
          organizationId,
          organizationName: 'Learnspace School',
          role: 'DIRECTOR',
          roleTitle: 'Director',
          unitIds: [],
          gradeIds: [],
          subjectIds: [],
          assignedStudentIds: [],
          permissions: ['organization:admin'],
        },
      ],
      expiresAt: '2026-08-25T00:00:00.000Z',
    },
    login: vi.fn(),
    logout: vi.fn(),
    retry: vi.fn(),
  });
  service.getAccounts.mockResolvedValue({
    data: [account],
    meta: { count: 1 },
  });
  service.getUnits.mockResolvedValue({
    data: [
      { id: unitId, organizationId, code: 'ELEMENTARY', name: 'Elementary' },
    ],
    meta: { count: 1 },
  });
  service.getGrades.mockResolvedValue({
    data: [
      {
        id: gradeId,
        organizationId,
        unitId,
        code: 'G1',
        name: 'Grade 1',
        position: 1,
      },
    ],
    meta: { count: 1 },
  });
  service.getSubjects.mockResolvedValue({ data: [], meta: { count: 0 } });
});

describe('PeopleAccessView', () => {
  it('loads accounts and creates a scoped grade-teacher membership', async () => {
    const created = {
      ...account,
      membershipId: '66666666-6666-4666-8666-666666666666',
      userId: '77777777-7777-4777-8777-777777777777',
      email: 'teacher@example.test',
      displayName: 'Teacher One',
      role: 'GRADE_TEACHER' as const,
      roleTitle: 'Grade 1 Teacher',
      unitIds: [unitId],
      gradeIds: [gradeId],
    };
    service.createAccount.mockResolvedValue({ data: created });
    render(<PeopleAccessView />);

    expect(
      await screen.findByRole('heading', { name: 'People & access' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'New account' }));
    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: 'Teacher One' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'teacher@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Role title'), {
      target: { value: 'Grade 1 Teacher' },
    });
    fireEvent.click(screen.getByLabelText('Elementary'));
    fireEvent.click(screen.getByLabelText('Grade 1'));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(service.createAccount).toHaveBeenCalledWith(organizationId, {
        email: 'teacher@example.test',
        displayName: 'Teacher One',
        role: 'GRADE_TEACHER',
        roleTitle: 'Grade 1 Teacher',
        unitIds: [unitId],
        gradeIds: [gradeId],
        subjectIds: [],
      }),
    );
    expect(await screen.findByText('Account access created.')).toBeVisible();
  });

  it('renders save failures as errors rather than success feedback', async () => {
    service.updateAccount.mockRejectedValue(
      new Error('You cannot disable your own administration access.'),
    );
    render(<PeopleAccessView />);

    await screen.findByRole('heading', { name: 'People & access' });
    fireEvent.click(screen.getByRole('button', { name: /Director One/ }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Save access changes' }),
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'You cannot disable your own administration access.',
    );
    expect(alert).toHaveClass('bg-rose-50');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('aborts in-flight account loading when the view unmounts', () => {
    let signal: AbortSignal | undefined;
    service.getAccounts.mockImplementation((_organizationId, requestSignal) => {
      signal = requestSignal;
      return new Promise(() => undefined);
    });
    const { unmount } = render(<PeopleAccessView />);

    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it('renders a denied state without loading data for non-admin memberships', () => {
    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
      currentUser: { ...mockedUseAuth().currentUser!, permissions: [] },
      session: {
        ...mockedUseAuth().session!,
        memberships: [
          { ...mockedUseAuth().session!.memberships[0], permissions: [] },
        ],
      },
    });

    render(<PeopleAccessView />);

    expect(
      screen.getByRole('heading', { name: 'People & access denied' }),
    ).toBeVisible();
    expect(service.getAccounts).not.toHaveBeenCalled();
  });
});
