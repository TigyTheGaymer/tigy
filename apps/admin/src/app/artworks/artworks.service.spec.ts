import type { Image } from '@tigy/models';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { artwork, FakeArtworksApi, settle } from '../testing';
import { ARTWORKS_API } from './artworks-api';
import {
  ArtworksService,
  countArtworks,
  missing,
  parseView,
  type ArtworkView,
} from './artworks.service';

async function service(api: FakeArtworksApi) {
  TestBed.configureTestingModule({
    providers: [{ provide: ARTWORKS_API, useValue: api }],
  });
  const artworks = TestBed.inject(ArtworksService);
  artworks.artworks();
  await settle();
  return artworks;
}

const ids = (list: { id: string }[]) => list.map((a) => a.id);

const done: Partial<Image> = {
  title: 'Done',
  date: '2024',
  artistIds: ['ann'],
};

describe('missing', () => {
  it('names each gap: no artist, no title, no date', () => {
    expect(missing(artwork('a'))).toEqual(['artist', 'title', 'date']);
    expect(missing(artwork('a', { ...done, artistIds: [] }))).toEqual([
      'artist',
    ]);
    expect(missing(artwork('a', { ...done, title: undefined }))).toEqual([
      'title',
    ]);
    expect(missing(artwork('a', { ...done, date: undefined }))).toEqual([
      'date',
    ]);
  });

  it('never counts characters or tags', () => {
    expect(
      missing(artwork('a', { ...done, characterIds: [], tags: [] })),
    ).toEqual([]);
  });
});

describe('parseView', () => {
  it('reads a known view and falls back to All', () => {
    expect(parseView('needs-work')).toBe('needs-work');
    expect(parseView('nope')).toBe('all');
    expect(parseView(undefined)).toBe('all');
  });
});

describe('countArtworks', () => {
  it('Counts in the admin: 290 published SFW, 22 published NSFW and 5 unpublished', () => {
    const list = [
      ...Array.from({ length: 290 }, (_, i) =>
        artwork(`s${i}`, { published: true }),
      ),
      ...Array.from({ length: 22 }, (_, i) =>
        artwork(`n${i}`, { published: true, nsfw: true }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        artwork(`u${i}`, { nsfw: i === 0 }),
      ),
    ];
    expect(countArtworks(list)).toEqual(
      expect.objectContaining({ sfw: 290, nsfw: 22, unpublished: 5 }),
    );
  });
});

describe('ArtworksService', () => {
  const list = [
    artwork('b', { sortDate: '2024-01-01', published: true, ...done }),
    artwork('a', { sortDate: '2024-01-01', published: true, nsfw: true }),
    artwork('c', { sortDate: '2025-06-01', title: 'Pool day' }),
    artwork('d', {
      sortDate: '2019-01-01',
      published: true,
      nsfw: true,
      ...done,
      title: 'The POOL party',
    }),
  ];

  it('orders newest first, then by ID, descending, as the gallery does', async () => {
    const artworks = await service(new FakeArtworksApi(list));
    expect(ids(artworks.artworks())).toEqual(['c', 'b', 'a', 'd']);
  });

  it.each<[ArtworkView, string[]]>([
    ['all', ['c', 'b', 'a', 'd']],
    ['unpublished', ['c']],
    ['sfw', ['b']],
    ['nsfw', ['a', 'd']],
    ['needs-work', ['c', 'a']],
  ])('keeps the %s view', async (view, expected) => {
    const artworks = await service(new FakeArtworksApi(list));
    const filtered = TestBed.runInInjectionContext(() =>
      artworks.filtered(
        () => view,
        () => '',
      ),
    );
    expect(ids(filtered())).toEqual(expected);
  });

  it('Search within a view: combines the view with a title search, ignoring case', async () => {
    const artworks = await service(new FakeArtworksApi(list));
    const search = signal('pool');
    const filtered = artworks.filtered(() => 'nsfw', search);
    expect(ids(filtered())).toEqual(['d']);
    search.set('POOL');
    expect(ids(artworks.filtered(() => 'all', search)())).toEqual(['c', 'd']);
  });

  it('follows the live list and its counts', async () => {
    const api = new FakeArtworksApi(list);
    const artworks = await service(api);
    expect(artworks.counts()).toEqual({
      sfw: 1,
      nsfw: 2,
      unpublished: 1,
      needsWork: 2,
    });
    await artworks.updateMany(['c'], { published: true });
    expect(artworks.counts()).toEqual(
      expect.objectContaining({ sfw: 2, unpublished: 0 }),
    );
  });

  it('reports a snapshot error', async () => {
    const api = new FakeArtworksApi(list);
    const artworks = await service(api);
    api.fail();
    await settle();
    expect(artworks.error()).toBeInstanceOf(Error);
    expect(artworks.artworks()).toEqual([]);
  });
});
