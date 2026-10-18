import { aRow } from './testing';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { CDN_CACHE_CONTROL } from './cache-control';
import { summaryMaxAge } from './catalog';
import { crawlingRouter } from './crawling';
import { SUMMARY_MAX_AGE_MS, SummaryCache } from './summary-cache';

let server: Server;
let base: string;

beforeEach(async () => {
  // The summary holds only published pieces.
  const rows = [
    aRow('sfw', '2026-02-14'),
    aRow('lewd', '2026-02-13', { nsfw: true }),
    aRow('a&b', '2026-02-12'),
  ];
  const summaries = new SummaryCache(async () => JSON.stringify(rows));
  const app = express();
  app.set('trust proxy', true);
  app.use(crawlingRouter(summaries));
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

const proxied = {
  'X-Forwarded-Proto': 'https',
  'X-Forwarded-Host': 'public--tigy-165cc.europe-west4.hosted.app',
};

describe('GET /robots.txt', () => {
  it('Search engines: disallows /api/ and names the sitemap on the public host', async () => {
    const response = await fetch(`${base}/robots.txt`, { headers: proxied });
    expect(response.headers.get('cache-control')).toBe(CDN_CACHE_CONTROL);
    expect(await response.text()).toBe(
      'User-agent: *\nDisallow: /api/\n\nSitemap: https://public--tigy-165cc.europe-west4.hosted.app/sitemap.xml\n',
    );
  });
});

describe('GET /sitemap.xml', () => {
  it('Sitemap contents: lists the home page and only the published SFW pieces', async () => {
    const response = await fetch(`${base}/sitemap.xml`, { headers: proxied });
    expect(response.headers.get('content-type')).toMatch(/^application\/xml/);
    expect(response.headers.get('cache-control')).toBe(CDN_CACHE_CONTROL);
    const body = await response.text();
    expect([...body.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1])).toEqual(
      [
        'https://public--tigy-165cc.europe-west4.hosted.app/',
        'https://public--tigy-165cc.europe-west4.hosted.app/i/sfw',
        'https://public--tigy-165cc.europe-west4.hosted.app/i/a%26b',
      ],
    );
  });
});

describe('a forged host', () => {
  it('is refused, and the refusal is not cached', async () => {
    for (const path of ['/robots.txt', '/sitemap.xml']) {
      const response = await fetch(base + path, {
        headers: { 'X-Forwarded-Host': 'evil.example' },
      });
      expect(response.status, path).toBe(400);
      expect(response.headers.get('cache-control'), path).toBe('no-store');
    }
  });
});

describe('summaryMaxAge', () => {
  it('keeps the summaries 5 minutes unless the tests shorten it', () => {
    expect(summaryMaxAge({})).toBe(SUMMARY_MAX_AGE_MS);
    expect(summaryMaxAge({ SUMMARY_MAX_AGE_MS: '1000' })).toBe(1000);
    expect(summaryMaxAge({ SUMMARY_MAX_AGE_MS: 'soon' })).toBe(
      SUMMARY_MAX_AGE_MS,
    );
  });
});
