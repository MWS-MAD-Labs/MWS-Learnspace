import { describe, expect, it } from 'vitest';
import { isoWeeksInYear, weeklyReportDateRange } from './weeklyReportDates';

describe('weeklyReportDateRange', () => {
  it('uses Monday-through-Friday ISO week dates for the selected year', () => {
    expect(weeklyReportDateRange(2025, 8)).toEqual({
      start: '2025-02-17',
      end: '2025-02-21',
      range: 'Feb 17 – Feb 21, 2025',
    });
    expect(weeklyReportDateRange(2027, 9)).toEqual({
      start: '2027-03-01',
      end: '2027-03-05',
      range: 'Mar 1 – Mar 5, 2027',
    });
  });

  it('rejects week 53 for ISO years that contain only 52 weeks', () => {
    expect(isoWeeksInYear(2020)).toBe(53);
    expect(isoWeeksInYear(2021)).toBe(52);
    expect(() => weeklyReportDateRange(2021, 53)).toThrow(
      /between 1 and 52/i,
    );
  });

  it('labels both years when an ISO week crosses a calendar-year boundary', () => {
    expect(weeklyReportDateRange(2020, 53)).toEqual({
      start: '2020-12-28',
      end: '2021-01-01',
      range: 'Dec 28, 2020 – Jan 1, 2021',
    });
  });
});
