import type { GalleryRow, Image, Person, WithId } from '@tigy/models';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type {
  ArtworkResponse,
  GalleryResponse,
  HomeResponse,
  PeopleResponse,
} from '../api/types';
import { apiRouter, CDN_CACHE_CONTROL } from './api';
import type { Catalog } from './catalog';
import { SummaryCache } from './summary-cache';

const file = {
  original: 'images/x/original.png',
  w: 512,
  h: 512,
  bytes: 1,
  mime: 'image/png',
  animated: false,
  transparent: false,
};

function row(
  id: string,
  sortDate: string,
  fields: Partial<GalleryRow> = {},
): GalleryRow {
  return {
    id,
    sortDate,
    w: 512,
    h: 512,
    nsfw: false,
    artistIds: ['ann'],
    characterIds: ['tigy'],
    tags: [],
    ...fields,
  };
}

/** 30 SFW pieces, one a day from 2025-01-01 (`p01` oldest), plus one NSFW piece. */
const ROWS: GalleryRow[] = [
  ...Array.from({ length: 30 }, (_, i) =>
    row(
      `p${String(i + 1).padStart(2, '0')}`,
      new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10),
      { title: `Piece ${i + 1}` },
    ),
  ),
  row('lewd', '2025-01-15', {
    nsfw: true,
    title: 'NSFW title',
    artistIds: ['nsfw-artist'],
    characterIds: ['tigy', 'secret'],
    tags: ['lewd'],
  }),
];

const PEOPLE: WithId<Person>[] = [
  {
    id: 'tigy',
    name: 'Tigy',
    avatar: 'people/tigy.webp',
    links: [
      {
        network: 'bluesky',
        handle: 'tigy',
        url: 'https://bsky.app/profile/tigy',
      },
    ],
  },
  {
    id: 'ann',
    name: 'Ann',
    links: [{ network: 'twitter', handle: 'ann', url: 'https://x.com/ann' }],
  },
  { id: 'bob', name: 'Bob', links: [] },
  { id: 'nsfw-artist', name: 'Night Artist', links: [] },
  { id: 'secret', name: 'Secret', links: [] },
] as WithId<Person>[];

const IMAGES: Record<string, Partial<Image>> = {
  p15: {
    title: 'Piece 15',
    sortDate: '2025-01-15',
    published: true,
    nsfw: false,
    artistIds: ['bob', 'ann'],
    characterIds: ['tigy', 'gone'],
    tags: ['comic'],
    file,
  },
  lewd: {
    title: 'NSFW title',
    sortDate: '2025-01-15',
    published: true,
    nsfw: true,
    artistIds: ['nsfw-artist'],
    characterIds: ['tigy', 'secret'],
    tags: ['lewd'],
    file,
  },
  draft: {
    title: 'Draft',
    sortDate: '2025-02-01',
    published: false,
    nsfw: false,
    artistIds: ['ann'],
    characterIds: ['tigy'],
    tags: [],
    file,
  },
};

let server: Server;
let base: string;
let summaryReads: string[];
let people: WithId<Person>[];

