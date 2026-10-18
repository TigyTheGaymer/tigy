import {
  type GalleryQuery,
  UNFILTERED_QUERY,
} from '../gallery-query/gallery-query';
import { normaliseTags } from '../tags/tags';

/** Query parameters as a router or a server framework hands them over. */
export type ParamsInput = URLSearchParams | Readonly<Record<string, unknown>>;

const PERSON_ID = /^[A-Za-z0-9_-]{1,128}$/;
const YEAR = /^\d{4}$/;

/**
 * The gallery address's parameters: `character` and `artist` carry person IDs, `tag` the tag itself,
 * each repeated for several; `year`; and `sort=oldest`. The defaults are left out.
 * Hand the result to the router's `queryParams` or `HttpClient`'s `params`, which encode it.
 */
export function galleryQueryToParams(
  query: GalleryQuery,
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  if (query.characterIds.length) params['character'] = [...query.characterIds];
  if (query.artistIds.length) params['artist'] = [...query.artistIds];
  if (query.tags.length) params['tag'] = [...query.tags];
  if (query.year !== undefined) params['year'] = String(query.year);
  if (query.sort !== 'newest') params['sort'] = query.sort;
  return params;
}

/**
 * Reads a gallery address's parameters. Unknown parameters are ignored, and a malformed value falls back to
 * that parameter's default, so a broken link still opens the gallery.
 */
export function galleryQueryFromParams(params: ParamsInput): GalleryQuery {
  const query: GalleryQuery = {
    characterIds: unique(
      values(params, 'character').filter((id) => PERSON_ID.test(id)),
    ),
    artistIds: unique(
      values(params, 'artist').filter((id) => PERSON_ID.test(id)),
    ),
    tags: normaliseTags(values(params, 'tag')),
    sort:
      values(params, 'sort')[0] === 'oldest' ? 'oldest' : UNFILTERED_QUERY.sort,
  };
  const year = values(params, 'year').find((value) => YEAR.test(value));
  if (year !== undefined) query.year = Number(year);
  return query;
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
