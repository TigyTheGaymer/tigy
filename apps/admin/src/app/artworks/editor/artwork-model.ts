import {
  normaliseTags,
  parseArtworkDate,
  sortDateFor,
  toDateString,
} from '@tigy/gallery';
import type { Image } from '@tigy/models';
import type { ImageEdits } from '../artworks-api';

/** The editor's form: strings for every text box, so an empty field is ''. */
export interface ArtworkModel {
  title: string;
  description: string;
  year: string;
  month: string;
  day: string;
  published: boolean;
  nsfw: boolean;
  artistIds: string[];
  characterIds: string[];
  tags: string[];
}

export type DateError =
  'year' | 'month' | 'missing-year' | 'missing-month' | 'day';

export const DATE_ERROR_MESSAGES: Record<DateError, string> = {
  year: 'Enter the year with four digits.',
  'missing-year': 'Enter a year for this month or day.',
  month: 'Enter a month from 1 to 12.',
  'missing-month': 'Enter a month for this day.',
  day: 'This date does not exist.',
};

export function toModel(image: Image): ArtworkModel {
  const date = image.date ? parseArtworkDate(image.date) : null;
  return {
    title: image.title ?? '',
    description: image.description ?? '',
    year: date ? String(date.year).padStart(4, '0') : '',
    month: date?.month ? String(date.month) : '',
    day: date?.day ? String(date.day) : '',
    published: image.published,
    nsfw: image.nsfw,
    artistIds: [...(image.artistIds ?? [])],
    characterIds: [...(image.characterIds ?? [])],
    tags: [...(image.tags ?? [])],
  };
}

/** What is wrong with the date fields, or undefined when they make a date or are all empty. */
export function dateError(model: ArtworkModel): DateError | undefined {
  const year = model.year.trim();
  const month = model.month.trim();
  const day = model.day.trim();
  if (!year && (month || day)) return 'missing-year';
  if (year && !/^\d{4}$/.test(year)) return 'year';
  if (day && !month) return 'missing-month';
  if (month && !(/^\d{1,2}$/.test(month) && +month >= 1 && +month <= 12)) {
    return 'month';
  }
  if (day && (!/^\d{1,2}$/.test(day) || !parseArtworkDate(dateOf(model)))) {
    return 'day';
  }
  return undefined;
}

/** The stored date, `YYYY`, `YYYY-MM` or `YYYY-MM-DD`, or '' for none. Expects fields without a date error. */
export function dateOf(model: ArtworkModel): string {
  const year = model.year.trim();
  if (!year) return '';
  const month = model.month.trim();
  const day = model.day.trim();
  return toDateString({
    year: Number(year),
    ...(month && { month: Number(month) }),
    ...(month && day && { day: Number(day) }),
  });
}

/** The model as it is stored: trimmed text and normalised tags. */
export function normalise(model: ArtworkModel): ArtworkModel {
  const date = parseArtworkDate(dateOf(model));
  return {
    ...model,
    title: model.title.trim(),
    description: model.description.trim(),
    year: date ? String(date.year).padStart(4, '0') : '',
    month: date?.month ? String(date.month) : '',
    day: date?.day ? String(date.day) : '',
    tags: normaliseTags(model.tags),
  };
}

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((item, i) => item === b[i]);

/**
 * The fields that differ from what the editor loaded, so a save never
 * reverts a field changed elsewhere that this editor left alone. A cleared
 * field is null, and a new date brings its sort date.
 */
export function changedEdits(
  model: ArtworkModel,
  loaded: ArtworkModel,
  addedOn: Date,
): ImageEdits {
  const now = normalise(model);
  const edits: ImageEdits = {};
  for (const key of ['title', 'description'] as const) {
    if (now[key] !== loaded[key]) edits[key] = now[key] || null;
  }
  const date = dateOf(now);
  if (date !== dateOf(loaded)) {
    edits.date = date || null;
    edits.sortDate = sortDateFor(date || undefined, addedOn);
  }
  for (const key of ['published', 'nsfw'] as const) {
    if (now[key] !== loaded[key]) edits[key] = now[key];
  }
  for (const key of ['artistIds', 'characterIds', 'tags'] as const) {
    if (!sameList(now[key], loaded[key])) edits[key] = now[key];
  }
  return edits;
}
