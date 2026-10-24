// Fills the running emulators with the mockup's content, replacing everything in them.
// Run `npx nx run firebase:seed` while `npx nx run firebase:emulators` is running.

import {
  buildGalleryItems,
  buildPeopleItems,
  buildTagCounts,
  sortDateFor,
} from '@tigy/gallery';
import {
  IMAGES_COLLECTION,
  imagePaths,
  META_GALLERY_DOC,
  META_PEOPLE_DOC,
  META_TAGS_DOC,
  PEOPLE_COLLECTION,
  personPaths,
  TIGY_ID,
  type Image,
  type Person,
  type WithId,
} from '@tigy/models';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const PROJECT_ID = 'demo-tigy';
const ASSETS = resolve(__dirname, '../../design/mockups/assets');
const HUB = process.env['FIREBASE_EMULATOR_HUB'] ?? '127.0.0.1:4400';

// Never touch a real project: both emulators must be named.
for (const name of [
  'FIRESTORE_EMULATOR_HOST',
  'FIREBASE_STORAGE_EMULATOR_HOST',
]) {
  if (!process.env[name]) {
    throw new Error(
      `${name} is not set; the seed only writes to the emulators.`,
    );
  }
}

const placeholderLink = (network: string) => ({
  network,
  handle: 'placeholder',
  url: `https://example.com/placeholder/${network}`,
});

const PEOPLE: Record<string, Omit<Person, 'createdAt' | 'updatedAt'>> = {
  [TIGY_ID]: {
    name: 'Tigy',
    avatar: personPaths.avatar(TIGY_ID),
    links: ['bluesky', 'telegram', 'twitter', 'furaffinity'].map(
      placeholderLink,
    ),
  },
  'placeholder-artist': {
    name: 'Artist name (placeholder)',
    links: ['bluesky', 'twitter'].map(placeholderLink),
  },
  'placeholder-character': {
    name: 'Character name (placeholder)',
    links: [placeholderLink('bluesky')],
  },
};

interface Piece {
  asset: string;
  added: string;
  fields: Partial<Image>;
}

const ARTIST = ['placeholder-artist'];

const PIECES: Record<string, Piece> = {
  'tigy-portrait': {
    asset: 'tigy-portrait.gif',
    added: '2026-04-08',
    fields: {
      title: 'Tigy portrait',
      date: '2026-04-08',
      artistIds: ARTIST,
      characterIds: [TIGY_ID],
      tags: ['animated', 'bust'],
    },
  },
  'ref-sheet': {
    asset: 'tigy-ref-sheet.png',
    added: '2026-03-21',
    fields: {
      title: 'Tigy reference sheet',
      date: '2026-03-21',
      description:
        'Side, front and back views, with paw, eye and expression studies.',
      artistIds: ARTIST,
      characterIds: [TIGY_ID],
      tags: ['reference sheet', 'full body', 'expressions'],
    },
  },
  'hey-pookie': {
    asset: 'hey-pookie.png',
    added: '2026-02-14',
    fields: {
      title: 'Hey Pookie!',
      date: '2026-02-14',
      description: 'A three-panel comic.',
      artistIds: ARTIST,
      characterIds: [TIGY_ID, 'placeholder-character'],
      tags: ['comic', 'couple'],
    },
  },
  'hey-pookie-nsfw-test': {
    asset: 'hey-pookie.png',
    added: '2026-02-14',
    fields: {
      title: 'Hey Pookie! (NSFW for testing)',
      date: '2026-02-14',
      description:
        'Flagged NSFW only to test the NSFW states; the same image as the clean version.',
      nsfw: true,
      artistIds: ARTIST,
      characterIds: [TIGY_ID, 'placeholder-character'],
      tags: ['comic', 'couple'],
    },
  },
  'happy-tigy': {
    asset: 'tigy-hearts.png',
    added: '2025-12-03',
    // Known only to the year, to show a partial date.
    fields: {
      title: 'Happy Tigy',
      date: '2025',
      artistIds: ARTIST,
      characterIds: [TIGY_ID],
      tags: ['sticker', 'chibi'],
    },
  },
  'chibi-tigy': {
    asset: 'tigy-chibi.png',
    added: '2025-11-20',
    // Only the image: no title, date, credits or tags.
    fields: {},
  },
};

// Made by the upload processing from a 4-second loop of tigy-hearts.png with a tone.
const SAMPLE_VIDEO = resolve(__dirname, 'sample-video');
const SAMPLE_VIDEO_FILE = {
  w: 640,
  h: 640,
  mime: 'video/mp4',
  animated: true,
  transparent: false,
  durationMs: 4000,
  hasAudio: true,
};

const VIDEOS: Record<string, Omit<Piece, 'asset'>> = {
  'happy-tigy-loop': {
    added: '2025-06-10',
    fields: {
      title: 'Happy Tigy loop',
      date: '2025-06',
      artistIds: ARTIST,
      characterIds: [TIGY_ID],
      tags: ['animated', 'sticker'],
    },
  },
};

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
};

