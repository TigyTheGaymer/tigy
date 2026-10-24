import { aRow } from './testing';
import type { GalleryRow } from '@tigy/models';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Readable } from 'node:stream';
import { CDN_CACHE_CONTROL, FILE_CACHE_CONTROL } from './cache-control';
import { downloadName, filesRouter, parseRange, type FileStore } from './files';
import { SummaryCache } from './summary-cache';

const BUCKET: Record<string, { body: string; type: string }> = {
  'images/hey/thumb.webp': { body: 'thumb', type: 'image/webp' },
  'images/hey/full.webp': { body: 'full', type: 'image/webp' },
  'images/hey/original.png': { body: 'original', type: 'image/png' },
  'images/lewd/full.webp': { body: 'lewd', type: 'image/webp' },
  'images/draft/original.jpg': { body: 'draft', type: 'image/jpeg' },
  'images/clip/full.mp4': { body: '0123456789', type: 'video/mp4' },
  'images/clip/preview.mp4': { body: 'preview', type: 'video/mp4' },
  'images/clip/original.mov': { body: 'original', type: 'video/quicktime' },
  'images/lewdclip/full.mp4': { body: 'lewd', type: 'video/mp4' },
  'images/lewdclip/preview.mp4': { body: 'lewd', type: 'video/mp4' },
  'images/lewdclip/original.mp4': { body: 'lewd', type: 'video/mp4' },
  'people/tigy/avatar.webp': { body: 'avatar', type: 'image/webp' },
};

const ROWS: GalleryRow[] = [
  aRow('hey', '2026-02-14', { title: 'Hey Pookie!' }),
  aRow('lewd', '2026-02-14', { nsfw: true }),
  aRow('clip', '2026-02-14', { title: 'Hey Pookie!', isVideo: true }),
  aRow('lewdclip', '2026-02-14', { nsfw: true, isVideo: true }),
];

let server: Server;
let base: string;
let opened: string[];

