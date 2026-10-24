import { sortDateFor } from '@tigy/gallery';
import type { Image, Upload } from '@tigy/models';
import { crc32 } from 'node:zlib';
import sharp from 'sharp';
import { bucket, clearEmulators, db } from '../testing/emulators';
import { animatedGif, picture } from '../testing/images';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  eightKFrame,
  longClip,
  phoneMp4,
  silentWebm,
  truncatedMp4,
} from '../testing/videos';
import { processUploadedObject, WORK_DIR_PREFIX } from './process-upload';

vi.mock('firebase-functions/logger', async (original) => ({
  ...(await original<typeof import('firebase-functions/logger')>()),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

/** Puts a file where the admin uploads it and runs processing for it, as the trigger would. */
async function upload(
  id: string,
  data: Buffer,
  fileName = 'piece.png',
  contentType = 'image/png',
) {
  const name = `uploads/${id}/source`;
  const metadata = { fileName };
  await bucket.file(name).save(data, {
    resumable: false,
    metadata: { contentType, metadata },
  });
  await processUploadedObject({ name, size: data.length, metadata });
}

const record = async (id: string) =>
  (await db.doc(`uploads/${id}`).get()).data() as Upload | undefined;
const image = async (id: string) =>
  (await db.doc(`images/${id}`).get()).data() as Image | undefined;
const files = async (prefix: string) =>
  (await bucket.getFiles({ prefix }))[0].map((file) => file.name).sort();

beforeEach(() => clearEmulators());

describe('a supported upload', () => {
  it('A sticker is processed: becomes an unpublished artwork crediting Tigy, with its three files', async () => {
    const sticker = await picture(500, 500, { alpha: 0 }).png().toBuffer();
    await upload('s1', sticker, 'sticker.png');

    expect(await image('s1')).toEqual({
      published: false,
      nsfw: false,
      artistIds: [],
      characterIds: ['tigy'],
      tags: [],
      sortDate: sortDateFor(undefined, new Date()),
      file: {
        original: 'images/s1/original.png',
        w: 500,
        h: 500,
        bytes: expect.any(Number),
        mime: 'image/png',
        animated: false,
        transparent: true,
      },
      createdAt: expect.anything(),
      updatedAt: expect.anything(),
    });
    expect(await files('images/s1/')).toEqual([
      'images/s1/full.webp',
      'images/s1/original.png',
      'images/s1/thumb.webp',
    ]);
    expect(await record('s1')).toMatchObject({
      fileName: 'sticker.png',
      bytes: sticker.length,
      status: 'ready',
      file: { w: 500, h: 500, mime: 'image/png', animated: false },
    });
    expect(await files('uploads/')).toEqual([]);
  });

  it('gives each file its content type and a download token, which the real bucket would not add', async () => {
    await upload('s1', await picture(64, 64).png().toBuffer());
    for (const [name, contentType] of [
      ['original.png', 'image/png'],
      ['full.webp', 'image/webp'],
      ['thumb.webp', 'image/webp'],
    ]) {
      const [meta] = await bucket.file(`images/s1/${name}`).getMetadata();
      expect(meta.contentType).toBe(contentType);
      expect(meta.metadata?.['firebaseStorageDownloadTokens']).toMatch(
        /^[0-9a-f-]{36}$/,
      );
    }
  });

  it('records the size of a tall comic', async () => {
    await upload('c1', await picture(1200, 4800).png().toBuffer());
    expect((await image('c1'))?.file).toMatchObject({ w: 1200, h: 4800 });
    const full = await sharp(
      (await bucket.file('images/c1/full.webp').download())[0],
    ).metadata();
    expect([full.width, full.height]).toEqual([512, 2048]);
  });

  it('records an animated GIF as animated', async () => {
    await upload('g1', await animatedGif(200, 200), 'portrait.gif');
    expect((await image('g1'))?.file).toMatchObject({
      original: 'images/g1/original.gif',
      mime: 'image/gif',
      animated: true,
    });
  });

  it('records a rotated JPEG upright', async () => {
    const sideways = await picture(400, 300)
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    await upload('r1', sideways, 'photo.jpg');
    expect((await image('r1'))?.file).toMatchObject({
      original: 'images/r1/original.jpg',
      w: 300,
      h: 400,
    });
  });

  it('records an opaque PNG with an alpha channel as not transparent', async () => {
    await upload('o1', await picture(300, 200).png().toBuffer());
    expect((await image('o1'))?.file.transparent).toBe(false);
  });

  it('Wrong extension: processes a PNG named .jpg as a PNG', async () => {
    await upload('w1', await picture(64, 64).png().toBuffer(), 'piece.jpg');
    expect((await image('w1'))?.file).toMatchObject({
      original: 'images/w1/original.png',
      mime: 'image/png',
    });
    expect(await files('images/w1/original')).toEqual([
      'images/w1/original.png',
    ]);
  });

  it('removes the metadata from the original', async () => {
    const photo = await picture(64, 64)
      .jpeg()
      .withExif({ IFD0: { Artist: 'Secret Name' } })
      .toBuffer();
    await upload('m1', photo, 'photo.jpg');
    const [original] = await bucket.file('images/m1/original.jpg').download();
    expect(photo.includes('Secret Name')).toBe(true);
    expect(original.includes('Secret Name')).toBe(false);
  });
});

describe('a failed upload', () => {
  async function expectNothingLeft(id: string) {
    expect(await image(id)).toBeUndefined();
    expect(await files(`images/${id}/`)).toEqual([]);
    expect(await files(`uploads/${id}/`)).toEqual([]);
  }

  it('fails an unsupported file', async () => {
    const heic = Buffer.concat([
      Buffer.from([0, 0, 0, 24]),
      Buffer.from('ftypheic'),
      Buffer.alloc(64),
    ]);
    await upload('u1', heic, 'photo.heic');
    expect(await record('u1')).toMatchObject({
      status: 'failed',
      error: 'unsupported',
    });
    await expectNothingLeft('u1');
  });

  it('Damaged file: fails a PNG cut off halfway', async () => {
    const png = await picture(300, 300).png().toBuffer();
    await upload('d1', png.subarray(0, png.length / 2));
    expect(await record('d1')).toMatchObject({
      status: 'failed',
      error: 'damaged',
    });
    await expectNothingLeft('d1');
  });

  it('Picture too large to process: fails 40,000 by 40,000 pixels from the header alone', async () => {
    await upload(
      't1',
      withSize(await picture(64, 64).png().toBuffer(), 40_000, 40_000),
    );
    expect(await record('t1')).toMatchObject({
      status: 'failed',
      error: 'too-large',
    });
    await expectNothingLeft('t1');
  });
});

describe('events processing ignores', () => {
  it('ignores objects outside uploads/, such as its own writes', async () => {
    await bucket.file('images/x1/full.webp').save(Buffer.from('x'));
    await processUploadedObject({ name: 'images/x1/full.webp', size: 1 });
    expect(await record('x1')).toBeUndefined();
  });

  it('stops at a repeated event whose record already exists', async () => {
    const png = await picture(64, 64).png().toBuffer();
    const name = 'uploads/e1/source';
    await bucket.file(name).save(png);
    await db
      .doc('uploads/e1')
      .create({ fileName: 'piece.png', status: 'processing' });
    await processUploadedObject({ name, size: png.length });
    expect(await image('e1')).toBeUndefined();
    expect(await record('e1')).toEqual({
      fileName: 'piece.png',
      status: 'processing',
    });
    expect(await files('uploads/e1/')).toEqual([name]);
  });

  it('stops when the source no longer exists', async () => {
    await processUploadedObject({ name: 'uploads/gone/source', size: 10 });
    expect(await record('gone')).toBeUndefined();
  });

  it('processes an event delivered twice only once', async () => {
    const png = await picture(64, 64).png().toBuffer();
    await upload('twice', png);
    await processUploadedObject({
      name: 'uploads/twice/source',
      size: png.length,
    });
    expect(await record('twice')).toMatchObject({ status: 'ready' });
  });
});

/** A PNG whose header claims another size; its pixel data is left as it was. */
function withSize(png: Buffer, width: number, height: number): Buffer {
  const out = Buffer.from(png);
  out.writeUInt32BE(width, 16);
  out.writeUInt32BE(height, 20);
  out.writeUInt32BE(crc32(out.subarray(12, 29)) >>> 0, 29);
  return out;
}

const workDirsOf = (id: string) =>
  readdirSync(tmpdir()).filter((name) =>
    name.startsWith(`${WORK_DIR_PREFIX}${id}-`),
  );

describe('a video upload', () => {
  it('A video is processed: becomes an artwork with its five files and a ready record carrying the duration', async () => {
    const mp4 = readFileSync(await phoneMp4());
    await upload('v1', mp4, 'clip.mp4', 'video/mp4');

    const file = (await image('v1'))?.file;
    expect(file).toEqual({
      original: 'images/v1/original.mp4',
      w: 320,
      h: 180,
      bytes: expect.any(Number),
      mime: 'video/mp4',
      animated: true,
      transparent: false,
      durationMs: expect.any(Number),
      hasAudio: true,
    });
    expect(await files('images/v1/')).toEqual([
      'images/v1/full.mp4',
      'images/v1/full.webp',
      'images/v1/original.mp4',
      'images/v1/preview.mp4',
      'images/v1/thumb.webp',
    ]);
    expect(await record('v1')).toMatchObject({
      status: 'ready',
      file: {
        w: 320,
        h: 180,
        mime: 'video/mp4',
        animated: true,
        durationMs: file?.durationMs,
      },
    });
    expect(await files('uploads/')).toEqual([]);
    expect(workDirsOf('v1')).toEqual([]);
  });

  it('gives the video files their content type and a download token', async () => {
    await upload('v1', readFileSync(await phoneMp4()), 'clip.mp4', 'video/mp4');
    for (const name of ['original.mp4', 'full.mp4', 'preview.mp4']) {
      const [meta] = await bucket.file(`images/v1/${name}`).getMetadata();
      expect(meta.contentType).toBe('video/mp4');
      expect(meta.metadata?.['firebaseStorageDownloadTokens']).toMatch(
        /^[0-9a-f-]{36}$/,
      );
    }
  });

  it('Video with the wrong extension: processes a WebM named .mp4 as a WebM', async () => {
    await upload(
      'w1',
      readFileSync(await silentWebm()),
      'loop.mp4',
      'video/mp4',
    );
    expect((await image('w1'))?.file).toMatchObject({
      original: 'images/w1/original.webm',
      mime: 'video/webm',
      hasAudio: false,
    });
    const [meta] = await bucket.file('images/w1/original.webm').getMetadata();
    expect(meta.contentType).toBe('video/webm');
  }, 60_000);

  it('records no duration for an image', async () => {
    await upload('p1', await picture(64, 64).png().toBuffer());
    expect((await record('p1'))?.file).not.toHaveProperty('durationMs');
    expect((await image('p1'))?.file).not.toHaveProperty('hasAudio');
  });
});

describe('a refused video', () => {
  async function expectRefused(id: string, video: string, code: string) {
    await upload(id, readFileSync(video), 'clip.mp4', 'video/mp4');
    expect(await record(id)).toMatchObject({ status: 'failed', error: code });
    expect(await image(id)).toBeUndefined();
    expect(await files(`images/${id}/`)).toEqual([]);
    expect(await files(`uploads/${id}/`)).toEqual([]);
    expect(workDirsOf(id)).toEqual([]);
  }

  it('Video too long: fails four minutes', async () => {
    await expectRefused('l1', await longClip(), 'video-too-long');
  });

  it('Video too large: fails 8K', async () => {
    await expectRefused('k1', await eightKFrame(), 'video-too-large');
  });

  it('Damaged file: fails a truncated MP4 as unreadable', async () => {
    await expectRefused('t1', await truncatedMp4(), 'unreadable');
  });

  it('Image sent as a video: fails a PNG over 50 MB as too large a file', async () => {
    const png = await picture(64, 64).png().toBuffer();
    const big = Buffer.concat([
      png,
      Buffer.alloc(50 * 1024 * 1024 + 1 - png.length),
    ]);
    await upload('b1', big, 'big.png', 'video/mp4');
    expect(await record('b1')).toMatchObject({
      status: 'failed',
      error: 'file-too-large',
    });
    expect(await image('b1')).toBeUndefined();
    expect(await files('images/b1/')).toEqual([]);
    expect(await files('uploads/b1/')).toEqual([]);
  });
});

describe('an upload after trouble', () => {
  it('fails an empty file as unsupported', async () => {
    await upload('e1', Buffer.alloc(0), 'empty.png');
    expect(await record('e1')).toMatchObject({
      status: 'failed',
      error: 'unsupported',
    });
    expect(await files('uploads/e1/')).toEqual([]);
  });

  it('removes the work directory of a run that was killed before its clean-up', async () => {
    const leftOver = mkdtempSync(join(tmpdir(), `${WORK_DIR_PREFIX}killed-`));
    writeFileSync(join(leftOver, 'source'), Buffer.alloc(1024));
    await upload('n1', await picture(64, 64).png().toBuffer());
    expect(existsSync(leftOver)).toBe(false);
    expect(await record('n1')).toMatchObject({ status: 'ready' });
  });
});