async function main(): Promise<void> {
  // sharp is a CommonJS function; the TypeScript runner loads it without
  // ES module interop, so it may arrive with or without a `default` wrapper.
  const sharpModule = await import('sharp');
  const sharp = (sharpModule.default ??
    sharpModule) as typeof sharpModule.default;
  initializeApp({
    projectId: PROJECT_ID,
    storageBucket: `${PROJECT_ID}.appspot.com`,
  });
  const db = getFirestore();
  const bucket = getStorage().bucket();

  // The summaries are built once at the end, like the rebuild function does;
  // triggers firing for every write would add tag differences on top of them.
  const triggersOff = await setBackgroundTriggers(false);
  try {
    await clearFirestore();
    await bucket.deleteFiles({ force: true });

    // Tigy's avatar: a 512 px square from the top of the portrait.
    const portrait = await readFile(resolve(ASSETS, 'tigy-portrait.gif'));
    await bucket
      .file(personPaths.avatar(TIGY_ID))
      .save(
        await sharp(portrait)
          .resize({ width: 512, height: 512, fit: 'cover', position: 'top' })
          .webp({ quality: 82 })
          .toBuffer(),
        { contentType: 'image/webp', resumable: false },
      );

    const people: WithId<Person>[] = [];
    for (const [id, fields] of Object.entries(PEOPLE)) {
      const at = Timestamp.now();
      const person: Person = { ...fields, createdAt: at, updatedAt: at };
      await db.collection(PEOPLE_COLLECTION).doc(id).set(person);
      people.push({ ...person, id });
    }
    const images: WithId<Image>[] = [];

    for (const [id, piece] of Object.entries(PIECES)) {
      const original = await readFile(resolve(ASSETS, piece.asset));
      const ext = extname(piece.asset);
      const mime = MIME[ext];
      const animated = ext === '.gif';
      const meta = await sharp(original, { animated }).metadata();
      const height = meta.pageHeight ?? meta.height;
      const webp = (size: number) =>
        sharp(original, { animated })
          .resize({
            width: size,
            height: size,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 82 })
          .toBuffer();

      const save = (path: string, data: Buffer, contentType: string) =>
        bucket.file(path).save(data, { contentType, resumable: false });
      await save(imagePaths.original(id, ext.slice(1)), original, mime);
      await save(imagePaths.full(id), await webp(2048), 'image/webp');
      await save(imagePaths.thumb(id), await webp(720), 'image/webp');

      const added = new Date(`${piece.added}T12:00:00Z`);
      const image: Image = {
        published: true,
        nsfw: false,
        artistIds: [],
        characterIds: [],
        tags: [],
        ...piece.fields,
        sortDate: sortDateFor(piece.fields.date, added),
        file: {
          original: imagePaths.original(id, ext.slice(1)),
          w: meta.width,
          h: height,
          bytes: original.length,
          mime,
          animated: (meta.pages ?? 1) > 1,
          transparent: meta.hasAlpha === true,
        },
        createdAt: Timestamp.fromDate(added),
        updatedAt: Timestamp.fromDate(added),
      };
      await db.collection(IMAGES_COLLECTION).doc(id).set(image);
      images.push({ ...image, id });
    }

    for (const [id, piece] of Object.entries(VIDEOS)) {
      const sample = (name: string) => readFile(resolve(SAMPLE_VIDEO, name));
      const save = async (path: string, name: string, contentType: string) =>
        bucket
          .file(path)
          .save(await sample(name), { contentType, resumable: false });
      await save(imagePaths.original(id, 'mp4'), 'original.mp4', 'video/mp4');
      await save(imagePaths.video(id), 'full.mp4', 'video/mp4');
      await save(imagePaths.preview(id), 'preview.mp4', 'video/mp4');
      await save(imagePaths.full(id), 'full.webp', 'image/webp');
      await save(imagePaths.thumb(id), 'thumb.webp', 'image/webp');

      const added = new Date(`${piece.added}T12:00:00Z`);
      const image: Image = {
        published: true,
        nsfw: false,
        artistIds: [],
        characterIds: [],
        tags: [],
        ...piece.fields,
        sortDate: sortDateFor(piece.fields.date, added),
        file: {
          original: imagePaths.original(id, 'mp4'),
          bytes: (await sample('original.mp4')).length,
          ...SAMPLE_VIDEO_FILE,
        },
        createdAt: Timestamp.fromDate(added),
        updatedAt: Timestamp.fromDate(added),
      };
      await db.collection(IMAGES_COLLECTION).doc(id).set(image);
      images.push({ ...image, id });
    }

    const counts = buildTagCounts(images);
    const updatedAt = FieldValue.serverTimestamp();
    await db
      .doc(META_GALLERY_DOC)
      .set({ items: buildGalleryItems(images), updatedAt });
    await db
      .doc(META_PEOPLE_DOC)
      .set({ items: buildPeopleItems(people), updatedAt });
    await db.doc(META_TAGS_DOC).set({ counts, updatedAt });
    console.log(
      `Seeded ${people.length} people and ${images.length} images with ${Object.keys(counts).length} tags into ${PROJECT_ID}.`,
    );
  } finally {
    if (triggersOff) await setBackgroundTriggers(true);
  }
}

async function clearFirestore(): Promise<void> {
  const host = process.env['FIRESTORE_EMULATOR_HOST'];
  const url = `http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
  const response = await fetch(url, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Clearing Firestore: ${response.status}`);
}

/** Pauses or resumes the Functions emulator's triggers; false when it is not running. */
async function setBackgroundTriggers(enabled: boolean): Promise<boolean> {
  const action = enabled
    ? 'enableBackgroundTriggers'
    : 'disableBackgroundTriggers';
  try {
    const response = await fetch(`http://${HUB}/functions/${action}`, {
      method: 'PUT',
    });
    return response.ok;
  } catch {
    return false;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
