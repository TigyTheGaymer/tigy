import type { GalleryRow, PeopleEntry } from '@tigy/models';
import { clearEmulators, db, readItems } from '../testing/emulators';
import { NOT_OWNER, OWNER, requestFrom } from '../testing/requests';
import { rebuildSummariesCallable } from './rebuild-summaries';

const file = {
  original: 'x',
  w: 512,
  h: 512,
  bytes: 1,
  mime: 'image/png',
  animated: false,
  transparent: false,
};

beforeEach(async () => {
  await clearEmulators();
  await db.doc('images/pub').set({
    sortDate: '2026-01-01',
    published: true,
    nsfw: false,
    artistIds: ['ann'],
    characterIds: ['tigy'],
    tags: ['chibi'],
    file,
  });
  await db.doc('images/nsfw').set({
    sortDate: '2025-01-01',
    published: true,
    nsfw: true,
    artistIds: ['ann'],
    characterIds: ['tigy'],
    tags: ['chibi', 'lewd'],
    file,
  });
  await db.doc('images/draft').set({
    sortDate: '2024-01-01',
    published: false,
    nsfw: false,
    artistIds: ['ann'],
    characterIds: ['tigy'],
    tags: ['wip'],
    file,
  });
  await db.doc('people/tigy').set({ name: 'Tigy', links: [] });
  await db.doc('people/ann').set({ name: 'Ann', links: [] });
  // Summaries that have drifted from the images and people.
  await db.doc('meta/gallery').set({ items: JSON.stringify([{ id: 'gone' }]) });
  await db.doc('meta/people').set({ items: '[]' });
  await db.doc('meta/tags').set({ counts: { chibi: 9, stale: 3 } });
});

it('restores deliberately corrupted summaries for the owner', async () => {
  const result = await rebuildSummariesCallable.run(requestFrom(OWNER, {}));

  expect(result).toEqual({ images: 3, people: 2, tags: 3 });
  expect(
    (await readItems<GalleryRow>('meta/gallery'))?.map((row) => row.id),
  ).toEqual(['pub', 'nsfw']);
  expect(await readItems<PeopleEntry>('meta/people')).toEqual([
    { id: 'ann', name: 'Ann' },
    { id: 'tigy', name: 'Tigy' },
  ]);
  expect((await db.doc('meta/tags').get()).get('counts')).toEqual({
    chibi: 2,
    lewd: 1,
    wip: 1,
  });
});

it.each(NOT_OWNER)('refuses %s and changes nothing', async (_, claims) => {
  await expect(
    rebuildSummariesCallable.run(requestFrom(claims, {})),
  ).rejects.toMatchObject({
    code: 'permission-denied',
  });
  expect((await db.doc('meta/tags').get()).get('counts')).toEqual({
    chibi: 9,
    stale: 3,
  });
});

it('marks a video row when it rebuilds the gallery', async () => {
  await db.doc('images/vid').set({
    sortDate: '2027-01-01',
    published: true,
    nsfw: false,
    artistIds: [],
    characterIds: ['tigy'],
    tags: [],
    file: { ...file, mime: 'video/mp4', durationMs: 4000, hasAudio: false },
  });
  await rebuildSummariesCallable.run(requestFrom(OWNER, {}));
  const rows = await readItems<GalleryRow>('meta/gallery');
  expect(rows?.find((row) => row.id === 'vid')?.isVideo).toBe(true);
  expect(rows?.find((row) => row.id === 'pub')).not.toHaveProperty('isVideo');
});
