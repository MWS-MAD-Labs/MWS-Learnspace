import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useApp } from '@/src/context/AppContext';
import { useFEDCObservations } from '@/src/features/observations/hooks/useFEDCObservations';
import { useSensoryProfileObservations } from '@/src/features/observations/hooks/useSensoryProfileObservations';
import { useSFAObservations } from '@/src/features/observations/hooks/useSFAObservations';
import { ObservationHistoryViewer } from '@/src/features/observations/components/history/ObservationHistoryViewer';
import type { Student, User } from '@/src/types';

vi.mock('@/src/context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('@/src/features/observations/hooks/useFEDCObservations', () => ({
  useFEDCObservations: vi.fn(),
}));
vi.mock(
  '@/src/features/observations/hooks/useSensoryProfileObservations',
  () => ({ useSensoryProfileObservations: vi.fn() }),
);
vi.mock('@/src/features/observations/hooks/useSFAObservations', () => ({
  useSFAObservations: vi.fn(),
}));

const retryFedc = vi.fn();
const retrySensory = vi.fn();
const retrySfa = vi.fn();
const student = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Student A',
  fullName: 'Student A',
  specialNeedsFlag: true,
} as Student;
const currentUser = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Specialist One',
  role: 'SPECIALIST' as const,
} as User;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useApp).mockReturnValue({
    organizationId: '66666666-6666-4666-8666-666666666666',
  } as ReturnType<typeof useApp>);
  vi.mocked(useFEDCObservations).mockReturnValue({
    observations: [],
    status: 'ready',
    error: undefined,
    retry: retryFedc,
  });
  vi.mocked(useSensoryProfileObservations).mockReturnValue({
    observations: [],
    status: 'ready',
    error: undefined,
    retry: retrySensory,
  });
  vi.mocked(useSFAObservations).mockReturnValue({
    observations: [],
    status: 'ready',
    error: undefined,
    retry: retrySfa,
  });
});

describe('ObservationHistoryViewer', () => {
  it('disables every history hook until the student target is authorized', () => {
    render(
      <ObservationHistoryViewer
        student={student}
        currentUser={currentUser}
        historyEnabled={false}
      />,
    );

    expect(useFEDCObservations).toHaveBeenCalledWith(
      expect.any(String),
      student.id,
      { enabled: false },
    );
    expect(useSensoryProfileObservations).toHaveBeenCalledWith(
      expect.any(String),
      student.id,
      { enabled: false },
    );
    expect(useSFAObservations).toHaveBeenCalledWith(
      expect.any(String),
      student.id,
      { enabled: false },
    );
  });

  it('shows one consolidated history error and retries all failed histories', () => {
    vi.mocked(useFEDCObservations).mockReturnValue({
      observations: [],
      status: 'error',
      error: 'Forbidden',
      retry: retryFedc,
    });
    vi.mocked(useSensoryProfileObservations).mockReturnValue({
      observations: [],
      status: 'error',
      error: 'Forbidden',
      retry: retrySensory,
    });
    vi.mocked(useSFAObservations).mockReturnValue({
      observations: [],
      status: 'error',
      error: 'Forbidden',
      retry: retrySfa,
    });

    render(
      <ObservationHistoryViewer student={student} currentUser={currentUser} />,
    );

    expect(screen.getAllByText('Forbidden')).toHaveLength(1);
    expect(
      screen.queryByText(/No completed SFA observations/i),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retryFedc).toHaveBeenCalledOnce();
    expect(retrySensory).toHaveBeenCalledOnce();
    expect(retrySfa).toHaveBeenCalledOnce();
  });
});
