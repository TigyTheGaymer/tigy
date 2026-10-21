import { bucket, clearEmulators, db } from '../testing/emulators';
import { clearUpload } from './clear-upload';

const files = async (prefix: string) =>
  (await bucket.getFiles({ prefix }))[0].map((file) => file.name).sort();

beforeEach(() => clearEmulators());

it('Processing never finishes: clearing removes the files a crashed run left behind', async () => {
  await bucket.file('uploads/f1/source').save(Buffer.from('source'));
  await bucket.file('images/f1/original.png').save(Buffer.from('stray'));
  await bucket.file('images/f1/full.webp').save(Buffer.from('stray'));

  await clearUpload('f1');

  expect(await files('uploads/f1/')).toEqual([]);
  expect(await files('images/f1/')).toEqual([]);
});

it("Clearing a ready upload: keeps the artwork's files", async () => {
  await db.doc('images/r1').set({ published: false });
  const kept = [
    'images/r1/full.webp',
    'images/r1/original.png',
    'images/r1/thumb.webp',
  ];
  await Promise.all(
    kept.map((path) => bucket.file(path).save(Buffer.from('file'))),
  );

  await clearUpload('r1');

  expect(await files('images/r1/')).toEqual(kept);
  expect((await db.doc('images/r1').get()).exists).toBe(true);
});

it("leaves other uploads' and artworks' files alone", async () => {
  await bucket.file('uploads/f10/source').save(Buffer.from('other'));
  await bucket.file('images/f10/original.png').save(Buffer.from('other'));

  await clearUpload('f1');

  expect(await files('uploads/')).toEqual(['uploads/f10/source']);
  expect(await files('images/')).toEqual(['images/f10/original.png']);
});
