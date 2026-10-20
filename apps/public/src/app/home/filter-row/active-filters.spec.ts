import { galleryQueryFromParams } from '@tigy/gallery';
import { activeFilters } from './active-filters';

const names: Record<string, string> = { tigy: 'Tigy', ari: 'Ari' };
const personName = (id: string) => names[id] ?? null;

describe('activeFilters', () => {
  it('names every filter, in the order characters, artists, tags, year', () => {
    const query = galleryQueryFromParams({
      character: 'tigy',
      artist: 'ari',
      tag: ['comic', 'couple'],
      year: '2025',
    });
    expect(
      activeFilters(query, personName).map((f) => `${f.kind}: ${f.name}`),
    ).toEqual([
      'Character: Tigy',
      'Artist: Ari',
      'Tag: comic',
      'Tag: couple',
      'Year: 2025',
    ]);
  });

  it('Removing one filter: keeps the others and the sort', () => {
    const query = galleryQueryFromParams({
      tag: ['comic', 'couple'],
      sort: 'oldest',
    });
    const [comic] = activeFilters(query, personName);
    expect(comic.remove).toEqual({ tag: ['couple'], sort: 'oldest' });
  });

  it("shows an ellipsis while a person's name loads", () => {
    const query = galleryQueryFromParams({ character: 'unknown' });
    expect(activeFilters(query, personName)[0].name).toBe('…');
  });

  it('has no filters for the plain gallery', () => {
    expect(activeFilters(galleryQueryFromParams({}), personName)).toEqual([]);
  });
});
