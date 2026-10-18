import { clearEmulators, db } from '../testing/emulators';
import { NOT_OWNER, OWNER, requestFrom } from '../testing/requests';
import { deletePersonCallable } from './delete-person';

const remove = (
  personId: unknown,
  claims: Record<string, unknown> | null = OWNER,
) => deletePersonCallable.run(requestFrom(claims, { personId }));

const exists = async (path: string) => (await db.doc(path).get()).exists;

beforeEach(async () => {
  await clearEmulators();
  await db.doc('people/tigy').set({ name: 'Tigy', links: [] });
  await db.doc('people/ann').set({ name: 'Ann', links: [] });
  await db.doc('people/pookie').set({ name: 'Pookie', links: [] });
  await db.doc('people/nobody').set({ name: 'Nobody', links: [] });
  await db.doc('images/a').set({
    title: 'Hey Pookie!',
    published: true,
    artistIds: ['ann'],
    characterIds: ['tigy', 'pookie'],
  });
  await db.doc('images/b').set({
    title: 'Happy Tigy',
    published: true,
    artistIds: ['ann'],
    characterIds: ['tigy'],
  });
  await db
    .doc('images/c')
    .set({ published: false, artistIds: ['ann'], characterIds: ['tigy'] });
});

it('Deleting a credited artist: refuses and names the three artworks', async () => {
  expect(await remove('ann')).toEqual({
    deleted: false,
    creditedBy: [
      { id: 'a', title: 'Hey Pookie!' },
      { id: 'b', title: 'Happy Tigy' },
      { id: 'c' },
    ],
  });
  expect(await exists('people/ann')).toBe(true);
});

it('refuses a person credited only as a character', async () => {
  expect(await remove('pookie')).toEqual({
    deleted: false,
    creditedBy: [{ id: 'a', title: 'Hey Pookie!' }],
  });
});

it('deletes a person no image credits', async () => {
  expect(await remove('nobody')).toEqual({ deleted: true });
  expect(await exists('people/nobody')).toBe(false);
});

it('never deletes Tigy', async () => {
  await db.doc('images/a').delete();
  await db.doc('images/b').delete();
  await db.doc('images/c').delete();
  await expect(remove('tigy')).rejects.toMatchObject({
    code: 'failed-precondition',
  });
  expect(await exists('people/tigy')).toBe(true);
});

it.each([undefined, '', 42, 'people/ann'])(
  'refuses the person ID %j',
  async (personId) => {
    await expect(remove(personId)).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  },
);

it.each(NOT_OWNER)('refuses %s', async (_, claims) => {
  await expect(remove('nobody', claims)).rejects.toMatchObject({
    code: 'permission-denied',
  });
  expect(await exists('people/nobody')).toBe(true);
});
