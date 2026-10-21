import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useApp } from '@/src/context/AppContext';
import { useObservationData } from '@/src/features/observations/hooks/useObservationData';
import type { ObservationAssignment } from '@/src/types';
import { ObservationPage } from '@/src/features/observations/pages/ObservationPage';

vi.mock('@/src/context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('@/src/features/observations/hooks/useObservationData', () => ({
  useObservationData: vi.fn(),
}));
vi.mock('@/src/features/observations/pages/ObservationManagementPage', () => ({
  ObservationManagementPage: () => <div>Coordinator manager</div>,
}));
vi.mock(
  '@/src/features/observations/components/history/ObservationHistoryViewer',
  () => ({
    ObservationHistoryViewer: ({ student }: { student: { name: string } }) => (
      <div>Observation history for {student.name}</div>
    ),
  }),
);
vi.mock(
  '@/src/features/observations/components/fedc/FEDCObservationView',
  () => ({
    FEDCObservationView: ({
      assignment,
    }: {
      assignment: ObservationAssignment;
    }) => (
      <div data-testid="fedc-form">FEDC form for {assignment.studentName}</div>
    ),
  }),
);
vi.mock(
  '@/src/features/observations/components/sensory-profile/SensoryProfileView',
  () => ({
    SensoryProfileView: ({
      assignment,
    }: {
      assignment: ObservationAssignment;
    }) => (
      <div data-testid="sensory-form">
        Sensory form for {assignment.studentName}
      </div>
    ),
  }),
);
vi.mock(
  '@/src/features/observations/components/sfa/SFAObservationView',
  () => ({
    SFAObservationView: ({
      assignment,
    }: {
      assignment: ObservationAssignment;
    }) => (
      <div data-testid="sfa-form">SFA form for {assignment.studentName}</div>
    ),
  }),
);

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
const sensoryAssignmentA: ObservationAssignment = {
  ...assignmentA,
  id: '77777777-7777-4777-8777-777777777777',
  definitionId: '88888888-8888-4888-8888-888888888888',
  definitionBody: { sections: [] },
  instrumentType: 'SENSORY_PROFILE',
  instrumentTitle: 'Sensory Profile Instrument',
};
const sfaAssignmentA: ObservationAssignment = {
  ...assignmentA,
  id: '99999999-9999-4999-8999-999999999999',
  definitionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  definitionBody: {
    participationItems: [{ id: 'participation', label: 'Participation' }],
    taskSupportItems: [{ id: 'support', label: 'Support' }],
    activityPerformanceItems: [{ id: 'activity', label: 'Activity' }],
    adaptationOptions: [],
  },
  instrumentType: 'SFA',
  instrumentTitle: 'School Function Assessment',
};

const mockedUseApp = vi.mocked(useApp);
const mockedUseObservationData = vi.mocked(useObservationData);
let activeSpecialEdSubTab: 'FEDC' | 'SENSORY_PROFILE' | 'SFA';
let selectedObservationAssignmentId: string | null;
let appContextValue: ReturnType<typeof useApp>;
const setSelectedObservationAssignmentId = vi.fn((value: string | null) => {
  selectedObservationAssignmentId = value;
});

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}

function renderPage(entry = '/observations') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ObservationPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  activeSpecialEdSubTab = 'FEDC';
  selectedObservationAssignmentId = null;
  appContextValue = {
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
    setSelectedStudentId: vi.fn((studentId: string) => {
      appContextValue = { ...appContextValue, selectedStudentId: studentId };
    }),
    specialEdSubTab: activeSpecialEdSubTab,
    setSpecialEdSubTab: vi.fn((tab) => {
      activeSpecialEdSubTab = tab;
    }),
    selectedObservationAssignmentId,
    setSelectedObservationAssignmentId,
    navigateToIEP: vi.fn(),
    setActiveTab: vi.fn(),
  } as unknown as ReturnType<typeof useApp>;
  mockedUseApp.mockImplementation(
    () =>
      ({
        ...appContextValue,
        specialEdSubTab: activeSpecialEdSubTab,
        selectedObservationAssignmentId,
      }) as ReturnType<typeof useApp>,
  );
  mockedUseObservationData.mockReturnValue({
    definitions: [],
    assignments: [assignmentA, sensoryAssignmentA, sfaAssignmentA],
    status: 'ready',
    error: undefined,
    retry: vi.fn(),
  });
});

