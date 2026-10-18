import { galleryQueryFromParams, galleryQueryToParams } from './gallery-params';
import {
  type GalleryQuery,
  UNFILTERED_QUERY,
} from '../gallery-query/gallery-query';

const query = (fields: Partial<GalleryQuery> = {}): GalleryQuery => ({
  ...UNFILTERED_QUERY,
  ...fields,
});

/** Encodes parameters into a query string, as the router and `HttpClient` do. */
function toSearch(params: Record<string, string | string[]>): string {
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      search.append(name, item);
    }
  }
  return search.toString();
}

/** Every combination of the five parts of a query. */
function everyCombination(): GalleryQuery[] {
  const result: GalleryQuery[] = [];
  for (let mask = 0; mask < 32; mask++) {
    const q = query();
    if (mask & 1) q.characterIds = ['tigy', 'Pookie_2'];
    if (mask & 2) q.artistIds = ['k3xQ9a-b'];
    if (mask & 4) q.tags = ['reference sheet', 'r&d / 50%'];
    if (mask & 8) q.year = 2025;
    if (mask & 16) q.sort = 'oldest';
    result.push(q);
  }
  return result;
}

describe('gallery parameters', () => {
  it.each(
    everyCombination().map((q) => [
      toSearch(galleryQueryToParams(q)) || '(none)',
      q,
    ]),
  )('round-trips %s through the address', (_, q) => {
    const params = galleryQueryToParams(q);
    expect(galleryQueryFromParams(params)).toEqual(q);
    expect(
      galleryQueryFromParams(new URLSearchParams(toSearch(params))),
    ).toEqual(q);
  });

  it('writes nothing for the unfiltered, newest-first gallery', () => {
    expect(galleryQueryToParams(query())).toEqual({});
  });

  it('writes every filter and the sort', () => {
    const q = query({
      characterIds: ['tigy'],
      artistIds: ['ann'],
      tags: ['chibi'],
      year: 2025,
      sort: 'oldest',
    });
    expect(galleryQueryToParams(q)).toEqual({
      character: ['tigy'],
      artist: ['ann'],
      tag: ['chibi'],
      year: '2025',
      sort: 'oldest',
    });
  });

  it('reads a %20 or a + as a space', () => {
    expect(
      galleryQueryFromParams(new URLSearchParams('tag=reference%20sheet')).tags,
    ).toEqual(['reference sheet']);
    expect(
      galleryQueryFromParams(new URLSearchParams('tag=reference+sheet')).tags,
    ).toEqual(['reference sheet']);
  });

  it('normalises a tag typed by hand', () => {
    expect(galleryQueryFromParams({ tag: ' Reference  Sheet' }).tags).toEqual([
      'reference sheet',
    ]);
  });

  it('falls back to the unfiltered, newest-first gallery for unknown or malformed parameters', () => {
    const malformed = new URLSearchParams(
      'utm_source=bsky&page=3&character=a/b&artist=&tag=%20&year=25&year=twenty&sort=random',
    );
    expect(galleryQueryFromParams(malformed)).toEqual(UNFILTERED_QUERY);
    expect(
      galleryQueryFromParams({
        character: { nested: 'x' },
        year: ['abc'],
        sort: 'OLDEST',
      }),
    ).toEqual(UNFILTERED_QUERY);
  });

  it('keeps the valid parameters next to malformed ones', () => {
    const params = new URLSearchParams(
      'character=tigy&character=a/b&year=abc&year=2024&sort=oldest',
    );
    expect(galleryQueryFromParams(params)).toEqual(
      query({ characterIds: ['tigy'], year: 2024, sort: 'oldest' }),
    );
  });

  it('drops repeated people and tags', () => {
    expect(
      galleryQueryFromParams({
        character: ['tigy', 'tigy'],
        tag: ['Chibi', 'chibi'],
      }),
    ).toEqual(query({ characterIds: ['tigy'], tags: ['chibi'] }));
  });
});
