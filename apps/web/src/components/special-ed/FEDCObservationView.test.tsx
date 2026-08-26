import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useApp } from '../../context/AppContext';
import { useFEDCObservations } from '../../hooks/useFEDCObservations';
import { observationService } from '../../services/observationService';
import type { FEDCObservationRecord, ObservationAssignment } from '../../types';
import { FEDCObservationView } from './FEDCObservationView';

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../hooks/useFEDCObservations', () => ({
  useFEDCObservations: vi.fn(),
}));
vi.mock('../../services/observationService', () => ({
  observationService: {
    createFEDCObservation: vi.fn(),
    saveFEDCObservationDraft: vi.fn(),
    completeFEDCObservation: vi.fn(),
  },
}));

const organizationId = '11111111-1111-4111-8111-111111111111';
const assignmentId = '22222222-2222-4222-8222-222222222222';
const studentId = '33333333-3333-4333-8333-333333333333';
const observationId = '44444444-4444-4444-8444-444444444444';
const definitionBody = {
  milestones: [
    {
      id: 1,
      title: 'Regulation',
      maxScore: 3,
      items: [
        {
          id: 'fedc-1-1',
          number: '1.1',
          text: 'Maintains regulation.',
          milestoneId: 1,
        },
      ],
    },
  ],
};

const assignment: ObservationAssignment = {
  id: assignmentId,
  studentId,
  studentName: 'Student One',
  definitionId: '55555555-5555-4555-8555-555555555555',
  definitionVersion: 1,
  definitionBody,
  instrumentType: 'FEDC',
  instrumentTitle: 'FEDC Instrument',
  academicYear: '2026-2027',
  assignedToUserId: '66666666-6666-4666-8666-666666666666',
  assignedToUserName: 'Specialist One',
  dueDate: '2026-09-15',
  status: 'PENDING',
};

function observation(
  status: 'IN_PROGRESS' | 'COMPLETED',
): FEDCObservationRecord {
  return {
    id: observationId,
    organizationId,
    assignmentId,
    studentId,
    definition: {
      id: assignment.definitionId,
      key: 'fedc',
      version: 1,
      title: 'FEDC Instrument',
      body: definitionBody,
    },
    observationType: 'FEDC',
    recordYear: '2026',
    observationDate: '2026-08-26',
    observerId: assignment.assignedToUserId,
    observerName: 'Specialist One',
    status,
    responses: {},
    milestoneScores: { 1: 0 },
    totalScore: 0,
    maxPossibleScore: 3,
    completedAt: status === 'COMPLETED' ? '2026-08-26T12:00:00.000Z' : null,
    createdAt: '2026-08-26T10:00:00.000Z',
    updatedAt: '2026-08-26T10:00:00.000Z',
  };
}

const mockedUseApp = vi.mocked(useApp);
const mockedUseFEDCObservations = vi.mocked(useFEDCObservations);
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
  mockedUseFEDCObservations.mockReturnValue({
    observations: [],
    status: 'ready',
    error: undefined,
    retry: vi.fn(),
  });
  mockedObservationService.createFEDCObservation.mockResolvedValue(
    observation('IN_PROGRESS'),
  );
  mockedObservationService.completeFEDCObservation
    .mockRejectedValueOnce(
      new Error('Every item must be rated before completion.'),
    )
    .mockResolvedValueOnce({
      ...observation('COMPLETED'),
      responses: {
        'fedc-1-1': { itemId: 'fedc-1-1', rating: 'S', score: 3 },
      },
      milestoneScores: { 1: 3 },
      totalScore: 3,
    });
});

describe('FEDCObservationView', () => {
  it('retries completion against the created draft after initial validation failure', async () => {
    render(<FEDCObservationView assignment={assignment} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Complete Observation' }),
    );

    expect(
      await screen.findByText('Every item must be rated before completion.'),
    ).toBeVisible();
    expect(
      mockedObservationService.createFEDCObservation,
    ).toHaveBeenCalledTimes(1);
    expect(
      mockedObservationService.completeFEDCObservation,
    ).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'S' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Complete Observation' }),
    );

    await waitFor(() =>
      expect(
        mockedObservationService.completeFEDCObservation,
      ).toHaveBeenCalledTimes(2),
    );
    expect(
      mockedObservationService.createFEDCObservation,
    ).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(
        'This observation is completed. Scores and totals shown are server-derived.',
      ),
    ).toBeVisible();
  });
});
