import type { PeopleEntry } from '@tigy/models';
import { clearEmulators, db, readItems } from '../testing/emulators';
import { syncPerson } from './sync-person';

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