beforeEach(async () => {
  summaryReads = [];
  people = PEOPLE;
  const catalog: Catalog = {
    summaries: new SummaryCache(async (path) => {
      summaryReads.push(path);
      return JSON.stringify(
        path === 'meta/gallery'
          ? ROWS
          : people.map(({ id, name, avatar }) => ({
              id,
              name,
              ...(avatar && { avatar }),
            })),
      );
    }),
    image: async (id) =>
      IMAGES[id] ? ({ ...IMAGES[id], id } as WithId<Image>) : null,
    people: async (ids) =>
      new Map(people.filter((p) => ids.includes(p.id)).map((p) => [p.id, p])),
  };
  const app = express();
  app.use('/api', apiRouter(catalog));
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

async function get<T>(
  path: string,
): Promise<{ status: number; body: T; headers: Headers }> {
  const response = await fetch(base + path);
  return {
    status: response.status,
    body: (await response.json()) as T,
    headers: response.headers,
  };
}

const ids = (body: GalleryResponse) => body.rows.map((r) => r.id);

describe('GET /api/gallery', () => {
  it('returns the newest 24 pieces, whether more remain, and the overview', async () => {
    const { body } = await get<GalleryResponse>('/api/gallery');
    expect(ids(body)).toHaveLength(24);
    expect(ids(body)[0]).toBe('p30');
    expect(body.hasMore).toBe(true);
    expect(body.overview).toMatchObject({
      count: 30,
      oldest: '2025-01-01',
      newest: '2025-01-30',
    });
  });

  it('never reads meta/people for an unfiltered gallery', async () => {
    await get('/api/gallery');
    await get('/api/gallery?after=2025-01-07_p07');
    expect(summaryReads).toEqual(['meta/gallery']);
  });

  it('Changing the sort after scrolling: starts again with the first 24 in the new order', async () => {
    const first = (await get<GalleryResponse>('/api/gallery')).body;
    const second = (
      await get<GalleryResponse>('/api/gallery?after=2025-01-07_p07')
    ).body;
    expect(ids(second)).toEqual(['p06', 'p05', 'p04', 'p03', 'p02', 'p01']);
    expect(second.hasMore).toBe(false);
    expect(ids(first)).not.toContain('p01');

    const oldest = (await get<GalleryResponse>('/api/gallery?sort=oldest'))
      .body;
    expect(ids(oldest).slice(0, 3)).toEqual(['p01', 'p02', 'p03']);
    expect(ids(oldest)).toHaveLength(24);
  });

  it('Switch on: includes NSFW pieces in date order', async () => {
    const { body } = await get<GalleryResponse>(
      '/api/gallery?nsfw=1&after=2025-01-16_p16',
    );
    expect(ids(body).slice(0, 3)).toEqual(['p15', 'lewd', 'p14']);
    expect(body.overview.count).toBe(31);
  });

  it.each([
    '',
    '?nsfw=0',
    '?nsfw=true',
    '?tag=lewd',
    '?character=secret',
    '?after=2025-01-16_p16',
  ])('never returns an NSFW row without the flag (%s)', async (query) => {
    const { body } = await get<GalleryResponse>(`/api/gallery${query}`);
    expect(JSON.stringify(body)).not.toContain('NSFW title');
    expect(body.rows.every((r) => !r.nsfw)).toBe(true);
    expect(body.overview.tags.map((c) => c.value)).not.toContain('lewd');
  });

  it('applies filters to every piece', async () => {
    const { body } = await get<GalleryResponse>('/api/gallery?year=2024');
    expect(body).toMatchObject({ rows: [], hasMore: false });
  });

  it('refuses a malformed cursor', async () => {
    const { status } = await get('/api/gallery?after=yesterday');
    expect(status).toBe(400);
  });
});

describe('GET /api/people', () => {
  it('leaves out a person credited only on NSFW pieces while the switch is off', async () => {
    const { body } = await get<PeopleResponse>('/api/people');
    expect(body.artists).toEqual([{ id: 'ann', name: 'Ann', count: 30 }]);
    expect(body.characters).toEqual([
      { id: 'tigy', name: 'Tigy', avatar: 'people/tigy.webp', count: 30 },
    ]);
  });

  it('includes them with the switch on', async () => {
    const { body } = await get<PeopleResponse>('/api/people?nsfw=1');
    expect(body.artists.map((p) => p.id)).toEqual(['ann', 'nsfw-artist']);
    expect(body.characters.map((p) => p.id)).toEqual(['tigy', 'secret']);
  });

  it('leaves out a credited person who is missing from meta/people', async () => {
    people = PEOPLE.filter((p) => p.id !== 'ann');
    const { body } = await get<PeopleResponse>('/api/people');
    expect(body.artists).toEqual([]);
  });
});

describe('GET /api/artworks/:id', () => {
  it('Unpublished artwork: not found, like a missing one', async () => {
    expect((await get('/api/artworks/draft')).status).toBe(404);
    expect((await get('/api/artworks/missing')).status).toBe(404);
  });

  it('Credit order: lists the people in the order the owner set', async () => {
    const { body } = await get<ArtworkResponse>('/api/artworks/p15');
    expect(body.artists.map((p) => p.id)).toEqual(['bob', 'ann']);
    expect(body.artists[1].links).toEqual([
      { network: 'twitter', handle: 'ann', url: 'https://x.com/ann' },
    ]);
  });

  it('Missing person: renders without that credit', async () => {
    const { body } = await get<ArtworkResponse>('/api/artworks/p15');
    expect(body.characters.map((p) => p.id)).toEqual(['tigy']);
  });

  it('Tigy credited as a character: marked as the site’s own, with no links', async () => {
    const { body } = await get<ArtworkResponse>('/api/artworks/p15');
    expect(body.characters[0]).toEqual({
      id: 'tigy',
      name: 'Tigy',
      avatar: 'people/tigy.webp',
      links: [],
      own: true,
    });
  });

  it('returns the artwork and its previous and next pieces, skipping NSFW with the switch off', async () => {
    const { body } = await get<ArtworkResponse>('/api/artworks/p15');
    expect(body.artwork).toMatchObject({
      id: 'p15',
      title: 'Piece 15',
      tags: ['comic'],
      file: { w: 512 },
    });
    expect(body.previous).toEqual({ id: 'p16', title: 'Piece 16' });
    expect(body.next).toEqual({ id: 'p14', title: 'Piece 14' });
    expect(
      (await get<ArtworkResponse>('/api/artworks/p15?nsfw=1')).body.next,
    ).toEqual({ id: 'lewd', title: 'NSFW title' });
  });

  it('returns an NSFW artwork’s details, which wait behind the confirm screen', async () => {
    const { status, body } = await get<ArtworkResponse>('/api/artworks/lewd');
    expect(status).toBe(200);
    expect(body.artwork).toMatchObject({ title: 'NSFW title', nsfw: true });
  });
});

describe('GET /api/home', () => {
  it('returns Tigy with links, and the count, dates and years of visible pieces', async () => {
    const { body } = await get<HomeResponse>('/api/home');
    expect(body.owner).toEqual({
      name: 'Tigy',
      avatar: 'people/tigy.webp',
      links: PEOPLE[0].links,
    });
    expect(body).toMatchObject({
      count: 30,
      oldest: '2025-01-01',
      newest: '2025-01-30',
      years: [{ year: 2025, count: 30 }],
    });
    expect((await get<HomeResponse>('/api/home?nsfw=1')).body.count).toBe(31);
  });
});

describe('Crawling the data endpoints', () => {
  it.each([
    '/api/gallery',
    '/api/people',
    '/api/artworks/p15',
    '/api/artworks/missing',
    '/api/home',
    '/api/unknown',
  ])(
    '%s tells search engines not to index it and may be cached by the CDN',
    async (path) => {
      const { headers } = await get(path);
      expect(headers.get('x-robots-tag')).toBe('noindex');
      expect(headers.get('cache-control')).toBe(CDN_CACHE_CONTROL);
    },
  );
});
