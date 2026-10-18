import type { GalleryRow } from '@tigy/models';
import {
  formatCursor,
  type GalleryQuery,
  parseCursor,
  queryGallery,
  UNFILTERED_QUERY,
} from './gallery-query';
import { aRow } from '../../testing/builders';

const query = (fields: Partial<GalleryQuery> = {}): GalleryQuery => ({
  ...UNFILTERED_QUERY,
  ...fields,
});
const ids = (rows: GalleryRow[]) => rows.map((row) => row.id);

/** `count` rows, one per day from 2025-01-01, IDs `p01`, `p02`, ... oldest first. */
function days(count: number, fields: Partial<GalleryRow> = {}): GalleryRow[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10);
    return aRow(`p${String(i + 1).padStart(2, '0')}`, date, fields);
  });
}

describe('queryGallery', () => {
  it('Character, artist and year together: lists only pieces matching all three', () => {
    const rows = [
      aRow('match', '2025-03-01', {
        characterIds: ['tigy', 'pookie'],
        artistIds: ['ann'],
      }),
      aRow('wrong-year', '2024-03-01', {
        characterIds: ['pookie'],
        artistIds: ['ann'],
      }),
      aRow('wrong-artist', '2025-04-01', {
        characterIds: ['pookie'],
        artistIds: ['bob'],
      }),
      aRow('wrong-character', '2025-05-01', {
        characterIds: ['tigy'],
        artistIds: ['ann'],
      }),
    ];
    const page = queryGallery(
      rows,
      query({ characterIds: ['pookie'], artistIds: ['ann'], year: 2025 }),
      { nsfw: false },
    );
    expect(ids(page.rows)).toEqual(['match']);
    expect(page.hasMore).toBe(false);
  });

  it('requires every tag when several are given', () => {
    const rows = [
      aRow('both', '2025-01-01', { tags: ['chibi', 'sticker'] }),
      aRow('one', '2025-01-02', { tags: ['chibi'] }),
    ];
    expect(
      ids(
        queryGallery(rows, query({ tags: ['chibi', 'sticker'] }), {
          nsfw: false,
        }).rows,
      ),
    ).toEqual(['both']);
  });

  it('No matches: returns an empty last page', () => {
    const page = queryGallery(days(5), query({ tags: ['missing'] }), {
      nsfw: false,
    });
    expect(page).toEqual({ rows: [], hasMore: false });
  });

  it('sorts newest first by default, with the ID as the tiebreak', () => {
    const rows = [
      aRow('b', '2025-01-01'),
      aRow('c', '2026-01-01'),
      aRow('a', '2025-01-01'),
    ];
    expect(ids(queryGallery(rows, query(), { nsfw: false }).rows)).toEqual([
      'c',
      'b',
      'a',
    ]);
  });

  it('Oldest first with a filter: starts with the oldest match, even one that is last newest-first', () => {
    const rows = [
      ...days(60),
      aRow('oldest-pookie', '2019-01-01', { characterIds: ['pookie'] }),
    ];
    rows[59].characterIds = ['pookie'];
    const page = queryGallery(
      rows,
      query({ characterIds: ['pookie'], sort: 'oldest' }),
      { nsfw: false },
    );
    expect(ids(page.rows)).toEqual(['oldest-pookie', 'p60']);
    expect(
      ids(queryGallery(rows, query(), { nsfw: false, limit: 100 }).rows).at(-1),
    ).toBe('oldest-pookie');
  });

  it('Scrolling to the second page: the remaining 6 of 30 follow in order, and the end is reached', () => {
    const rows = days(30);
    const first = queryGallery(rows, query(), { nsfw: false });
    expect(first.rows).toHaveLength(24);
    expect(first.hasMore).toBe(true);
    const second = queryGallery(rows, query(), {
      nsfw: false,
      after: first.rows[23],
    });
    expect(ids(second.rows)).toEqual([
      'p06',
      'p05',
      'p04',
      'p03',
      'p02',
      'p01',
    ]);
    expect(second.hasMore).toBe(false);
  });

  it('A piece is published while scrolling: the next page continues after the 24th, with none repeated', () => {
    const rows = days(30);
    const first = queryGallery(rows, query(), { nsfw: false });
    const published = [...rows, aRow('new', '2026-01-01')];
    const second = queryGallery(published, query(), {
      nsfw: false,
      after: first.rows[23],
    });
    expect(ids(second.rows)).toEqual([
      'p06',
      'p05',
      'p04',
      'p03',
      'p02',
      'p01',
    ]);
  });

  it('continues after a cursor whose piece no longer exists', () => {
    const rows = days(30);
    const first = queryGallery(rows, query(), { nsfw: false });
    const unpublished = rows.filter((row) => row.id !== first.rows[23].id);
    expect(
      ids(
        queryGallery(unpublished, query(), {
          nsfw: false,
          after: first.rows[23],
        }).rows,
      )[0],
    ).toBe('p06');
  });

  it('continues oldest first after a cursor', () => {
    const page = queryGallery(days(30), query({ sort: 'oldest' }), {
      nsfw: false,
      after: { sortDate: '2025-01-24', id: 'p24' },
    });
    expect(ids(page.rows)).toEqual(['p25', 'p26', 'p27', 'p28', 'p29', 'p30']);
  });

  it('Switch off: leaves NSFW pieces out; switch on: includes them in date order', () => {
    const rows = [
      aRow('a', '2025-01-03'),
      aRow('nsfw', '2025-01-02', { nsfw: true }),
      aRow('c', '2025-01-01'),
    ];
    expect(ids(queryGallery(rows, query(), { nsfw: false }).rows)).toEqual([
      'a',
      'c',
    ]);
    expect(ids(queryGallery(rows, query(), { nsfw: true }).rows)).toEqual([
      'a',
      'nsfw',
      'c',
    ]);
  });

  it('does not reorder the rows passed in', () => {
    const rows = days(3);
    queryGallery(rows, query(), { nsfw: false });
    expect(ids(rows)).toEqual(['p01', 'p02', 'p03']);
  });
});

describe('UNFILTERED_QUERY', () => {
  it('cannot be changed through a copy', () => {
    const copy = { ...UNFILTERED_QUERY };
    expect(() => (copy.tags as string[]).push('chibi')).toThrow(TypeError);
    expect(UNFILTERED_QUERY.tags).toEqual([]);
  });
});

describe('cursor', () => {
  it('round-trips through the after parameter', () => {
    const cursor = { sortDate: '2025-11-20', id: 'k3xQ9a_b' };
    expect(formatCursor(cursor)).toBe('2025-11-20_k3xQ9a_b');
    expect(parseCursor(formatCursor(cursor))).toEqual(cursor);
  });

  it.each([
    '',
    'k3x',
    '2025-11-20',
    '2025-11-20_',
    '20251120_k3x',
    '2025-11-20_a/b',
  ])('rejects %j', (value) => {
    expect(parseCursor(value)).toBeNull();
  });
});
