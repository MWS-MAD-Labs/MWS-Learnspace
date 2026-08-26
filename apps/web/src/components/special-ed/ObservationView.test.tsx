import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useApp } from '../../context/AppContext';
import { useObservationData } from '../../hooks/useObservationData';
import type { ObservationAssignment } from '../../types';
import { ObservationView } from './ObservationView';

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../hooks/useObservationData', () => ({
  useObservationData: vi.fn(),
}));
vi.mock('./CoordinatorObservationManager', () => ({
  CoordinatorObservationManager: () => <div>Coordinator manager</div>,
}));
vi.mock('./ObservationHistoryViewer', () => ({
  ObservationHistoryViewer: () => <div>Observation history</div>,
}));
vi.mock('./FEDCObservationView', () => ({
  FEDCObservationView: ({
    assignment,
  }: {
    assignment: ObservationAssignment;
  }) => (
    <div data-testid="fedc-form">FEDC form for {assignment.studentName}</div>
  ),
}));
vi.mock('./SensoryProfileView', () => ({
  SensoryProfileView: () => <div>Sensory form</div>,
}));
vi.mock('./SFAObservationView', () => ({
  SFAObservationView: () => <div>SFA form</div>,
}));

const userId = '11111111-1111-4111-8111-111111111111';
const studentAId = '22222222-2222-4222-8222-222222222222';
const studentBId = '33333333-3333-4333-8333-333333333333';
const assignmentA: ObservationAssignment = {
  id: '44444444-4444-4444-8444-444444444444',
  studentId: studentAId,
  studentName: 'Student A',
  definitionId: '55555555-5555-4555-8555-555555555555',
  definitionVersion: 1,
  definitionBody: { milestones: [] },
  instrumentType: 'FEDC',
  instrumentTitle: 'FEDC Instrument',
  academicYear: '2026-2027',
  assignedToUserId: userId,
  assignedToUserName: 'Specialist One',
  dueDate: '2026-09-15',
  status: 'PENDING',
};

const mockedUseApp = vi.mocked(useApp);
const mockedUseObservationData = vi.mocked(useObservationData);

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseApp.mockReturnValue({
    organizationId: '66666666-6666-4666-8666-666666666666',
    currentUser: {
      id: userId,
      name: 'Specialist One',
      role: 'SPECIALIST',
      assignedSpecialNeedsStudentIds: [studentAId, studentBId],
    },
    students: [
      {
        id: studentAId,
        name: 'Student A',
        fullName: 'Student A',
        specialNeedsFlag: true,
      },
      {
        id: studentBId,
        name: 'Student B',
        fullName: 'Student B',
        specialNeedsFlag: true,
      },
    ],
    selectedStudentId: studentAId,
    setSelectedStudentId: vi.fn(),
    specialEdSubTab: 'FEDC',
    setSpecialEdSubTab: vi.fn(),
    navigateToIEP: vi.fn(),
    setActiveTab: vi.fn(),
  } as unknown as ReturnType<typeof useApp>);
  mockedUseObservationData.mockReturnValue({
    definitions: [],
    assignments: [assignmentA],
    status: 'ready',
    error: undefined,
    retry: vi.fn(),
  });
});

describe('ObservationView', () => {
  it('does not retain another student’s active FEDC assignment after switching students', () => {
    render(<ObservationView />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Open assigned FEDC form' }),
    );
    expect(screen.getByTestId('fedc-form')).toHaveTextContent(
      'FEDC form for Student A',
    );

    fireEvent.click(
      document.querySelector(`#gpk-switch-student-${studentBId}`)!,
    );

    expect(screen.queryByTestId('fedc-form')).not.toBeInTheDocument();
    expect(
      screen.getByText('No active FEDC assignment for this student'),
    ).toBeVisible();
  });
});
