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
function upload(
  context: RulesTestContext,
  path: string,
  contentType?: string,
  data: Uint8Array = bytes,
): Promise<unknown> {
  return context
    .storage()
    .ref(path)
    .put(data, contentType ? { contentType } : undefined)
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
    await storage
      .ref('uploads/u1/source')
      .put(bytes, { contentType: 'image/png' });
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

  it('cannot read or write outside images/, the uploads and the avatars', async () => {
    await assertFails(storage().ref('private/notes.txt').getDownloadURL());
    await assertFails(upload(as[who], 'private/new.txt'));
  });

  it("Writing an artwork file from a browser: cannot upload, replace or delete an image's files", async () => {
    await assertFails(upload(as[who], 'images/new/original.png', 'image/png'));
    await assertFails(upload(as[who], 'images/k3x/thumb.webp', 'image/webp'));
    await assertFails(storage().ref('images/k3x/full.webp').delete());
  });

  it('Reading an upload: cannot read, list, replace or delete an upload', async () => {
    await assertFails(storage().ref('uploads/u1/source').getDownloadURL());
    await assertFails(storage().ref('uploads/u1/source').getMetadata());
    await assertFails(storage().ref('uploads').listAll());
    await assertFails(upload(as[who], 'uploads/u1/source', 'image/png'));
    await assertFails(storage().ref('uploads/u1/source').delete());
  });
});

describe.each(OTHERS)('%s', (who) => {
  const storage = () => as[who].storage();

  it('A stranger tries to upload: cannot upload a file', async () => {
    await assertFails(upload(as[who], 'uploads/u2/source', 'image/png'));
    await assertFails(upload(as[who], 'uploads/u3/source', 'video/mp4'));
  });

  it('cannot upload, replace or delete an avatar', async () => {
    await assertFails(upload(as[who], 'people/ann/avatar.webp', 'image/webp'));
    await assertFails(upload(as[who], 'people/tigy/avatar.webp', 'image/webp'));
    await assertFails(storage().ref('people/tigy/avatar.webp').delete());
  });
});

describe('owner', () => {
  const storage = () => as.owner.storage();

  it.each(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])(
    'uploads a new %s file',
    async (contentType) => {
      await assertSucceeds(
        upload(
          as.owner,
          `uploads/new-${contentType.slice(6)}/source`,
          contentType,
        ),
      );
    },
  );

  it('Too large: cannot upload a file over 50 MB', async () => {
    const limit = 50 * 1024 * 1024;
    await assertSucceeds(
      upload(
        as.owner,
        'uploads/at-limit/source',
        'image/png',
        new Uint8Array(limit),
      ),
    );
    await assertFails(
      upload(
        as.owner,
        'uploads/over-limit/source',
        'image/png',
        new Uint8Array(limit + 1),
      ),
    );
  });

  it.each(['video/mp4', 'video/quicktime', 'video/webm'])(
    'Large video: uploads a 120 MB %s file',
    async (contentType) => {
      await assertSucceeds(
        upload(
          as.owner,
          `uploads/new-${contentType.slice(6)}/source`,
          contentType,
          new Uint8Array(120 * 1024 * 1024),
        ),
      );
    },
  );

  it('Video too large: cannot upload a video over 200 MB, or a 60 MB PNG', async () => {
    await assertFails(
      upload(
        as.owner,
        'uploads/big-video/source',
        'video/mp4',
        new Uint8Array(250 * 1024 * 1024),
      ),
    );
    await assertFails(
      upload(
        as.owner,
        'uploads/big-png/source',
        'image/png',
        new Uint8Array(60 * 1024 * 1024),
      ),
    );
  });

  it('cannot upload another type, or anywhere else under uploads/', async () => {
    await assertFails(
      upload(as.owner, 'uploads/u2/source', 'video/x-matroska'),
    );
    await assertFails(upload(as.owner, 'uploads/u2/source', 'image/heic'));
    await assertFails(upload(as.owner, 'uploads/u2/source', 'text/plain'));
    await assertFails(upload(as.owner, 'uploads/u2/other', 'image/png'));
  });

  it('uploads, replaces and deletes an avatar, and nothing else under people/', async () => {
    await assertSucceeds(
      upload(as.owner, 'people/ann/avatar.webp', 'image/webp'),
    );
    await assertSucceeds(
      upload(as.owner, 'people/tigy/avatar.webp', 'image/webp'),
    );
    await assertSucceeds(storage().ref('people/tigy/avatar.webp').delete());
    await assertFails(upload(as.owner, 'people/tigy/notes.txt', 'image/webp'));
  });

  it('uploads an avatar only as a WebP of at most 1 MB', async () => {
    const limit = 1024 * 1024;
    await assertFails(upload(as.owner, 'people/ann/avatar.webp', 'image/png'));
    await assertFails(upload(as.owner, 'people/ann/avatar.webp'));
    await assertSucceeds(
      upload(
        as.owner,
        'people/ann/avatar.webp',
        'image/webp',
        new Uint8Array(limit),
      ),
    );
    await assertFails(
      upload(
        as.owner,
        'people/ann/avatar.webp',
        'image/webp',
        new Uint8Array(2 * limit),
      ),
    );
  });
});
