import {
  type GalleryQuery,
  UNFILTERED_QUERY,
} from '../gallery-query/gallery-query';
import { normaliseTags } from '../tags/tags';

/** Query parameters as a router or a server framework hands them over. */
export type ParamsInput = URLSearchParams | Readonly<Record<string, unknown>>;

/** A person or artwork ID as an address may carry it. */
export const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const YEAR = /^\d{4}$/;

/**
 * The gallery address's parameters: `character` and `artist` carry person IDs, `tag` the tag itself and
 * `year` the year, each repeated for several; and `sort=oldest`. The defaults are left out.
 * Hand the result to the router's `queryParams` or `HttpClient`'s `params`, which encode it.
 */
export function galleryQueryToParams(
  query: GalleryQuery,
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  if (query.characterIds.length) params['character'] = [...query.characterIds];
  if (query.artistIds.length) params['artist'] = [...query.artistIds];
  if (query.tags.length) params['tag'] = [...query.tags];
  // Newest first, so the order years were ticked in never makes another address.
  if (query.years.length) params['year'] = newestFirst(query.years).map(String);
  if (query.sort !== 'newest') params['sort'] = query.sort;
  return params;
}

/**
 * Reads a gallery address's parameters. Unknown parameters are ignored, and a malformed value falls back to
 * that parameter's default, so a broken link still opens the gallery.
 */
export function galleryQueryFromParams(params: ParamsInput): GalleryQuery {
  return {
    characterIds: unique(
      values(params, 'character').filter((id) => ID_PATTERN.test(id)),
    ),
    artistIds: unique(
      values(params, 'artist').filter((id) => ID_PATTERN.test(id)),
    ),
    tags: normaliseTags(values(params, 'tag')),
    years: newestFirst(
      unique(values(params, 'year').filter((year) => YEAR.test(year))).map(
        Number,
      ),
    ),
    sort:
      values(params, 'sort')[0] === 'oldest' ? 'oldest' : UNFILTERED_QUERY.sort,
  };
}

function values(params: ParamsInput, name: string): string[] {
  const raw =
    params instanceof URLSearchParams ? params.getAll(name) : params[name];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.filter((value): value is string => typeof value === 'string');
}

function unique(list: string[]): string[] {
  return [...new Set(list)];
}

function newestFirst(years: readonly number[]): number[] {
  return [...years].sort((a, b) => b - a);
}
