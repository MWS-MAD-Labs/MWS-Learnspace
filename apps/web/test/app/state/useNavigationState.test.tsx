import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useNavigationState } from '@/src/app/state/useNavigationState';

function NavigationHarness() {
  const navigation = useNavigationState();
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div>
      <span data-testid="location">
        {location.pathname}
        {location.search}
        {location.hash}
      </span>
      <span data-testid="state">
        {JSON.stringify({
          activeTab: navigation.activeTab,
          selectedStudentId: navigation.selectedStudentId,
          selectedJourneyId: navigation.selectedJourneyId,
          selectedIepId: navigation.selectedIepId,
          selectedWeeklyReportId: navigation.selectedWeeklyReportId,
          attendanceTarget: navigation.attendanceTarget,
          selectedObservationAssignmentId:
            navigation.selectedObservationAssignmentId,
          observationResultsStudentId: navigation.observationResultsStudentId,
          specialEdSubTab: navigation.specialEdSubTab,
          observationManageTab: navigation.observationManageTab,
          weeklyReportTrackerRequested: navigation.weeklyReportTrackerRequested,
        })}
      </span>
      <button onClick={() => navigation.navigateToJourneyEditor('journey-1')}>
        Journey
      </button>
      <button
        onClick={() =>
          navigation.navigateToAttendanceStudent('student-1', 'class-1')
        }
      >
        Attendance
      </button>
      <button onClick={() => navigate(-1)}>Back</button>
    </div>
  );
}

function renderNavigation(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <NavigationHarness />
    </MemoryRouter>,
  );
}

describe('URL navigation state', () => {
  it.each([
    [
      '/journeys/journey-42',
      { activeTab: 'LEARNING_JOURNEY_EDITOR', selectedJourneyId: 'journey-42' },
    ],
    [
      '/journeys/journey-42/edit',
      { activeTab: 'LEARNING_JOURNEY_EDITOR', selectedJourneyId: 'journey-42' },
    ],
    [
      '/attendance?classId=class-1&studentId=student-1',
      {
        activeTab: 'ATTENDANCE',
        selectedStudentId: 'student-1',
        attendanceTarget: { classId: 'class-1', studentId: 'student-1' },
      },
    ],
    [
      '/observations/assignments/assignment-1?instrument=SFA',
      {
        activeTab: 'SPECIAL_ED_OBSERVATION',
        selectedObservationAssignmentId: 'assignment-1',
        specialEdSubTab: 'SFA',
      },
    ],
    [
      '/observations/manage/results/student-9',
      {
        selectedStudentId: 'student-9',
        observationResultsStudentId: 'student-9',
        observationManageTab: 'results',
      },
    ],
    [
      '/observations/manage/assignments/student-8',
      {
        selectedStudentId: 'student-8',
        observationManageTab: 'assignments',
        observationResultsStudentId: null,
      },
    ],
    [
      '/students/student-2/ieps/iep-7/edit',
      {
        activeTab: 'SPECIAL_ED_IEP',
        selectedStudentId: 'student-2',
        selectedIepId: 'iep-7',
      },
    ],
    [
      '/students/student-3/weekly-reports/report-4',
      {
        activeTab: 'SPECIAL_ED_WEEKLY_REPORT',
        selectedStudentId: 'student-3',
        selectedWeeklyReportId: 'report-4',
      },
    ],
    [
      '/weekly-reports/tracker',
      {
        activeTab: 'SPECIAL_ED_WEEKLY_REPORT',
        weeklyReportTrackerRequested: true,
      },
    ],
  ])('derives deep-link state from %s', (entry, expected) => {
    renderNavigation(entry);
    expect(JSON.parse(screen.getByTestId('state').textContent ?? '{}')).toEqual(
      expect.objectContaining(expected),
    );
  });

  it('uses URL history as the only navigation truth', async () => {
    renderNavigation('/dashboard?view=compact#summary');

    fireEvent.click(screen.getByRole('button', { name: 'Journey' }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/journeys/journey-1/edit',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Attendance' }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/attendance?classId=class-1&studentId=student-1',
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    });
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/journeys/journey-1/edit',
    );
    expect(JSON.parse(screen.getByTestId('state').textContent ?? '{}')).toEqual(
      expect.objectContaining({
        activeTab: 'LEARNING_JOURNEY_EDITOR',
        selectedJourneyId: 'journey-1',
      }),
    );
  });
});
