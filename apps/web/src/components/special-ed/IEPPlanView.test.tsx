import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useApp } from '../../context/AppContext';
import { useIEPs } from '../../hooks/useIEPs';
import type { IEPRecord } from '../../types';
import { IEPPlanView } from './IEPPlanView';

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../hooks/useIEPs', () => ({ useIEPs: vi.fn() }));
vi.mock('../../services/iepService', () => ({
  iepService: { createIEP: vi.fn(), updateIEP: vi.fn() },
}));
vi.mock('./IEPStatusTracker', () => ({
  IEPStatusTracker: () => <div>IEP tracker</div>,
}));

const organizationId = '11111111-1111-4111-8111-111111111111';
const studentId = '22222222-2222-4222-8222-222222222222';

const approvedIEP: IEPRecord = {
  id: '33333333-3333-4333-8333-333333333333',
  organizationId,
  studentId,
  state: 'ACTIVE',
  year: '2026',
  academicYear: '2026-2027',
  semester: 'Semester 1',
  unit: 'Elementary',
  status: 'Active',
  draftStatus: 'Done',
  coordinatorReviewStatus: 'Done',
  directorApprovalStatus: 'Done',
  workflowHistory: [],
  consideration: 'Individual support',
  primaryClassification: 'Autism spectrum',
  currentPlacement: 'General education with support',
  teamMembers: [],
  performanceAreas: [],
  academicAccommodations: {},
  instructionalAccommodations: [],
  environmentalAccommodations: [],
  assessmentAccommodations: [],
  goals: [],
  serviceSchedule: [],
  progressMeasurementMethods: [],
  parentCommunicationMethods: [],
  homePartnershipSupport: '',
  homePartnershipRecommendations: '',
  parentApproval: {
    agreed: true,
    parentName: 'Parent One',
    date: '2026-08-20',
  },
  createdBy: '44444444-4444-4444-8444-444444444444',
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedBy: '44444444-4444-4444-8444-444444444444',
  updatedAt: '2026-08-21T10:00:00.000Z',
};

const mockedUseApp = vi.mocked(useApp);
const mockedUseIEPs = vi.mocked(useIEPs);

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseApp.mockReturnValue({
    organizationId,
    selectedStudentId: studentId,
    setSelectedStudentId: vi.fn(),
    students: [
      {
        id: studentId,
        fullName: 'Student One',
        name: 'Student One',
        grade: 'Grade 1',
        specialNeedsFlag: true,
      },
    ],
    currentUser: {
      id: '44444444-4444-4444-8444-444444444444',
      name: 'Coordinator One',
      role: 'SPECIAL_ED_COORDINATOR',
      isSpecialEdCoordinator: true,
      permissions: [],
    },
    toggleObservationDrawer: vi.fn(),
    showToast: vi.fn(),
    refreshData: vi.fn(),
    navigateToWeeklyReport: vi.fn(),
  } as unknown as ReturnType<typeof useApp>);
});

describe('IEPPlanView', () => {
  it('shows API errors and retries loading', () => {
    const retry = vi.fn();
    mockedUseIEPs.mockReturnValue({
      ieps: [],
      status: 'error',
      error: 'IEP access denied.',
      retry,
    });

    render(<IEPPlanView />);

    expect(screen.getByText('IEP access denied.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('renders non-draft plans as read-only', () => {
    mockedUseIEPs.mockReturnValue({
      ieps: [approvedIEP],
      status: 'ready',
      error: undefined,
      retry: vi.fn(),
    });

    render(<IEPPlanView />);

    expect(screen.getByText(/read-only/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Profile & Team' }));
    expect(screen.getByDisplayValue('Individual support')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Save IEP Plan' }),
    ).toBeDisabled();
  });
});
