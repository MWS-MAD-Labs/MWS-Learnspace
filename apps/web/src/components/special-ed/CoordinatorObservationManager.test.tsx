import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CoordinatorObservationManager } from './CoordinatorObservationManager';
import { useApp } from '../../context/AppContext';
import { useObservationData } from '../../hooks/useObservationData';
import { attendanceService } from '../../services/attendanceService';
import { studentAdministrationService } from '../../services/studentAdministrationService';

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../hooks/useObservationData', () => ({
  useObservationData: vi.fn(),
}));
vi.mock('../../services/attendanceService', () => ({
  attendanceService: { getSchoolDate: vi.fn() },
}));
vi.mock('../../services/studentAdministrationService', () => ({
  studentAdministrationService: { assignGpkTeacher: vi.fn() },
}));
vi.mock('./ObservationHistoryViewer', () => ({
  ObservationHistoryViewer: ({ student }: { student: { name?: string } }) => (
    <div>Results for {student.name}</div>
  ),
}));

const mockedUseApp = vi.mocked(useApp);
const mockedUseObservationData = vi.mocked(useObservationData);
const setSelectedObservationAssignmentId = vi.fn();
const setObservationResultsStudentId = vi.fn();
const setSelectedStudentId = vi.fn();
const showToast = vi.fn();
const mockedAttendanceService = vi.mocked(attendanceService);
const mockedStudentAdministrationService = vi.mocked(
  studentAdministrationService,
);

describe('CoordinatorObservationManager targeted assignment navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseApp.mockReturnValue({
      organizationId: '11111111-1111-4111-8111-111111111111',
      currentUser: {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Coordinator',
        email: 'coordinator@example.test',
        role: 'SPECIAL_ED_COORDINATOR',
        roleTitle: 'Special Education Coordinator',
        unitIds: [],
        gradeIds: [],
        subjectIds: [],
        permissions: ['special-ed:read', 'special-ed:write'],
        isSpecialEdCoordinator: true,
      },
      allUsers: [],
      students: [],
      showToast,
      refreshData: vi.fn(),
      selectedStudentId: '',
      setSelectedStudentId,
      selectedObservationAssignmentId: '33333333-3333-4333-8333-333333333333',
      setSelectedObservationAssignmentId,
      observationResultsStudentId: null,
      setObservationResultsStudentId,
      navigateToIEP: vi.fn(),
    } as unknown as ReturnType<typeof useApp>);
    mockedUseObservationData.mockReturnValue({
      definitions: [],
      assignments: [],
      status: 'ready',
      error: undefined,
      retry: vi.fn(),
    });
  });

  it('clears a missing target and shows feedback', async () => {
    render(<CoordinatorObservationManager />);

    await waitFor(() =>
      expect(setSelectedObservationAssignmentId).toHaveBeenCalledWith(null),
    );
    expect(showToast).toHaveBeenCalledWith(
      'warning',
      'Observation Assignment Unavailable',
      'The requested observation assignment is no longer available.',
    );
  });

  it('opens all results only for an explicit student-target navigation', async () => {
    mockedUseApp.mockReturnValue({
      ...mockedUseApp(),
      students: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          studentNumber: 'S-001',
          fullName: 'Student One',
          name: 'Student One',
          gender: 'Unspecified',
          dateOfBirth: '2015-01-01',
          grade: '1',
          className: '1A',
          unit: 'Elementary',
          parentGuardianName: 'Parent One',
          parentGuardianPhone: '555-0100',
          address: 'Test address',
          specialNeedsFlag: true,
          active: true,
        },
      ],
      selectedObservationAssignmentId: null,
      observationResultsStudentId: '44444444-4444-4444-8444-444444444444',
    } as unknown as ReturnType<typeof useApp>);

    render(<CoordinatorObservationManager />);

    expect(await screen.findByText('Results for Student One')).toBeVisible();
    expect(setSelectedStudentId).toHaveBeenCalledWith(
      '44444444-4444-4444-8444-444444444444',
    );
    expect(setObservationResultsStudentId).toHaveBeenCalledWith(null);
  });

  it('fails closed and uses the authoritative school date for GPK assignment', async () => {
    mockedUseApp.mockReturnValue({
      ...mockedUseApp(),
      allUsers: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          membershipId: '66666666-6666-4666-8666-666666666666',
          name: 'GPK Teacher',
          email: 'gpk@example.test',
          role: 'SPECIAL_ED_TEACHER',
          roleTitle: 'GPK Teacher',
          unitIds: [],
          gradeIds: [],
          subjectIds: [],
          permissions: ['special-ed:read'],
          isGPK: true,
        },
      ],
      students: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          studentNumber: 'S-001',
          fullName: 'Student One',
          name: 'Student One',
          gender: 'Unspecified',
          dateOfBirth: '2015-01-01',
          grade: '1',
          className: '1A',
          unit: 'Elementary',
          parentGuardianName: 'Parent One',
          parentGuardianPhone: '555-0100',
          address: 'Test address',
          specialNeedsFlag: true,
          active: true,
        },
      ],
      selectedObservationAssignmentId: null,
    } as unknown as ReturnType<typeof useApp>);
    mockedAttendanceService.getSchoolDate
      .mockRejectedValueOnce(new Error('School date unavailable'))
      .mockResolvedValueOnce({
        data: {
          organizationId: '11111111-1111-4111-8111-111111111111',
          schoolDate: '2026-08-29',
          timezone: 'Pacific/Kiritimati',
        },
      });
    mockedStudentAdministrationService.assignGpkTeacher.mockResolvedValue({
      data: {} as never,
    });

    render(<CoordinatorObservationManager />);
    fireEvent.click(screen.getByRole('button', { name: /assign gpk/i }));

    expect(await screen.findByText('School date unavailable')).toBeVisible();
    expect(
      screen.getByRole('button', { name: /confirm assignment/i }),
    ).toBeDisabled();
    expect(
      mockedStudentAdministrationService.assignGpkTeacher,
    ).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /retry school date/i }));
    await screen.findByText(/2026-08-29/);
    fireEvent.click(
      screen.getByRole('button', { name: /confirm assignment/i }),
    );

    await waitFor(() =>
      expect(
        mockedStudentAdministrationService.assignGpkTeacher,
      ).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111111',
        '44444444-4444-4444-8444-444444444444',
        {
          membershipId: '66666666-6666-4666-8666-666666666666',
          startsOn: '2026-08-29',
        },
      ),
    );
  });
});
