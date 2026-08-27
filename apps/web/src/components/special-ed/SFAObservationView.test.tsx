import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useApp } from '../../context/AppContext';
import { useSFAObservations } from '../../hooks/useSFAObservations';
import { observationService } from '../../services/observationService';
import type { ObservationAssignment, SFAObservationRecord } from '../../types';
import { SFAObservationView } from './SFAObservationView';

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../hooks/useSFAObservations', () => ({
  useSFAObservations: vi.fn(),
}));
vi.mock('../../services/observationService', () => ({
  observationService: {
    getStudentSFAObservations: vi.fn(),
    createSFAObservation: vi.fn(),
    saveSFAObservationDraft: vi.fn(),
    completeSFAObservation: vi.fn(),
    getStudentSFAReference: vi.fn(),
  },
}));

const organizationId = '11111111-1111-4111-8111-111111111111';
const assignmentId = '22222222-2222-4222-8222-222222222222';
const studentId = '33333333-3333-4333-8333-333333333333';
const observationId = '44444444-4444-4444-8444-444444444444';
const definitionBody = {
  participationItems: [
    {
      id: 'classroom',
      label: 'Pinned classroom participation wording',
      description: 'Assigned definition version detail.',
    },
  ],
  taskSupportItems: [
    { id: 'physical-support', label: 'Pinned physical support' },
  ],
  activityPerformanceItems: [
    { id: 'travel', label: 'Pinned travel performance' },
  ],
  adaptationOptions: [
    { id: 'visual-schedule', label: 'Pinned visual schedule' },
  ],
};

const assignment: ObservationAssignment = {
  id: assignmentId,
  studentId,
  studentName: 'Student One',
  definitionId: '55555555-5555-4555-8555-555555555555',
  definitionVersion: 4,
  definitionBody,
  instrumentType: 'SFA',
  instrumentTitle: 'School Function Assessment',
  academicYear: '2026-2027',
  assignedToUserId: '66666666-6666-4666-8666-666666666666',
  assignedToUserName: 'Specialist One',
  dueDate: '2026-09-15',
  status: 'PENDING',
};

function observation(
  status: 'IN_PROGRESS' | 'COMPLETED',
  overrides: Partial<SFAObservationRecord> = {},
): SFAObservationRecord {
  return {
    id: observationId,
    organizationId,
    assignmentId,
    studentId,
    definition: {
      id: assignment.definitionId,
      key: 'sfa',
      version: assignment.definitionVersion,
      title: 'School Function Assessment',
      body: definitionBody,
    },
    observationType: 'SFA',
    recordYear: '2026',
    assessmentDate: '2026-08-27',
    observationDate: undefined,
    observerId: assignment.assignedToUserId,
    observerName: 'Specialist One',
    coordinatorName: '',
    status,
    programRecommendation: 'Regular',
    respondents: [],
    primaryLanguage: '',
    writingMethod: '',
    mobilityMethod: '',
    conditionsAffectingPerformance: '',
    participationScores: {},
    totalParticipationRawScore: 0,
    participationAverage: 0,
    taskSupports: {},
    activityPerformance: {},
    adaptations: [],
    completedAt: status === 'COMPLETED' ? '2026-08-27T12:00:00.000Z' : null,
    createdAt: '2026-08-27T10:00:00.000Z',
    updatedAt: '2026-08-27T10:00:00.000Z',
    ...overrides,
  };
}

const mockedUseApp = vi.mocked(useApp);
const mockedUseSFAObservations = vi.mocked(useSFAObservations);
const mockedService = vi.mocked(observationService);

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseApp.mockReturnValue({
    organizationId,
    students: [
      {
        id: studentId,
        fullName: 'Student One',
        name: 'Student One',
        avatarUrl: null,
      },
    ],
    currentUser: { id: assignment.assignedToUserId, name: 'Specialist One' },
    showToast: vi.fn(),
    navigateToIEP: vi.fn(),
  } as unknown as ReturnType<typeof useApp>);
  mockedUseSFAObservations.mockReturnValue({
    observations: [],
    status: 'ready',
    error: undefined,
    retry: vi.fn(),
  });
  mockedService.createSFAObservation.mockResolvedValue(
    observation('IN_PROGRESS'),
  );
  mockedService.saveSFAObservationDraft.mockResolvedValue(
    observation('IN_PROGRESS'),
  );
});

describe('SFAObservationView', () => {
  it('renders the pinned definition, creates a partial draft, and retries completion', async () => {
    mockedService.completeSFAObservation
      .mockRejectedValueOnce(
        new Error(
          'Every participation, task support, and activity item is required.',
        ),
      )
      .mockResolvedValueOnce(
        observation('COMPLETED', {
          participationScores: {
            classroom: 6,
          } as SFAObservationRecord['participationScores'],
          taskSupports: {
            'physical-support': 4,
          } as SFAObservationRecord['taskSupports'],
          activityPerformance: { travel: 4 },
          totalParticipationRawScore: 6,
          participationAverage: 6,
        }),
      );

    render(<SFAObservationView assignment={assignment} />);

    expect(
      await screen.findByText('Pinned classroom participation wording'),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    await waitFor(() =>
      expect(mockedService.createSFAObservation).toHaveBeenCalledWith(
        organizationId,
        assignmentId,
        expect.objectContaining({
          participationScores: {},
          taskSupports: {},
          activityPerformance: {},
        }),
      ),
    );
    const createCommand = mockedService.createSFAObservation.mock.calls[0][2];
    expect(createCommand).not.toHaveProperty('primaryLanguage');
    expect(createCommand).not.toHaveProperty('writingMethod');
    expect(createCommand).not.toHaveProperty('mobilityMethod');
    expect(createCommand).not.toHaveProperty('conditionsAffectingPerformance');

    fireEvent.click(
      screen.getByRole('button', { name: 'Complete SFA Assessment' }),
    );
    expect(
      await screen.findByText(
        'Every participation, task support, and activity item is required.',
      ),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Rate Pinned classroom participation wording as 6',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Task Supports' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Rate Pinned physical support as 4' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Activity Performance' }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Rate Pinned travel performance as 4',
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Complete SFA Assessment' }),
    );

    await waitFor(() =>
      expect(mockedService.completeSFAObservation).toHaveBeenCalledTimes(2),
    );
    expect(mockedService.completeSFAObservation).toHaveBeenLastCalledWith(
      organizationId,
      assignmentId,
      expect.objectContaining({
        participationScores: { classroom: 6 },
        taskSupports: { 'physical-support': 4 },
        activityPerformance: { travel: 4 },
      }),
    );
    expect(
      await screen.findByText(
        'This SFA is completed and locked. Totals shown are server-derived.',
      ),
    ).toBeVisible();
    expect(screen.getByText('6', { selector: 'span.text-xl' })).toBeVisible();
  });

  it('reloads and locks a completed assignment record with authoritative totals', async () => {
    mockedUseSFAObservations.mockReturnValue({
      observations: [
        observation('COMPLETED', {
          participationScores: {
            classroom: 5,
          } as SFAObservationRecord['participationScores'],
          totalParticipationRawScore: 5,
          participationAverage: 5,
        }),
      ],
      status: 'ready',
      error: undefined,
      retry: vi.fn(),
    });

    render(<SFAObservationView assignment={assignment} />);

    expect(
      await screen.findByText(
        'This SFA is completed and locked. Totals shown are server-derived.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Complete SFA Assessment' }),
    ).toBeDisabled();
    expect(screen.getByText('/ 6')).toBeVisible();
    expect(screen.getByText('Average 5.00 / 6')).toBeVisible();
  });
});
