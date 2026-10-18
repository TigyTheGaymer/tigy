import type { GalleryRow } from '@tigy/models';
import { compareText } from '../shared/compare';

export const PAGE_SIZE = 24;

export type GallerySort = 'newest' | 'oldest';

/** What a gallery address carries. Every active filter must match; several people or tags must all match. */
export interface GalleryQuery {
  characterIds: readonly string[];
  artistIds: readonly string[];
  tags: readonly string[];
  year?: number;
  sort: GallerySort;
}

/** The position of a row in the `(sortDate, id)` order. */
export interface GalleryCursor {
  sortDate: string;
  id: string;
}

export interface GalleryPage {
  rows: GalleryRow[];
  /** Whether more matching rows follow the last one returned. */
  hasMore: boolean;
}

/** Frozen, so a copy made with a spread cannot change it through the shared arrays. */
export const UNFILTERED_QUERY: Readonly<GalleryQuery> = Object.freeze({
  characterIds: Object.freeze([]),
  artistIds: Object.freeze([]),
  tags: Object.freeze([]),
  sort: 'newest',
});

/** `(sortDate, id)` order, oldest first. */
export function compareOldestFirst(a: GalleryCursor, b: GalleryCursor): number {
  return compareText(a.sortDate, b.sortDate) || compareText(a.id, b.id);
}

/** `(sortDate, id)` order, newest first. */
export function compareNewestFirst(a: GalleryCursor, b: GalleryCursor): number {
  return compareOldestFirst(b, a);
}

/** The `after` parameter for the pieces following `row`: `{sortDate}_{id}`. */
export function formatCursor(row: GalleryCursor): string {
  return `${row.sortDate}_${row.id}`;
}

/** Reads an `after` parameter; returns null when it is malformed. */
export function parseCursor(value: string): GalleryCursor | null {
  const match = /^(\d{4}-\d{2}-\d{2})_([^/]+)$/.exec(value);
  return match ? { sortDate: match[1], id: match[2] } : null;
}

/** Whether a row passes every filter of the query. A row's year is its sort date's year. */
export function matchesQuery(row: GalleryRow, query: GalleryQuery): boolean {
  return (
    query.characterIds.every((id) => row.characterIds.includes(id)) &&
    query.artistIds.every((id) => row.artistIds.includes(id)) &&
    query.tags.every((tag) => row.tags.includes(tag)) &&
    (query.year === undefined || yearOf(row) === query.year)
  );
}

/** The rows a visitor may see: NSFW rows only when the switch is on. */
export function visibleRows(
  rows: readonly GalleryRow[],
  nsfw: boolean,
): GalleryRow[] {
  return nsfw ? [...rows] : rows.filter((row) => !row.nsfw);
}

/**
 * One page of the gallery: filters every row, sorts all matches, then returns the `limit` rows after the cursor.
 * The cursor is compared by value, so it works even when its piece has since left the gallery.
 */
export function queryGallery(
  rows: readonly GalleryRow[],
  query: GalleryQuery,
  options: { nsfw: boolean; after?: GalleryCursor; limit?: number },
): GalleryPage {
  const limit = options.limit ?? PAGE_SIZE;
  const compare =
    query.sort === 'oldest' ? compareOldestFirst : compareNewestFirst;
  const after = options.after;
  const matching = visibleRows(rows, options.nsfw)
    .filter((row) => matchesQuery(row, query))
    .filter((row) => !after || compare(row, after) > 0)
    .sort(compare);
  return { rows: matching.slice(0, limit), hasMore: matching.length > limit };
}

export function yearOf(row: Pick<GalleryRow, 'sortDate'>): number {
  return Number(row.sortDate.slice(0, 4));
}
