import {
  formatArtworkDate,
  parseArtworkDate,
  sortDateFor,
  toDateString,
} from './dates';

const added = new Date('2025-11-20T15:30:00Z');

describe('parseArtworkDate', () => {
  it('reads a year, a month and a full date', () => {
    expect(parseArtworkDate('2019')).toEqual({ year: 2019 });
    expect(parseArtworkDate('2021-04')).toEqual({ year: 2021, month: 4 });
    expect(parseArtworkDate('2024-02-29')).toEqual({
      year: 2024,
      month: 2,
      day: 29,
    });
  });

  it.each([
    '',
    '19',
    '2019-4',
    '2021-13',
    '2021-00',
    '2021-04-00',
    '2021-04-31',
    '2023-02-29',
    '2021-04-01T00:00',
    ' 2021',
    '2021/04',
  ])('rejects the malformed date %j', (value) => {
    expect(parseArtworkDate(value)).toBeNull();
  });

  it('knows every month length and leap year', () => {
    expect(parseArtworkDate('2025-01-31')).not.toBeNull();
    expect(parseArtworkDate('2025-04-30')).not.toBeNull();
    expect(parseArtworkDate('2000-02-29')).not.toBeNull();
    expect(parseArtworkDate('1900-02-29')).toBeNull();
    expect(parseArtworkDate('0000-02-29')).not.toBeNull();
    expect(parseArtworkDate('0001-02-29')).toBeNull();
  });

  it('formats back to the stored form', () => {
    for (const value of ['2019', '2021-04', '2025-11-20']) {
      const parsed = parseArtworkDate(value);
      expect(parsed && toDateString(parsed)).toBe(value);
    }
  });
});

describe('formatArtworkDate', () => {
  it('Year only: shows only the year', () => {
    expect(formatArtworkDate('2019')).toBe('2019');
  });

  it('shows a month without a day, and a full date', () => {
    expect(formatArtworkDate('2021-04')).toBe('Apr 2021');
    expect(formatArtworkDate('2026-04-08')).toBe('8 Apr 2026');
  });
});

describe('sortDateFor', () => {
  it('Undated piece: sorts by the day it was added', () => {
    expect(sortDateFor(undefined, added)).toBe('2025-11-20');
    expect(sortDateFor('', added)).toBe('2025-11-20');
  });

  it('Partly dated piece: sorts by the first day of the month', () => {
    expect(sortDateFor('2021-04', added)).toBe('2021-04-01');
  });

  it('Year only: sorts by the first day of the year', () => {
    expect(sortDateFor('2019', added)).toBe('2019-01-01');
  });

  it('keeps a full date', () => {
    expect(sortDateFor('2026-04-08', added)).toBe('2026-04-08');
  });

  it('rejects a malformed date', () => {
    expect(() => sortDateFor('2021-13', added)).toThrow('Invalid artwork date');
  });
});