describe('ObservationPage', () => {
  it('rejects a stale targeted assignment and remains in results mode', async () => {
    selectedObservationAssignmentId = assignmentA.id;
    mockedUseObservationData.mockReturnValue({
      definitions: [],
      assignments: [{ ...assignmentA, status: 'COMPLETED' }],
      status: 'ready',
      error: undefined,
      retry: vi.fn(),
    });

    renderPage(`/observations/assignments/${assignmentA.id}`);

    expect(
      await screen.findByText(/no longer pending or in progress/i),
    ).toBeVisible();
    expect(screen.getByText('Observation history for Student A')).toBeVisible();
    expect(screen.queryByTestId('fedc-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(
      `/observations/students/${studentAId}/results`,
    );
  });

  it('rejects a missing targeted assignment with feedback', async () => {
    selectedObservationAssignmentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    renderPage(
      '/observations/assignments/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    );

    expect(
      await screen.findByText(/assignment is no longer available/i),
    ).toBeVisible();
    expect(screen.getByText('Observation history for Student A')).toBeVisible();
    expect(screen.getByTestId('location')).toHaveTextContent('/observations');
  });

  it('does not retain another student’s active FEDC assignment after switching students', () => {
    renderPage();

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

  it('opens the assignment-bound Sensory form and clears it after switching students', () => {
    renderPage();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open assigned Sensory Profile form',
      }),
    );
    expect(screen.getByTestId('sensory-form')).toHaveTextContent(
      'Sensory form for Student A',
    );

    fireEvent.click(
      document.querySelector(`#gpk-switch-student-${studentBId}`)!,
    );

    expect(screen.queryByTestId('sensory-form')).not.toBeInTheDocument();
    expect(
      screen.getByText('No active Sensory Profile assignment for this student'),
    ).toBeVisible();
  });

  it('opens the assignment-bound SFA form and clears it after switching students', () => {
    renderPage();

    fireEvent.click(
      screen.getByRole('button', { name: 'Open assigned SFA form' }),
    );
    expect(screen.getByTestId('sfa-form')).toHaveTextContent(
      'SFA form for Student A',
    );

    fireEvent.click(
      document.querySelector(`#gpk-switch-student-${studentBId}`)!,
    );

    expect(screen.queryByTestId('sfa-form')).not.toBeInTheDocument();
    expect(
      screen.getByText('No active SFA assignment for this student'),
    ).toBeVisible();
  });

  it('does not select a generally visible student without observation scope', () => {
    appContextValue = {
      ...appContextValue,
      currentUser: {
        ...appContextValue.currentUser,
        assignedSpecialNeedsStudentIds: [],
      },
    } as ReturnType<typeof useApp>;
    mockedUseObservationData.mockReturnValue({
      definitions: [],
      assignments: [],
      status: 'ready',
      error: undefined,
      retry: vi.fn(),
    });

    renderPage();

    expect(
      screen.queryByText(/Observation history for/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('No Special Needs Students Currently Assigned'),
    ).toBeVisible();
  });

  it('opens the exact routed assignment for an assignment-only student', async () => {
    selectedObservationAssignmentId = sensoryAssignmentA.id;
    appContextValue = {
      ...appContextValue,
      currentUser: {
        ...appContextValue.currentUser,
        assignedSpecialNeedsStudentIds: [],
      },
    } as ReturnType<typeof useApp>;

    renderPage(`/observations/assignments/${sensoryAssignmentA.id}`);

    expect(await screen.findByTestId('sensory-form')).toHaveTextContent(
      'Sensory form for Student A',
    );
    expect(screen.queryByTestId('fedc-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(
      `/observations/assignments/${sensoryAssignmentA.id}`,
    );
    expect(setSelectedObservationAssignmentId).not.toHaveBeenCalled();
  });
});
