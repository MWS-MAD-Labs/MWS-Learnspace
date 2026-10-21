import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LearningJourneyCalendar } from '@/src/features/learning-journeys/pages/LearningJourneyCalendar';
import { useApp } from '@/src/context/AppContext';
import { useLearningJourneys } from '@/src/features/learning-journeys/hooks/useLearningJourneys';

vi.mock('@/src/context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('@/src/features/learning-journeys/hooks/useLearningJourneys', () => ({
  useLearningJourneys: vi.fn(),
}));

const metadata = {
  academicYears: [{ id: 'year-1', name: '2026-2027' }],
  semesters: [
    { id: 'semester-1', name: 'Semester 1' },
    { id: 'semester-2', name: 'Semester 2' },
  ],
  units: [{ id: 'unit-1', name: 'Elementary' }],
  grades: [{ id: 'grade-1', name: 'Grade 1', unitId: 'unit-1' }],
  subjects: [{ id: 'subject-1', name: 'Science' }],
};

function RouterState() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <div data-testid="location">
        {location.pathname}
        {location.search}
      </div>
      <button onClick={() => navigate(-1)}>Back</button>
    </>
  );
}

function renderCalendar(entry: string) {
  return render(
    <MemoryRouter initialEntries={['/dashboard', entry]} initialIndex={1}>
      <LearningJourneyCalendar />
      <RouterState />
    </MemoryRouter>,
  );
}

describe('LearningJourneyCalendar URL filters', () => {
  beforeEach(() => {
    vi.mocked(useApp).mockReturnValue({
      organizationId: 'organization-1',
      currentUser: {
        id: 'user-1',
        role: 'PRINCIPAL',
        permissions: ['journey:read', 'journey:write'],
        gradeIds: [],
        subjectIds: [],
      },
      navigateToJourneyEditor: vi.fn(),
      navigateToJourneyDetail: vi.fn(),
    } as unknown as ReturnType<typeof useApp>);
    vi.mocked(useLearningJourneys).mockReturnValue({
      journeys: [],
      metadata: metadata as never,
      status: 'ready',
      error: undefined,
      retry: vi.fn(),
    });
  });

  it('restores stable-ID filters and keeps the existing labels', () => {
    renderCalendar(
      '/journeys/calendar?semester=semester-2&unit=unit-1&grade=grade-1&subject=subject-1&search=inquiry',
    );

    expect(screen.getByRole('button', { name: 'Semester 2' })).toHaveClass(
      'bg-[#6E161E]',
    );
    expect(document.getElementById('calendar-filter-unit')).toHaveValue(
      'unit-1',
    );
    expect(document.getElementById('calendar-filter-subject')).toHaveValue(
      'subject-1',
    );
    expect(document.getElementById('calendar-search-input')).toHaveValue(
      'inquiry',
    );
    expect(vi.mocked(useLearningJourneys)).toHaveBeenLastCalledWith(
      'organization-1',
      expect.objectContaining({
        semesterId: 'semester-2',
        unitId: 'unit-1',
        gradeId: 'grade-1',
        subjectId: 'subject-1',
        search: 'inquiry',
      }),
    );
  });

  it('pushes discrete filters but replaces search typing for back navigation', () => {
    renderCalendar('/journeys/calendar');

    fireEvent.change(document.getElementById('calendar-filter-subject')!, {
      target: { value: 'subject-1' },
    });
    fireEvent.change(document.getElementById('calendar-search-input')!, {
      target: { value: 'science' },
    });
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/journeys/calendar?subject=subject-1&search=science',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/journeys/calendar',
    );
  });
});
