import { parseGalleryItems } from '@tigy/gallery';
import { syncImage } from '../images/sync-image';
import { clearEmulators, db } from '../testing/emulators';
import { NOT_OWNER, OWNER, requestFrom } from '../testing/requests';
import { creditTigyCallable, creditTigyFirst } from './credit-tigy';

const run = (claims: Record<string, unknown> | null = OWNER) =>
  creditTigyCallable.run(requestFrom(claims, {}));

const file = {
  original: 'x',
  w: 512,
  h: 512,
  bytes: 1,
  mime: 'image/png',
  animated: false,
  transparent: false,
};
const createdAt = new Date('2026-01-01T00:00:00Z');
const image = (characterIds: string[], published = true) => ({
  title: 'A piece',
  sortDate: '2026-01-01',
  published,
  nsfw: false,
  artistIds: ['ann'],
  characterIds,
  tags: ['chibi'],
  file,
  createdAt,
  updatedAt: createdAt,
});
const characters = async (id: string) =>
  (await db.doc(`images/${id}`).get()).get('characterIds');

describe('creditTigyFirst', () => {
  it('credits Tigy on an empty list', () => {
    expect(creditTigyFirst([])).toEqual(['tigy']);
  });

  it('puts Tigy first and keeps the others in their order', () => {
    expect(creditTigyFirst(['bramble', 'kitsu'])).toEqual([
      'tigy',
      'bramble',
      'kitsu',
    ]);
  });

  it('leaves a list that already credits Tigy, in any position', () => {
    expect(creditTigyFirst(['tigy'])).toBeUndefined();
    expect(creditTigyFirst(['bramble', 'tigy'])).toBeUndefined();
  });

  it('leaves a list already at the 50-credit limit', () => {
    const full = Array.from({ length: 50 }, (_, i) => `p${i}`);
    expect(creditTigyFirst(full)).toBeUndefined();
  });
});

describe('creditTigy', () => {
  beforeEach(async () => {
    await clearEmulators();
    await db.doc('images/a').set(image(['tigy']));
    await db.doc('images/b').set(image(['bramble', 'tigy']));
    await db.doc('images/c').set(image([]));
    await db.doc('images/d').set(image(['bramble', 'kitsu']));
    await db.doc('images/e').set(image([], false));
  });

  it('Crediting the existing catalog: credits the three that lacked Tigy, published or not', async () => {
    expect(await run()).toEqual({ changed: 3 });
    expect(await characters('a')).toEqual(['tigy']);
    expect(await characters('b')).toEqual(['bramble', 'tigy']);
    expect(await characters('c')).toEqual(['tigy']);
    expect(await characters('e')).toEqual(['tigy']);
  });

  it('Other characters keep their order', async () => {
    await run();
    expect(await characters('d')).toEqual(['tigy', 'bramble', 'kitsu']);
  });

  it('changes only the characters and updatedAt', async () => {
    await run();
    const data = (await db.doc('images/d').get()).data();
    expect(data).toEqual({
      ...image(['tigy', 'bramble', 'kitsu']),
      createdAt: expect.anything(),
      updatedAt: expect.anything(),
    });
    expect(data?.['createdAt'].toDate()).toEqual(createdAt);
    expect(data?.['updatedAt'].toDate()).not.toEqual(createdAt);
    const untouched = (await db.doc('images/a').get()).get('updatedAt');
    expect(untouched.toDate()).toEqual(createdAt);
  });

  it('Running it again: changes nothing', async () => {
    await run();
    expect(await run()).toEqual({ changed: 0 });
  });

  it('Gallery filter follows: the synced row credits Tigy', async () => {
    await run();
    await syncImage('d', [], ['chibi']);
    const rows = parseGalleryItems(
      (await db.doc('meta/gallery').get()).get('items'),
    );
    expect(rows.find((row) => row.id === 'd')?.characterIds).toContain('tigy');
  });

  it.each(NOT_OWNER)('refuses %s and changes nothing', async (_, claims) => {
    await expect(run(claims)).rejects.toMatchObject({
      code: 'permission-denied',
    });
    expect(await characters('c')).toEqual([]);
  });
});
