/** An artwork date known to the year, the month or the day. */
export interface ArtworkDate {
  year: number;
  month?: number;
  day?: number;
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Parses `YYYY`, `YYYY-MM` or `YYYY-MM-DD`; returns null for anything else or a day that does not exist. */
export function parseArtworkDate(value: string): ArtworkDate | null {
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  if (match[2] === undefined) return { year };
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  if (match[3] === undefined) return { year, month };
  const day = Number(match[3]);
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** The stored form: `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. */
export function toDateString(date: ArtworkDate): string {
  let text = String(date.year).padStart(4, '0');
  if (date.month !== undefined) text += '-' + pad(date.month);
  if (date.month !== undefined && date.day !== undefined) {
    text += '-' + pad(date.day);
  }
  return text;
}

/** For display, at the precision given: "2019", "Apr 2021", "8 Apr 2026". Returns an invalid value unchanged. */
export function formatArtworkDate(value: string): string {
  const date = parseArtworkDate(value);
  if (!date) return value;
  if (date.month === undefined) return String(date.year);
  const month = MONTHS[date.month - 1];
  if (date.day === undefined) return `${month} ${date.year}`;
  return `${date.day} ${month} ${date.year}`;
}

/**
 * The `YYYY-MM-DD` an image sorts by: the first day of its date's period,
 * or the day it was added (in UTC) when it has no date.
 */
export function sortDateFor(date: string | undefined, added: Date): string {
  if (date === undefined || date === '') {
    return added.toISOString().slice(0, 10);
  }
  const parsed = parseArtworkDate(date);
  if (!parsed) throw new Error(`Invalid artwork date: ${date}`);
  return toDateString({
    year: parsed.year,
    month: parsed.month ?? 1,
    day: parsed.day ?? 1,
  });
}

// Computed rather than read from `Date`, which maps the years 0 to 99 onto 1900 to 1999.
function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
