import type { PeopleEntry } from '@tigy/models';
import * as logger from 'firebase-functions/logger';
import { bucket, clearEmulators, db, readItems } from '../testing/emulators';
import { onPersonWritten, syncPerson } from './sync-person';

vi.mock('firebase-functions/logger', async (original) => ({
  ...(await original<typeof import('firebase-functions/logger')>()),
  error: vi.fn(),
}));

function deleted(personId: string) {
  return {
    params: { personId },
    data: { before: { exists: true }, after: { exists: false } },
  } as unknown as Parameters<typeof onPersonWritten.run>[0];
}

const avatarExists = async (id: string) =>
  (await bucket.file(`people/${id}/avatar.webp`).exists())[0];

const people = () => readItems<PeopleEntry>('meta/people');

async function write(id: string, name: string, avatar?: string) {
  await db
    .doc(`people/${id}`)
    .set({ name, links: [], ...(avatar && { avatar }) });
  await syncPerson(id);
}

beforeEach(() => clearEmulators());

it('creating a person adds their entry with name and avatar', async () => {
  await write('tigy', 'Tigy', 'people/tigy/avatar.webp');
  await write('ann', 'Ann');
  expect(await people()).toEqual([
    { id: 'ann', name: 'Ann' },
    { id: 'tigy', name: 'Tigy', avatar: 'people/tigy/avatar.webp' },
  ]);
});

it('renaming a person replaces their entry', async () => {
  await write('ann', 'Ann');
  await write('ann', 'Annie');
  expect(await people()).toEqual([{ id: 'ann', name: 'Annie' }]);
});

it('deleting a person removes their entry', async () => {
  await write('ann', 'Ann');
  await write('bob', 'Bob');
  await db.doc('people/ann').delete();
  await syncPerson('ann');
  expect(await people()).toEqual([{ id: 'bob', name: 'Bob' }]);
});

it('takes the entry from the person as they are now, not from a late event', async () => {
  await write('ann', 'Ann');
  await db.doc('people/ann').update({ name: 'Annie' });
  // The earlier event for "Ann" runs again after the rename.
  await syncPerson('ann');
  expect(await people()).toEqual([{ id: 'ann', name: 'Annie' }]);
});

it('deleting a person with an avatar removes their avatar file', async () => {
  await write('ann', 'Ann', 'people/ann/avatar.webp');
  await bucket.file('people/ann/avatar.webp').save('x');
  await bucket.file('people/bob/avatar.webp').save('x');

  await db.doc('people/ann').delete();
  await onPersonWritten.run(deleted('ann'));

  expect(await people()).toEqual([]);
  expect(await avatarExists('ann')).toBe(false);
  expect(await avatarExists('bob')).toBe(true);
});

it('deleting a person without an avatar resolves', async () => {
  await write('ann', 'Ann');
  await db.doc('people/ann').delete();
  await expect(onPersonWritten.run(deleted('ann'))).resolves.not.toThrow();
  expect(await people()).toEqual([]);
});

it('a failed avatar deletion is logged and does not fail the event', async () => {
  await write('ann', 'Ann', 'people/ann/avatar.webp');
  const file = bucket.file('people/ann/avatar.webp');
  const remove = vi
    .spyOn(Object.getPrototypeOf(file), 'delete')
    .mockRejectedValueOnce(new Error('Storage is down'));

  await db.doc('people/ann').delete();
  await expect(onPersonWritten.run(deleted('ann'))).resolves.not.toThrow();

  expect(await people()).toEqual([]);
  expect(logger.error).toHaveBeenCalledWith(
    'Deleting the avatar of person ann failed',
    expect.anything(),
  );
  remove.mockRestore();
});
