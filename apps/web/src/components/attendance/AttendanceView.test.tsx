import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttendanceView } from './AttendanceView';
import { useAuth } from '../../context/AuthContext';
import { ApiClientError } from '../../services/apiClient';
import { attendanceService } from '../../services/attendanceService';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    currentUser: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Teacher One',
    },
    session: {
      memberships: [
        {
          organizationId: '22222222-2222-4222-8222-222222222222',
          organizationName: 'Learnspace School',
          permissions: ['attendance:read', 'attendance:write'],
        },
      ],
    },
  })),
}));

vi.mock('../../services/attendanceService', () => ({
  attendanceService: {
    getClasses: vi.fn(),
    getRoster: vi.fn(),
    saveRoster: vi.fn(),
  },
}));

const schoolClass = {
  id: '33333333-3333-4333-8333-333333333333',
  organizationId: '22222222-2222-4222-8222-222222222222',
  unitId: '44444444-4444-4444-8444-444444444444',
  gradeId: '55555555-5555-4555-8555-555555555555',
  code: '1A',
  name: 'Sequoia',
};

const student = {
  id: '66666666-6666-4666-8666-666666666666',
  organizationId: '22222222-2222-4222-8222-222222222222',
  studentNumber: 'STU-001',
  fullName: 'Alex Student',
  nickname: 'Alex',
  avatarUrl: null,
};

const classesResponse = { data: [schoolClass], meta: { count: 1 } };
const rosterResponse = {
  data: {
    organizationId: schoolClass.organizationId,
    class: schoolClass,
    schoolDate: '2026-08-24',
    version: 'version-1',
    roster: [
      {
        student,
        enrollmentId: '77777777-7777-4777-8777-777777777777',
        attendance: null,
      },
    ],
  },
};

