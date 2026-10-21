import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LearningJourneyEditor } from '@/src/features/learning-journeys/pages/LearningJourneyEditor';
import { useApp } from '@/src/context/AppContext';
import { learningJourneyService } from '@/src/features/learning-journeys/api/learningJourneyService';

vi.mock('@/src/context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock(
  '@/src/features/learning-journeys/api/learningJourneyService',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('@/src/features/learning-journeys/api/learningJourneyService')
      >();
    return {
      ...actual,
      mapJourneyToLegacy: (value: unknown) => value,
      learningJourneyService: {
        getAcademicYears: vi.fn(),
        getSemesters: vi.fn(),
        getUnits: vi.fn(),
        getGrades: vi.fn(),
        getSubjects: vi.fn(),
        getJourney: vi.fn(),
      },
    };
  },
);

const journey = {
  id: 'journey-1',
  title: 'Read-only journey',
  academicYearId: 'year-1',
  semesterId: 'semester-1',
  unitId: 'unit-1',
  gradeId: 'grade-1',
  subjectId: 'subject-1',
  academicYear: '2026-2027',
  semester: 'Semester 1',
  unit: 'Elementary',
  grade: 'Grade 1',
  subject: 'Science',
  ownerIds: ['user-1'],
  ownerMembershipIds: ['membership-1'],
  authorName: 'Teacher One',
  draftStatus: 'On Progress',
  principalReviewStatus: 'Not Started',
  directorApprovalStatus: 'Not Started',
  workflowHistory: [],
  projects: [],
  createdBy: 'user-1',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedBy: 'user-1',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

describe('LearningJourneyEditor route modes', () => {
  beforeEach(() => {
    vi.mocked(useApp).mockReturnValue({
      selectedJourneyId: 'journey-1',
      organizationId: 'organization-1',
      currentUser: {
        id: 'user-1',
        name: 'Teacher One',
        membershipId: 'membership-1',
        permissions: ['journey:read', 'journey:write'],
        gradeIds: [],
        subjectIds: [],
      },
      setActiveTab: vi.fn(),
      setSelectedJourneyId: vi.fn(),
      showToast: vi.fn(),
      refreshData: vi.fn(),
    } as unknown as ReturnType<typeof useApp>);
    vi.mocked(learningJourneyService.getAcademicYears).mockResolvedValue({
      data: [{ id: 'year-1', name: '2026-2027' }],
    } as never);
    vi.mocked(learningJourneyService.getSemesters).mockResolvedValue({
      data: [
        { id: 'semester-1', academicYearId: 'year-1', name: 'Semester 1' },
      ],
    } as never);
    vi.mocked(learningJourneyService.getUnits).mockResolvedValue({
      data: [{ id: 'unit-1', name: 'Elementary' }],
    } as never);
    vi.mocked(learningJourneyService.getGrades).mockResolvedValue({
      data: [{ id: 'grade-1', unitId: 'unit-1', name: 'Grade 1' }],
    } as never);
    vi.mocked(learningJourneyService.getSubjects).mockResolvedValue({
      data: [{ id: 'subject-1', name: 'Science' }],
    } as never);
    vi.mocked(learningJourneyService.getJourney).mockResolvedValue({
      data: journey,
    } as never);
  });

  it('renders /journeys/:id as read-only with eligible edit navigation', async () => {
    render(
      <MemoryRouter initialEntries={['/journeys/journey-1']}>
        <LearningJourneyEditor />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Read-Only Detail')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Edit Journey' })).toBeVisible();
    expect(screen.getByLabelText('Learning Journey Title')).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Save Draft' }),
    ).not.toBeInTheDocument();
  });

  it('renders /journeys/:id/edit as editable when eligible', async () => {
    render(
      <MemoryRouter initialEntries={['/journeys/journey-1/edit']}>
        <LearningJourneyEditor />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Draft Mode')).toBeVisible();
    expect(screen.getByLabelText('Learning Journey Title')).toBeEnabled();
    expect(
      screen.getAllByRole('button', { name: 'Save Draft' }),
    ).not.toHaveLength(0);
  });
});
