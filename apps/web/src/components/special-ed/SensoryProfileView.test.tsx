import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useApp } from '../../context/AppContext';
import { useSensoryProfileObservations } from '../../hooks/useSensoryProfileObservations';
import { observationService } from '../../services/observationService';
import type { ObservationAssignment, SensoryProfileRecord } from '../../types';
import { SensoryProfileView } from './SensoryProfileView';

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../hooks/useSensoryProfileObservations', () => ({
  useSensoryProfileObservations: vi.fn(),
}));
vi.mock('../../services/observationService', () => ({
  observationService: {
    createSensoryObservation: vi.fn(),
    saveSensoryObservationDraft: vi.fn(),
    completeSensoryObservation: vi.fn(),
  },
}));

const organizationId = '11111111-1111-4111-8111-111111111111';
const assignmentId = '22222222-2222-4222-8222-222222222222';
const studentId = '33333333-3333-4333-8333-333333333333';
const observationId = '44444444-4444-4444-8444-444444444444';
const definitionBody = {
  items: [
    {
      id: 'sensory-1',
      number: 1,
      text: 'Pinned item wording from the assigned version.',
      section: 'Auditory',
    },
  ],
};

const assignment: ObservationAssignment = {
  id: assignmentId,
  studentId,
  studentName: 'Student One',
  definitionId: '55555555-5555-4555-8555-555555555555',
  definitionVersion: 3,
  definitionBody,
  instrumentType: 'SENSORY_PROFILE',
  instrumentTitle: 'Sensory Profile Instrument',
  academicYear: '2026-2027',
  assignedToUserId: '66666666-6666-4666-8666-666666666666',
  assignedToUserName: 'Specialist One',
  dueDate: '2026-09-15',
  status: 'PENDING',
};

function observation(
  status: 'IN_PROGRESS' | 'COMPLETED',
): SensoryProfileRecord {
  return {
    id: observationId,
    organizationId,
    assignmentId,
    studentId,
    definition: {
      id: assignment.definitionId,
      key: 'sensory-profile',
      version: 3,
      title: 'Sensory Profile Instrument',
      body: definitionBody,
    },
    observationType: 'SENSORY_PROFILE',
    recordYear: '2026',
    observationDate: '2026-08-26',
    observerId: assignment.assignedToUserId,
    observerName: 'Specialist One',
    status,
    responses: {},
    sectionScores: { auditory: { raw: 0, max: 5 } },
    totalRawScore: 0,
    maxPossibleScore: 5,
    teacherContactFrequency: '',
    teacherContactLength: '',
    completedAt: status === 'COMPLETED' ? '2026-08-26T12:00:00.000Z' : null,
    createdAt: '2026-08-26T10:00:00.000Z',
    updatedAt: '2026-08-26T10:00:00.000Z',
  };
}

const mockedUseApp = vi.mocked(useApp);
const mockedUseSensoryObservations = vi.mocked(useSensoryProfileObservations);
const mockedObservationService = vi.mocked(observationService);

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
  mockedUseSensoryObservations.mockReturnValue({
    observations: [],
    status: 'ready',
    error: undefined,
    retry: vi.fn(),
  });
  mockedObservationService.createSensoryObservation.mockResolvedValue(
    observation('IN_PROGRESS'),
  );
  mockedObservationService.completeSensoryObservation
    .mockRejectedValueOnce(
      new Error('Every item must be rated before completion.'),
    )
    .mockResolvedValueOnce({
      ...observation('COMPLETED'),
      responses: { 'sensory-1': 0 },
    });
});

describe('SensoryProfileView', () => {
  it('renders the pinned definition and retries completion using rating zero', async () => {
    render(<SensoryProfileView assignment={assignment} />);

    expect(
      screen.getByText('Pinned item wording from the assigned version.'),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole('button', { name: 'Complete Sensory Profile' }),
    );

    expect(
      await screen.findByText('Every item must be rated before completion.'),
    ).toBeVisible();
    expect(
      mockedObservationService.createSensoryObservation,
    ).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Rate 1 as 0' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Complete Sensory Profile' }),
    );

    await waitFor(() =>
      expect(
        mockedObservationService.completeSensoryObservation,
      ).toHaveBeenCalledTimes(2),
    );
    expect(
      mockedObservationService.createSensoryObservation,
    ).toHaveBeenCalledTimes(1);
    expect(
      mockedObservationService.completeSensoryObservation,
    ).toHaveBeenLastCalledWith(
      organizationId,
      assignmentId,
      expect.objectContaining({ responses: { 'sensory-1': 0 } }),
    );
    expect(
      await screen.findByText(
        'This observation is completed. Scores and totals shown are server-derived.',
      ),
    ).toBeVisible();
  });
});
