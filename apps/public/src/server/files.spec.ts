import { aRow } from './testing';
import type { GalleryRow } from '@tigy/models';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Readable } from 'node:stream';
import { CDN_CACHE_CONTROL, FILE_CACHE_CONTROL } from './cache-control';
import { downloadName, filesRouter, type FileStore } from './files';
import { SummaryCache } from './summary-cache';

const BUCKET: Record<string, { body: string; type: string }> = {
  'images/hey/thumb.webp': { body: 'thumb', type: 'image/webp' },
  'images/hey/full.webp': { body: 'full', type: 'image/webp' },
  'images/hey/original.png': { body: 'original', type: 'image/png' },
  'images/lewd/full.webp': { body: 'lewd', type: 'image/webp' },
  'images/draft/original.jpg': { body: 'draft', type: 'image/jpeg' },
  'people/tigy/avatar.webp': { body: 'avatar', type: 'image/webp' },
};

const ROWS: GalleryRow[] = [
  aRow('hey', '2026-02-14', { title: 'Hey Pookie!' }),
  aRow('lewd', '2026-02-14', { nsfw: true }),
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
            read: () => Readable.from([Buffer.from(file.body)]),
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
