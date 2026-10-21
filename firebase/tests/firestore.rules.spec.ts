import {
  assertFails,
  assertSucceeds,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { contexts, OTHERS, rulesEnvironment, type Who } from './environment';

let env: RulesTestEnvironment;
let as: Record<Who, RulesTestContext>;

const person = { name: 'An Artist', links: [] };
const image = {
  sortDate: '2025-11-20',
  published: true,
  nsfw: false,
  tags: [],
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
    await db.doc('people/tigy').set({ name: 'Tigy', links: [] });
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
    await assertFails(db().doc('images/k3x').update({ published: false }));
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
    await assertSucceeds(db().doc('people/tigy').update({ name: 'Tigy!' }));
  });

  it('cannot delete people, which goes through a function', async () => {
    await assertFails(db().doc('people/tigy').delete());
  });

  it('creates, updates and deletes artworks', async () => {
    await assertSucceeds(db().doc('images/new').set(image));
    await assertSucceeds(db().doc('images/k3x').update({ published: false }));
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
