import type { GalleryRow } from '@tigy/models';
import { compareText } from '../shared/compare';
import {
  compareNewestFirst,
  visibleRows,
  yearOf,
} from '../gallery-query/gallery-query';

export interface Choice {
  /** A tag, or a person ID. */
  value: string;
  /** How many visible pieces carry it. */
  count: number;
}

export interface YearMark {
  year: number;
  count: number;
}

/** What the header, the timeline and the filter pickers show, computed from the rows a visitor may see. */
export interface GalleryOverview {
  count: number;
  /** Sort dates of the oldest and newest visible pieces; absent when there are none. */
  oldest?: string;
  newest?: string;
  /** Every year with a visible piece, newest first. */
  years: YearMark[];
  tags: Choice[];
  characters: Choice[];
  artists: Choice[];
}

export interface Neighbours {
  /** The next newer visible piece. */
  previous?: GalleryRow;
  /** The next older visible piece. */
  next?: GalleryRow;
}

/** The overview for one NSFW mode: with the switch off, anything only NSFW pieces carry is left out. */
export function galleryOverview(
  rows: readonly GalleryRow[],
  nsfw: boolean,
): GalleryOverview {
  const visible = visibleRows(rows, nsfw).sort(compareNewestFirst);
  const years = new Map<number, number>();
  const tags = new Map<string, number>();
  const characters = new Map<string, number>();
  const artists = new Map<string, number>();
  for (const row of visible) {
    add(years, yearOf(row));
    new Set(row.tags).forEach((tag) => add(tags, tag));
    new Set(row.characterIds).forEach((id) => add(characters, id));
    new Set(row.artistIds).forEach((id) => add(artists, id));
  }
  const overview: GalleryOverview = {
    count: visible.length,
    years: [...years].map(([year, count]) => ({ year, count })),
    tags: choices(tags),
    characters: choices(characters),
    artists: choices(artists),
  };
  if (visible.length) {
    overview.oldest = visible[visible.length - 1].sortDate;
    overview.newest = visible[0].sortDate;
  }
  return overview;
}

/**
 * The previous and next pieces of an artwork in the whole gallery's newest-first order, skipping what the
 * visitor may not see. Works for an NSFW artwork with the switch off; empty when the artwork is not in the gallery.
 */
export function neighbours(
  rows: readonly GalleryRow[],
  imageId: string,
  nsfw: boolean,
): Neighbours {
  const current = rows.find((row) => row.id === imageId);
  if (!current) return {};
  const result: Neighbours = {};
  for (const row of visibleRows(rows, nsfw)) {
    const order = compareNewestFirst(row, current);
    const closerNewer =
      !result.previous || compareNewestFirst(row, result.previous) > 0;
    const closerOlder =
      !result.next || compareNewestFirst(row, result.next) < 0;
    if (order < 0 && closerNewer) result.previous = row;
    if (order > 0 && closerOlder) result.next = row;
  }
  return result;
}

function add<K>(counts: Map<K, number>, key: K): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

/** Most used first, then alphabetically. */
function choices(counts: Map<string, number>): Choice[] {
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || compareText(a.value, b.value));
}
