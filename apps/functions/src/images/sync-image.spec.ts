import type { GalleryRow, Image } from '@tigy/models';
import * as logger from 'firebase-functions/logger';
import { bucket, clearEmulators, db, readItems } from '../testing/emulators';
import { onImageWritten, syncImage } from './sync-image';

vi.mock('firebase-functions/logger', async (original) => ({
  ...(await original<typeof import('firebase-functions/logger')>()),
  warn: vi.fn(),
}));

const FILES = ['thumb.webp', 'full.webp', 'original.png'];

function image(fields: Partial<Image> = {}): Partial<Image> {
  return {
    title: 'Happy Tigy',
    sortDate: '2025-12-03',
    published: true,
    nsfw: false,
    artistIds: ['ann'],
    characterIds: ['tigy'],
    tags: ['chibi'],
    file: {
      original: 'images/k3x/original.png',
      w: 512,
      h: 512,
      bytes: 1000,
      mime: 'image/png',
      animated: false,
      transparent: true,
    },
    ...fields,
  };
}

/** Writes an image and runs the sync the trigger would run for that write. */
async function write(
  id: string,
  fields: Partial<Image>,
  tagsBefore: string[] = [],
) {
  await db.doc(`images/${id}`).set(image(fields));
  await syncImage(id, tagsBefore, fields.tags ?? image().tags ?? []);
}

const rows = () => readItems<GalleryRow>('meta/gallery');
const counts = async () => (await db.doc('meta/tags').get()).get('counts');

beforeEach(async () => {
  await clearEmulators();
  vi.mocked(logger.warn).mockClear();
});

it('publishing an image adds its row and counts its tags', async () => {
  await write('k3x', {});
  expect(await rows()).toEqual([
    expect.objectContaining({ id: 'k3x', title: 'Happy Tigy', w: 512, h: 512 }),
  ]);
  expect(await counts()).toEqual({ chibi: 1 });
});

it('Publishing later: the row appears once the image is published', async () => {
  await write('k3x', { published: false, tags: ['wip'] });
  expect(await rows()).toEqual([]);
  expect(await counts()).toEqual({ wip: 1 });

  await write('k3x', { published: true, tags: ['wip'] }, ['wip']);
  expect((await rows())?.map((row) => row.id)).toEqual(['k3x']);
  expect(await counts()).toEqual({ wip: 1 });
});

it('editing an image replaces its row and moves its tag counts', async () => {
  await write('k3x', {});
  await write('k3x', { title: 'Very happy Tigy', tags: ['sticker'] }, [
    'chibi',
  ]);
  expect(await rows()).toEqual([
    expect.objectContaining({
      id: 'k3x',
      title: 'Very happy Tigy',
      tags: ['sticker'],
    }),
  ]);
  expect(await counts()).toEqual({ sticker: 1 });
});

it('unpublishing removes the row but keeps counting its tags', async () => {
  await write('k3x', {});
  await write('k3x', { published: false }, ['chibi']);
  expect(await rows()).toEqual([]);
  expect(await counts()).toEqual({ chibi: 1 });
});

it('takes the row from the image as it is now, not from a stale event', async () => {
  await db.doc('images/k3x').set(image({ published: false }));
  // An older "published" event arriving after the image was unpublished.
  await syncImage('k3x', [], ['chibi']);
  expect(await rows()).toEqual([]);
});

it('keeps the other rows in newest-first order', async () => {
  await write('old', { sortDate: '2019-01-01' });
  await write('new', { sortDate: '2026-04-08' });
  await write('mid', { sortDate: '2025-06-01' });
  expect((await rows())?.map((row) => row.id)).toEqual(['new', 'mid', 'old']);
  expect(await counts()).toEqual({ chibi: 3 });
});

it('Deleting a published artwork: removes its row, tag counts and files', async () => {
  for (const file of FILES) await bucket.file(`images/k3x/${file}`).save('x');
  await bucket.file('images/other/thumb.webp').save('x');
  await write('k3x', {});
  const before = image();

  await db.doc('images/k3x').delete();
  await onImageWritten.run({
    params: { imageId: 'k3x' },
    data: { before: { data: () => before }, after: { data: () => undefined } },
  } as unknown as Parameters<typeof onImageWritten.run>[0]);

  expect(await rows()).toEqual([]);
  expect(await counts()).toEqual({});
  for (const file of FILES) {
    const [exists] = await bucket.file(`images/k3x/${file}`).exists();
    expect(exists).toBe(false);
  }
  const [otherExists] = await bucket.file('images/other/thumb.webp').exists();
  expect(otherExists).toBe(true);
});

it('warns when meta/gallery passes 70% of the 1 MiB document limit', async () => {
  await write('small', {});
  expect(logger.warn).not.toHaveBeenCalled();
  await write('big', { title: 'x'.repeat(760_000) });
  expect(logger.warn).toHaveBeenCalledWith(
    expect.stringContaining('% of the 1 MiB document limit'),
    expect.objectContaining({ bytes: expect.any(Number) }),
  );
});
