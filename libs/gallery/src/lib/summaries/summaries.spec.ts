import {
  adjustTagCounts,
  buildGalleryItems,
  buildPeopleItems,
  buildTagCounts,
  parseGalleryItems,
  parsePeopleItems,
  toGalleryRow,
  withGalleryRow,
  withPeopleEntry,
} from './summaries';
import { anImage, aPerson } from '../../testing/builders';

describe('toGalleryRow', () => {
  it('copies what a tile and the filters need, and nothing else', () => {
    const image = anImage('k3x', {
      title: 'Hey Pookie!',
      description: 'A comic',
      sortDate: '2026-02-14',
      nsfw: true,
      artistIds: ['lead', 'second'],
      characterIds: ['tigy', 'pookie'],
      tags: ['comic'],
    });
    image.file.w = 1530;
    image.file.h = 2000;
    expect(toGalleryRow(image)).toEqual({
      id: 'k3x',
      title: 'Hey Pookie!',
      sortDate: '2026-02-14',
      w: 1530,
      h: 2000,
      nsfw: true,
      artistIds: ['lead', 'second'],
      characterIds: ['tigy', 'pookie'],
      tags: ['comic'],
    });
  });

  it('leaves out a missing title', () => {
    expect(toGalleryRow(anImage('k3x'))).not.toHaveProperty('title');
  });

  it('marks a video row, and leaves an image row without the field', () => {
    const video = anImage('vid');
    video.file.mime = 'video/mp4';
    expect(toGalleryRow(video).isVideo).toBe(true);
    expect(toGalleryRow(anImage('k3x'))).not.toHaveProperty('isVideo');
  });
});

describe('buildGalleryItems', () => {
  it('lists only published images, newest first, as JSON', () => {
    const items = buildGalleryItems([
      anImage('old', { sortDate: '2019-01-01' }),
      anImage('draft', { published: false }),
      anImage('new', { sortDate: '2026-04-08' }),
    ]);
    expect(typeof items).toBe('string');
    expect(parseGalleryItems(items).map((row) => row.id)).toEqual([
      'new',
      'old',
    ]);
  });
});

describe('buildPeopleItems', () => {
  it('lists every person with ID, name and avatar only', () => {
    const items = buildPeopleItems([
      aPerson('tigy', {
        name: 'Tigy',
        avatar: 'people/tigy.webp',
        links: [
          { network: 'bluesky', handle: 'tigy', url: 'https://bsky.app' },
        ],
      }),
      aPerson('artist', { name: 'An Artist' }),
    ]);
    expect(parsePeopleItems(items)).toEqual([
      { id: 'artist', name: 'An Artist' },
      { id: 'tigy', name: 'Tigy', avatar: 'people/tigy.webp' },
    ]);
  });
});

describe('buildTagCounts', () => {
  it('counts tags on unpublished pieces too, though they are left out of the rows', () => {
    const images = [
      anImage('a', { tags: ['chibi', 'sticker'] }),
      anImage('draft', { published: false, tags: ['chibi', 'wip'] }),
    ];
    expect(buildTagCounts(images)).toEqual({ chibi: 2, sticker: 1, wip: 1 });
    expect(
      parseGalleryItems(buildGalleryItems(images)).map((row) => row.id),
    ).toEqual(['a']);
  });
});

describe('adjustTagCounts', () => {
  it('counts a new image', () => {
    expect(adjustTagCounts({ chibi: 1 }, [], ['chibi', 'comic'])).toEqual({
      chibi: 2,
      comic: 1,
    });
  });

  it('removes a tag when its count reaches 0', () => {
    expect(
      adjustTagCounts({ chibi: 2, comic: 1 }, ['chibi', 'comic'], ['chibi']),
    ).toEqual({ chibi: 2 });
  });

  it('removes a deleted image', () => {
    expect(
      adjustTagCounts({ chibi: 2, comic: 1 }, ['chibi', 'comic'], []),
    ).toEqual({ chibi: 1 });
  });

  it('counts a tag named like a built-in object property', () => {
    const counts = buildTagCounts([
      anImage('a', { tags: ['constructor'] }),
      anImage('b', { tags: ['constructor', 'chibi'] }),
    ]);
    expect(counts).toEqual({ constructor: 2, chibi: 1 });
    expect(adjustTagCounts({}, [], ['constructor'])).toEqual({
      constructor: 1,
    });
    expect(adjustTagCounts(counts, ['constructor'], [])).toEqual({
      constructor: 1,
      chibi: 1,
    });
    expect(adjustTagCounts({ chibi: 1 }, ['constructor'], [])).toEqual({
      chibi: 1,
    });
  });

  it('does not change the counts passed in', () => {
    const counts = { chibi: 1 };
    adjustTagCounts(counts, ['chibi'], []);
    expect(counts).toEqual({ chibi: 1 });
  });
});

describe('withGalleryRow', () => {
  const rows = [
    toGalleryRow(anImage('a', { sortDate: '2026-01-01' })),
    toGalleryRow(anImage('b', { sortDate: '2025-01-01' })),
  ];

  it('adds a published image in its place', () => {
    const image = anImage('c', { sortDate: '2025-06-01' });
    expect(withGalleryRow(rows, 'c', image).map((row) => row.id)).toEqual([
      'a',
      'c',
      'b',
    ]);
  });

  it('replaces an edited image', () => {
    const image = anImage('b', { sortDate: '2027-01-01', title: 'Retitled' });
    const result = withGalleryRow(rows, 'b', image);
    expect(result.map((row) => row.id)).toEqual(['b', 'a']);
    expect(result[0].title).toBe('Retitled');
  });

  it('removes an unpublished or deleted image', () => {
    expect(
      withGalleryRow(rows, 'a', anImage('a', { published: false })).map(
        (row) => row.id,
      ),
    ).toEqual(['b']);
    expect(withGalleryRow(rows, 'a', null).map((row) => row.id)).toEqual(['b']);
  });
});

describe('withPeopleEntry', () => {
  const entries = [{ id: 'a', name: 'A' }];

  it('adds, renames and removes a person', () => {
    expect(withPeopleEntry(entries, 'b', aPerson('b', { name: 'B' }))).toEqual([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]);
    expect(
      withPeopleEntry(entries, 'a', aPerson('a', { name: 'Renamed' })),
    ).toEqual([{ id: 'a', name: 'Renamed' }]);
    expect(withPeopleEntry(entries, 'a', null)).toEqual([]);
  });
});