const mockedAttendanceService = vi.mocked(attendanceService);
const mockedUseAuth = vi.mocked(useAuth);

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    status: 'authenticated',
    currentUser: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Teacher One',
      email: 'teacher@example.test',
      role: 'GRADE_TEACHER',
      roleTitle: 'Teacher',
      unitIds: [],
      gradeIds: [],
      subjectIds: [],
      permissions: ['attendance:read', 'attendance:write'],
    },
    session: {
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Teacher One',
        email: 'teacher@example.test',
        avatarUrl: null,
        status: 'ACTIVE',
      },
      memberships: [
        {
          id: '88888888-8888-4888-8888-888888888888',
          organizationId: schoolClass.organizationId,
          organizationName: 'Learnspace School',
          role: 'GRADE_TEACHER',
          roleTitle: 'Teacher',
          unitIds: [],
          gradeIds: [],
          subjectIds: [],
          assignedStudentIds: [],
          permissions: ['attendance:read', 'attendance:write'],
        },
      ],
      expiresAt: '2026-08-25T00:00:00.000Z',
    },
    login: vi.fn(),
    logout: vi.fn(),
    retry: vi.fn(),
  });
  vi.useFakeTimers({ now: new Date(2026, 7, 24, 12), shouldAdvanceTime: true });
  mockedAttendanceService.getClasses.mockResolvedValue(classesResponse);
  mockedAttendanceService.getRoster.mockResolvedValue(rosterResponse);
  mockedAttendanceService.saveRoster.mockResolvedValue({
    data: { schoolDate: '2026-08-24', version: 'version-2', savedCount: 1 },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AttendanceView', () => {
  it('loads authorized classes and creates an unsaved Present draft for null attendance', async () => {
    render(<AttendanceView />);

    expect(await screen.findByText('Alex Student')).toBeVisible();
    expect(screen.getByLabelText('Class')).toHaveValue(schoolClass.id);
    expect(screen.getByLabelText('Status for Alex Student')).toHaveValue(
      'PRESENT',
    );
    expect(
      screen.getByText(/unsaved draft defaults to present/i),
    ).toBeVisible();
    expect(screen.getByText(/1 unsaved draft/i)).toBeVisible();
  });

  it('validates Late minutes and saves only the loaded roster using the server version', async () => {
    render(<AttendanceView />);
    await screen.findByText('Alex Student');

    fireEvent.change(screen.getByLabelText('Status for Alex Student'), {
      target: { value: 'LATE' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save attendance/i }));

    expect(await screen.findByText(/enter whole minutes/i)).toBeVisible();
    expect(mockedAttendanceService.saveRoster).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Minutes late for Alex Student'), {
      target: { value: '12' },
    });
    fireEvent.change(screen.getByLabelText('Notes for Alex Student'), {
      target: { value: 'Bus delay' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save attendance/i }));

    await waitFor(() =>
      expect(mockedAttendanceService.saveRoster).toHaveBeenCalledWith(
        schoolClass.organizationId,
        schoolClass.id,
        {
          schoolDate: '2026-08-24',
          expectedVersion: 'version-1',
          records: [
            {
              studentId: student.id,
              status: 'LATE',
              minutesLate: 12,
              notes: 'Bus delay',
            },
          ],
        },
      ),
    );
    expect(
      await screen.findByText(/saved attendance for 1 students/i),
    ).toBeVisible();
    expect(screen.getByText(/0 unsaved drafts/i)).toBeVisible();
    expect(
      screen.queryByText(/unsaved draft defaults to present/i),
    ).not.toBeInTheDocument();
  });

  it('renders the roster as read-only without write permission', async () => {
    const auth = mockedUseAuth();
    mockedUseAuth.mockReturnValue({
      ...auth,
      currentUser: auth.currentUser
        ? { ...auth.currentUser, permissions: ['attendance:read'] }
        : undefined,
      session: auth.session
        ? {
            ...auth.session,
            memberships: auth.session.memberships.map((membership) => ({
              ...membership,
              permissions: ['attendance:read'],
            })),
          }
        : undefined,
    });

    render(<AttendanceView />);

    expect(await screen.findByText(/read-only attendance/i)).toBeVisible();
    await screen.findByText('Alex Student');
    expect(screen.getByLabelText('Status for Alex Student')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /save attendance/i }),
    ).toBeDisabled();
  });

  it('shows an empty roster state', async () => {
    mockedAttendanceService.getRoster.mockResolvedValue({
      ...rosterResponse,
      data: { ...rosterResponse.data, roster: [] },
    });
    render(<AttendanceView />);

    expect(
      await screen.findByRole('heading', { name: /no students enrolled/i }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: /save attendance/i }),
    ).toBeDisabled();
  });

  it('preserves user drafts when reloading after a conflict', async () => {
    mockedAttendanceService.saveRoster.mockRejectedValueOnce(
      new ApiClientError(
        'conflict',
        'ATTENDANCE_VERSION_CONFLICT',
        'Changed.',
        409,
        'request-conflict',
      ),
    );
    mockedAttendanceService.getRoster
      .mockResolvedValueOnce(rosterResponse)
      .mockResolvedValueOnce({
        ...rosterResponse,
        data: { ...rosterResponse.data, version: 'version-2' },
      });
    render(<AttendanceView />);
    await screen.findByText('Alex Student');

    fireEvent.change(screen.getByLabelText('Status for Alex Student'), {
      target: { value: 'SICK' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save attendance/i }));
    expect(
      await screen.findByText(/attendance changed on the server/i),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole('button', { name: /reload latest and keep drafts/i }),
    );
    await waitFor(() =>
      expect(mockedAttendanceService.getRoster).toHaveBeenCalledTimes(2),
    );
    expect(screen.getByLabelText('Status for Alex Student')).toHaveValue(
      'SICK',
    );
    expect(
      screen.getByText(
        /latest server version loaded; your draft changes were kept/i,
      ),
    ).toBeVisible();
  });
});
