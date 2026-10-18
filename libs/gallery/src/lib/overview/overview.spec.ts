import { galleryOverview, neighbours } from './overview';
import { aRow } from '../../testing/builders';

describe('galleryOverview', () => {
  const rows = [
    aRow('a', '2026-04-08', {
      tags: ['chibi'],
      characterIds: ['tigy'],
      artistIds: ['ann'],
    }),
    aRow('b', '2025-12-03', {
      tags: ['chibi', 'comic'],
      characterIds: ['tigy', 'pookie'],
      artistIds: ['ann', 'bob'],
    }),
    aRow('n', '2024-06-01', {
      nsfw: true,
      tags: ['lewd'],
      characterIds: ['tigy', 'secret'],
      artistIds: ['nsfw-artist'],
    }),
    aRow('c', '2019-01-01', {
      tags: ['sticker'],
      characterIds: ['tigy'],
      artistIds: ['bob'],
    }),
  ];

  it('Tag used only on NSFW pieces: not offered with the switch off', () => {
    const off = galleryOverview(rows, false);
    expect(off.tags.map((c) => c.value)).not.toContain('lewd');
    expect(off.characters.map((c) => c.value)).not.toContain('secret');
    expect(off.artists.map((c) => c.value)).not.toContain('nsfw-artist');
    expect(galleryOverview(rows, true).tags.map((c) => c.value)).toContain(
      'lewd',
    );
  });

  it('Timeline before scrolling: marks every year with a visible piece, newest first', () => {
    expect(galleryOverview(rows, false).years).toEqual([
      { year: 2026, count: 1 },
      { year: 2025, count: 1 },
      { year: 2019, count: 1 },
    ]);
    expect(galleryOverview(rows, true).years.map((y) => y.year)).toEqual([
      2026, 2025, 2024, 2019,
    ]);
  });

  it('counts and dates only the visible pieces', () => {
    expect(galleryOverview(rows, false)).toMatchObject({
      count: 3,
      oldest: '2019-01-01',
      newest: '2026-04-08',
    });
    expect(galleryOverview(rows, true).count).toBe(4);
  });

  it('orders choices by use, then alphabetically', () => {
    const off = galleryOverview(rows, false);
    expect(off.tags).toEqual([
      { value: 'chibi', count: 2 },
      { value: 'comic', count: 1 },
      { value: 'sticker', count: 1 },
    ]);
    expect(off.characters).toEqual([
      { value: 'tigy', count: 3 },
      { value: 'pookie', count: 1 },
    ]);
    expect(off.artists).toEqual([
      { value: 'ann', count: 2 },
      { value: 'bob', count: 2 },
    ]);
  });

  it('has no date range for an empty gallery', () => {
    expect(galleryOverview([], false)).toEqual({
      count: 0,
      years: [],
      tags: [],
      characters: [],
      artists: [],
    });
  });
});

describe('neighbours', () => {
  const rows = [
    aRow('newest', '2026-01-01'),
    aRow('current', '2025-06-01'),
    aRow('nsfw', '2025-03-01', { nsfw: true }),
    aRow('older', '2025-01-01'),
  ];

  it('Next skips an NSFW piece with the switch off', () => {
    const result = neighbours(rows, 'current', false);
    expect(result.previous?.id).toBe('newest');
    expect(result.next?.id).toBe('older');
  });

  it('includes the NSFW piece with the switch on', () => {
    expect(neighbours(rows, 'current', true).next?.id).toBe('nsfw');
  });

  it('finds the neighbours of an NSFW piece opened with the switch off', () => {
    const result = neighbours(rows, 'nsfw', false);
    expect(result.previous?.id).toBe('current');
    expect(result.next?.id).toBe('older');
  });

  it('has no previous at the newest piece and no next at the oldest', () => {
    expect(neighbours(rows, 'newest', false).previous).toBeUndefined();
    expect(neighbours(rows, 'older', false).next).toBeUndefined();
  });

  it('breaks ties on the same day by ID', () => {
    const sameDay = [
      aRow('a', '2025-01-01'),
      aRow('b', '2025-01-01'),
      aRow('c', '2025-01-01'),
    ];
    const result = neighbours(sameDay, 'b', false);
    expect(result.previous?.id).toBe('c');
    expect(result.next?.id).toBe('a');
  });

  it('is empty for a piece that is not in the gallery', () => {
    expect(neighbours(rows, 'unpublished', true)).toEqual({});
  });
});