beforeEach(async () => {
  opened = [];
  const store: FileStore = {
    open: async (path) => {
      opened.push(path);
      const file = BUCKET[path];
      return file
        ? {
            contentType: file.type,
            size: file.body.length,
            read: (range) =>
              Readable.from([
                Buffer.from(
                  range
                    ? file.body.slice(range.start, range.end + 1)
                    : file.body,
                ),
              ]),
          }
        : null;
    },
  };
  const summaries = new SummaryCache(async (path) =>
    path === 'meta/gallery' ? JSON.stringify(ROWS) : '[]',
  );
  const app = express();
  app.use(filesRouter(store, summaries));
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe('GET /img/:id/:file', () => {
  it('Thumbnail of a piece: streams it from Storage with the file caching', async () => {
    const response = await fetch(`${base}/img/hey/thumb.webp`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('thumb');
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(response.headers.get('cache-control')).toBe(FILE_CACHE_CONTROL);
    expect(response.headers.get('x-robots-tag')).toBeNull();
    expect(response.headers.get('content-disposition')).toBeNull();
  });

  it('Download name: sends the original as an attachment named after the title', async () => {
    const response = await fetch(`${base}/img/hey/original.png`);
    expect(await response.text()).toBe('original');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename=hey-pookie.png',
    );
  });

  it('names an original without a title, or not in the summary, tigy-{id}', async () => {
    const response = await fetch(`${base}/img/draft/original.jpg`);
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename=tigy-draft.jpg',
    );
  });

  it('Search engines: marks the files of an NSFW piece noindex', async () => {
    const response = await fetch(`${base}/img/lewd/full.webp`);
    expect(response.status).toBe(200);
    expect(response.headers.get('x-robots-tag')).toBe('noindex');
  });

  it('Files of a deleted piece: 404 once the file is gone', async () => {
    const response = await fetch(`${base}/img/gone/full.webp`);
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe(CDN_CACHE_CONTROL);
  });

  it('serves no other file name, and never reads Storage for one', async () => {
    for (const path of [
      '/img/hey/secret.txt',
      '/img/hey/original.',
      '/img/hey/thumb.png',
      '/img/..%2Fpeople/full.webp',
    ]) {
      expect((await fetch(base + path)).status, path).toBe(404);
    }
    expect(opened).toEqual([]);
  });
});

describe('GET /img/:id/:file of a video', () => {
  const get = (path: string, range?: string) =>
    fetch(base + path, range ? { headers: { Range: range } } : undefined);

  it('serves the web copy and the preview as MP4s', async () => {
    for (const [file, body] of [
      ['full.mp4', '0123456789'],
      ['preview.mp4', 'preview'],
    ]) {
      const response = await get(`/img/clip/${file}`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe(body);
      expect(response.headers.get('content-type')).toBe('video/mp4');
      expect(response.headers.get('cache-control')).toBe(FILE_CACHE_CONTROL);
    }
    expect(opened).toEqual(['images/clip/full.mp4', 'images/clip/preview.mp4']);
  });

  it('Video download: names the original after the title', async () => {
    const response = await get('/img/clip/original.mov');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename=hey-pookie.mov',
    );
  });

  it('Range request: answers 206 with exactly those bytes and the full size', async () => {
    const response = await get('/img/clip/full.mp4', 'bytes=2-5');
    expect(response.status).toBe(206);
    expect(await response.text()).toBe('2345');
    expect(response.headers.get('content-range')).toBe('bytes 2-5/10');
    expect(response.headers.get('content-length')).toBe('4');
    expect(response.headers.get('cache-control')).toBe(FILE_CACHE_CONTROL);
  });

  it('answers an open-ended and a suffix range', async () => {
    const open = await get('/img/clip/full.mp4', 'bytes=7-');
    expect(open.status).toBe(206);
    expect(await open.text()).toBe('789');
    expect(open.headers.get('content-range')).toBe('bytes 7-9/10');

    const suffix = await get('/img/clip/full.mp4', 'bytes=-3');
    expect(suffix.status).toBe(206);
    expect(await suffix.text()).toBe('789');
    expect(suffix.headers.get('content-range')).toBe('bytes 7-9/10');
  });

  it('clamps a range that runs past the end', async () => {
    const response = await get('/img/clip/full.mp4', 'bytes=8-100');
    expect(await response.text()).toBe('89');
    expect(response.headers.get('content-range')).toBe('bytes 8-9/10');
  });

  it('Range beyond the end: answers 416 with the full size', async () => {
    const response = await get('/img/clip/full.mp4', 'bytes=10-20');
    expect(response.status).toBe(416);
    expect(response.headers.get('content-range')).toBe('bytes */10');
    expect(await response.text()).toBe('');
  });

  it('sends the whole file for several ranges or a malformed header', async () => {
    for (const range of [
      'bytes=0-1,4-5',
      'bytes=5-2',
      'items=0-1',
      'bytes=-',
    ]) {
      const response = await get('/img/clip/full.mp4', range);
      expect(response.status, range).toBe(200);
      expect(await response.text(), range).toBe('0123456789');
    }
  });

  it('offers ranges on every file, images and avatars included', async () => {
    for (const path of [
      '/img/hey/thumb.webp',
      '/img/hey/original.png',
      '/img/clip/preview.mp4',
      '/avatars/tigy.webp',
    ]) {
      expect((await get(path)).headers.get('accept-ranges'), path).toBe(
        'bytes',
      );
    }
    const image = await get('/img/hey/full.webp', 'bytes=0-1');
    expect(image.status).toBe(206);
    expect(await image.text()).toBe('fu');
  });

  it('NSFW video files: marks the web copy, preview and original noindex', async () => {
    for (const file of ['full.mp4', 'preview.mp4', 'original.mp4']) {
      const response = await get(`/img/lewdclip/${file}`, 'bytes=0-1');
      expect(response.headers.get('x-robots-tag'), file).toBe('noindex');
    }
  });
});

describe('parseRange', () => {
  it('reads one range against the size', () => {
    expect(parseRange('bytes=0-0', 10)).toEqual({ start: 0, end: 0 });
    expect(parseRange('bytes=-20', 10)).toEqual({ start: 0, end: 9 });
    expect(parseRange('bytes=-0', 10)).toBe('unsatisfiable');
    expect(parseRange('bytes=0-', 0)).toBe('unsatisfiable');
    expect(parseRange(undefined, 10)).toBeUndefined();
  });
});

describe('GET /avatars/:id.webp', () => {
  it("Tigy's avatar: streams people/tigy/avatar.webp with the file caching", async () => {
    const response = await fetch(`${base}/avatars/tigy.webp`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('avatar');
    expect(response.headers.get('cache-control')).toBe(FILE_CACHE_CONTROL);
    expect(opened).toEqual(['people/tigy/avatar.webp']);
  });

  it('returns 404 for a person without an avatar or another name', async () => {
    expect((await fetch(`${base}/avatars/ann.webp`)).status).toBe(404);
    expect((await fetch(`${base}/avatars/tigy.png`)).status).toBe(404);
    expect((await fetch(`${base}/avatars/.webp`)).status).toBe(404);
  });
});

describe('downloadName', () => {
  it('lowercases the title and joins its words with hyphens', () => {
    expect(downloadName('x', 'Hey Pookie!', 'png')).toBe('hey-pookie.png');
    expect(downloadName('x', '  Café  au lait ', 'gif')).toBe(
      'cafe-au-lait.gif',
    );
  });

  it('falls back to tigy-{id} without a usable title', () => {
    expect(downloadName('k3x', undefined, 'png')).toBe('tigy-k3x.png');
    expect(downloadName('k3x', '!!!', 'png')).toBe('tigy-k3x.png');
  });
});
