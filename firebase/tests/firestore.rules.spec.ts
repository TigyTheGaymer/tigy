import {
  assertFails,
  assertSucceeds,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import { contexts, OTHERS, rulesEnvironment, type Who } from './environment';

let env: RulesTestEnvironment;
let as: Record<Who, RulesTestContext>;

const now = () => firebase.firestore.FieldValue.serverTimestamp();
const created = new Date('2025-11-20T10:00:00Z');

const person = { name: 'An Artist', links: [] };
const image = {
  sortDate: '2025-11-20',
  published: true,
  nsfw: false,
  artistIds: [],
  characterIds: [],
  tags: [],
  file: {
    original: 'images/k3x/original.png',
    w: 800,
    h: 600,
    bytes: 1000,
    mime: 'image/png',
    animated: false,
    transparent: false,
  },
  createdAt: created,
  updatedAt: created,
};

const upload = { fileName: 'piece.png', bytes: 4, status: 'processing' };

beforeAll(async () => {
  env = await rulesEnvironment();
  as = contexts(env);
});

afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (admin) => {
    const db = admin.firestore();
    await db.doc('people/tigy').set({
      name: 'Tigy',
      links: [],
      avatar: 'people/tigy/avatar.webp',
      createdAt: created,
      updatedAt: created,
    });
    await db.doc('images/k3x').set(image);
    await db.doc('meta/gallery').set({ items: '[]' });
    await db.doc('meta/people').set({ items: '[]' });
    await db.doc('meta/tags').set({ counts: { chibi: 1 } });
    await db.doc('uploads/u1').set(upload);
  });
});

describe.each(OTHERS)('%s', (who) => {
  const db = () => as[who].firestore();

  it('Direct database read: cannot query the artworks', async () => {
    await assertFails(db().collection('images').get());
  });

  it.each([
    'images/k3x',
    'people/tigy',
    'meta/gallery',
    'meta/people',
    'meta/tags',
  ])('cannot read %s', async (path) => {
    await assertFails(db().doc(path).get());
  });

  it('cannot create, change or delete people or artworks', async () => {
    await assertFails(db().doc('people/new').set(person));
    await assertFails(db().doc('people/tigy').update({ name: 'Hacked' }));
    await assertFails(db().doc('people/tigy').delete());
    await assertFails(db().doc('images/new').set(image));
    await assertFails(
      db().doc('images/k3x').update({ published: false, updatedAt: now() }),
    );
    await assertFails(db().doc('images/k3x').delete());
  });

  it('cannot read, write or clear upload records', async () => {
    await assertFails(db().doc('uploads/u1').get());
    await assertFails(db().doc('uploads/new').set(upload));
    await assertFails(db().doc('uploads/u1').delete());
  });

  it('cannot write the summaries', async () => {
    await assertFails(db().doc('meta/gallery').set({ items: '[]' }));
  });
});

describe('owner', () => {
  const db = () => as.owner.firestore();

  it('reads everything, including the summaries and the tag list', async () => {
    await assertSucceeds(db().collection('images').get());
    await assertSucceeds(db().collection('people').get());
    for (const path of [
      'meta/gallery',
      'meta/people',
      'meta/tags',
      'other/doc',
    ]) {
      await assertSucceeds(db().doc(path).get());
    }
  });

  it('creates and updates people', async () => {
    await assertSucceeds(db().doc('people/new').set(person));
    await assertSucceeds(
      db()
        .doc('people/ann')
        .set({
          name: 'Ann',
          links: [{ network: 'Bluesky', handle: '@ann', url: 'https://a.b' }],
          avatar: 'people/ann/avatar.webp',
          createdAt: now(),
          updatedAt: now(),
        }),
    );
    await assertSucceeds(
      db().doc('people/tigy').update({ name: 'Tigy!', updatedAt: now() }),
    );
    await assertSucceeds(
      db()
        .doc('people/tigy')
        .update({ avatar: firebase.firestore.FieldValue.delete() }),
    );
  });

  it('cannot give a person an empty name, another avatar path or another field', async () => {
    await assertFails(db().doc('people/new').set({ name: '', links: [] }));
    await assertFails(db().doc('people/new').set({ name: '  ', links: [] }));
    await assertFails(db().doc('people/new').set({ links: [] }));
    await assertFails(db().doc('people/new').set({ name: 'Ann', links: 'x' }));
    await assertFails(
      db()
        .doc('people/new')
        .set({ ...person, avatar: 'people/tigy/avatar.webp' }),
    );
    await assertFails(
      db()
        .doc('people/new')
        .set({ ...person, extra: 1 }),
    );
    await assertFails(db().doc('people/tigy').update({ name: '' }));
    await assertFails(
      db().doc('people/tigy').update({ avatar: 'images/k3x/full.webp' }),
    );
  });

  it('cannot change when a person was created', async () => {
    await assertFails(db().doc('people/tigy').update({ createdAt: now() }));
  });

  it('cannot delete people, which goes through a function', async () => {
    await assertFails(db().doc('people/tigy').delete());
  });

  it('updates the editable fields of an artwork', async () => {
    await assertSucceeds(
      db()
        .doc('images/k3x')
        .update({
          title: 'Pool day',
          description: 'At the pool.',
          date: '2021-04',
          sortDate: '2021-04-01',
          published: false,
          nsfw: true,
          artistIds: ['ann'],
          characterIds: ['tigy'],
          tags: ['pool'],
          updatedAt: now(),
        }),
    );
    await assertSucceeds(
      db()
        .doc('images/k3x')
        .update({
          date: firebase.firestore.FieldValue.delete(),
          updatedAt: now(),
        }),
    );
  });

  it('Creating an artwork from a browser: cannot create an artwork', async () => {
    await assertFails(
      db()
        .doc('images/new')
        .set({ ...image, createdAt: now(), updatedAt: now() }),
    );
  });

  it("Changing a file's details from a browser: cannot change the file or when it was created", async () => {
    await assertFails(
      db().doc('images/k3x').update({ 'file.w': 1, updatedAt: now() }),
    );
    await assertFails(
      db().doc('images/k3x').update({ createdAt: now(), updatedAt: now() }),
    );
  });

  it('cannot update an artwork with a wrong type, an extra field or without updatedAt', async () => {
    for (const fields of [
      { title: 1 },
      { published: 'yes' },
      { date: '2021-4' },
      { sortDate: '2021' },
      { tags: 'pool' },
      { artistIds: Array.from({ length: 51 }, (_, i) => `p${i}`) },
      { extra: true },
    ]) {
      await assertFails(
        db()
          .doc('images/k3x')
          .update({ ...fields, updatedAt: now() }),
      );
    }
    await assertFails(db().doc('images/k3x').update({ published: false }));
  });

  it('deletes artworks', async () => {
    await assertSucceeds(db().doc('images/k3x').delete());
  });

  it('cannot write the summaries, which only functions write', async () => {
    await assertFails(db().doc('meta/gallery').set({ items: '[]' }));
    await assertFails(db().doc('meta/tags').update({ counts: {} }));
    await assertFails(db().doc('meta/people').delete());
  });

  it('reads and clears upload records, but cannot create or change them', async () => {
    await assertSucceeds(db().collection('uploads').get());
    await assertFails(db().doc('uploads/new').set(upload));
    await assertFails(db().doc('uploads/u1').update({ status: 'ready' }));
    await assertSucceeds(db().doc('uploads/u1').delete());
  });

  it('cannot write outside people and images', async () => {
    await assertFails(db().doc('other/doc').set({ a: 1 }));
  });
});
