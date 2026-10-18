import {
  assertFails,
  assertSucceeds,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { contexts, OTHERS, rulesEnvironment, type Who } from './environment';

let env: RulesTestEnvironment;
let as: Record<Who, RulesTestContext>;

const bytes = new Uint8Array([82, 73, 70, 70]);

/** Uploads the test bytes; `put` returns a task, which the asserts need as a promise. */
function upload(context: RulesTestContext, path: string): Promise<unknown> {
  return context
    .storage()
    .ref(path)
    .put(bytes)
    .then(() => undefined);
}

beforeAll(async () => {
  env = await rulesEnvironment();
  as = contexts(env);
});

afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (admin) => {
    const storage = admin.storage();
    await storage.ref('images/k3x/thumb.webp').put(bytes);
    await storage.ref('images/k3x/full.webp').put(bytes);
    await storage.ref('people/tigy/avatar.webp').put(bytes);
    await storage.ref('people/tigy/notes.txt').put(bytes);
    await storage.ref('private/notes.txt').put(bytes);
  });
});

describe.each([...OTHERS, 'owner'] as Who[])('%s', (who) => {
  const storage = () => as[who].storage();

  it("can fetch an image's files", async () => {
    await assertSucceeds(
      storage().ref('images/k3x/thumb.webp').getDownloadURL(),
    );
    await assertSucceeds(storage().ref('images/k3x/full.webp').getMetadata());
  });

  it('cannot list the images, which would reveal unpublished IDs', async () => {
    await assertFails(storage().ref('images').listAll());
    await assertFails(storage().ref('images/k3x').listAll());
  });

  it("can fetch a person's avatar", async () => {
    await assertSucceeds(
      storage().ref('people/tigy/avatar.webp').getDownloadURL(),
    );
  });

  it('cannot list the avatars, or read anything else under people/', async () => {
    await assertFails(storage().ref('people').listAll());
    await assertFails(storage().ref('people/tigy').listAll());
    await assertFails(storage().ref('people/tigy/notes.txt').getDownloadURL());
  });

  it('cannot read or write outside images/ and the avatars', async () => {
    await assertFails(storage().ref('private/notes.txt').getDownloadURL());
    await assertFails(upload(as[who], 'private/new.txt'));
  });
});

describe.each(OTHERS)('%s', (who) => {
  const storage = () => as[who].storage();

  it("cannot upload, replace or delete an image's files", async () => {
    await assertFails(upload(as[who], 'images/new/original.png'));
    await assertFails(upload(as[who], 'images/k3x/thumb.webp'));
    await assertFails(storage().ref('images/k3x/full.webp').delete());
  });

  it('cannot upload, replace or delete an avatar', async () => {
    await assertFails(upload(as[who], 'people/ann/avatar.webp'));
    await assertFails(upload(as[who], 'people/tigy/avatar.webp'));
    await assertFails(storage().ref('people/tigy/avatar.webp').delete());
  });
});

describe('owner', () => {
  const storage = () => as.owner.storage();

  it("uploads, replaces and deletes an image's files", async () => {
    await assertSucceeds(upload(as.owner, 'images/new/original.png'));
    await assertSucceeds(upload(as.owner, 'images/k3x/thumb.webp'));
    await assertSucceeds(storage().ref('images/k3x/full.webp').delete());
  });

  it('uploads, replaces and deletes an avatar, and nothing else under people/', async () => {
    await assertSucceeds(upload(as.owner, 'people/ann/avatar.webp'));
    await assertSucceeds(upload(as.owner, 'people/tigy/avatar.webp'));
    await assertSucceeds(storage().ref('people/tigy/avatar.webp').delete());
    await assertFails(upload(as.owner, 'people/tigy/notes.txt'));
  });
});
