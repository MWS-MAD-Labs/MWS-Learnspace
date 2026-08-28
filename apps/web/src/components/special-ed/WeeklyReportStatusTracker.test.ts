import { describe, expect, it } from 'vitest';
import type { WeeklyReport } from '../../services/weeklyReportService';
import {
  clampIsoWeekForYear,
  findWeeklyReportForStudent,
  reportYearOptions,
  weeklyReportHeading,
} from './WeeklyReportStatusTracker';

function report(id: string, year: string): WeeklyReport {
  return {
    id,
    studentId: '11111111-1111-4111-8111-111111111111',
    iepId: '22222222-2222-4222-8222-222222222222',
    year,
    weekNumber: 8,
    weekRange: `Week 8, ${year}`,
    weekStart: `${year}-10-19`,
    weekEnd: `${year}-10-23`,
    teacherId: '33333333-3333-4333-8333-333333333333',
    teacherName: 'Teacher',
    status: 'Draft',
    draftStatus: 'On Progress',
    coordinatorReviewStatus: 'Not Started',
    directorApprovalStatus: 'Not Started',
    workflowHistory: [],
    goalProgress: [],
    descriptiveObservation: '',
    homeConnection: '',
    createdAt: `${year}-10-23T00:00:00.000Z`,
    updatedAt: `${year}-10-23T00:00:00.000Z`,
  };
}

describe('weekly report tracker helpers', () => {
  it('clamps week 53 when switching to a 52-week ISO year', () => {
    expect(clampIsoWeekForYear(2020, 53)).toBe(53);
    expect(clampIsoWeekForYear(2021, 53)).toBe(52);
  });

  it('renders the selected year using the ISO week range', () => {
    expect(weeklyReportHeading(2025, 8)).toBe('Week 8 (Feb 17 – Feb 21, 2025)');
    expect(weeklyReportHeading(2027, 9)).toBe('Week 9 (Mar 1 – Mar 5, 2027)');
  });

  it('builds a practical year selector around the current ISO year', () => {
    expect(reportYearOptions(2026, 2026, 2)).toEqual([
      2028, 2027, 2026, 2025, 2024,
    ]);
    expect(reportYearOptions(2026, 2035, 2)).toEqual([
      2035, 2028, 2027, 2026, 2025, 2024,
    ]);
  });
  it('matches student, week, and year instead of taking an ambiguous week record', () => {
    const older = report('44444444-4444-4444-8444-444444444444', '2025');
    const current = report('55555555-5555-4555-8555-555555555555', '2026');

    expect(
      findWeeklyReportForStudent(
        [older, current],
        current.studentId,
        current.weekNumber,
        2026,
      )?.id,
    ).toBe(current.id);
  });
});
