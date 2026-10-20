import { expect, test } from '@playwright/test';
import { addImages, seed } from './support/emulators';

const isLoaded = (el: HTMLImageElement) => el.complete && el.naturalWidth > 0;

test('Thumbnail of a piece: loads from the site address for that piece', async ({
  page,
}) => {
  await page.goto('/');
  const thumb = page.locator('.tile img').first();
  await expect(thumb).toHaveAttribute('src', '/img/tigy-portrait/thumb.webp');
  await expect.poll(() => thumb.evaluate(isLoaded)).toBe(true);
});

test("Tigy's avatar: loads from /avatars/tigy.webp", async ({ page }) => {
  await page.goto('/');
  const avatar = page.locator('.avatar');
  await expect(avatar).toHaveAttribute('src', '/avatars/tigy.webp');
  await expect.poll(() => avatar.evaluate(isLoaded)).toBe(true);
});

test('Download name: the original of "Hey Pookie!", a PNG, saves as hey-pookie.png', async ({
  page,
}) => {
  await page.goto('/i/hey-pookie');
  const download = page.waitForEvent('download');
  await page.locator('.download').click();
  expect((await download).suggestedFilename()).toBe('hey-pookie.png');
});

test('Search engines: NSFW pages and files say noindex, and robots.txt keeps out of /api/', async ({
  request,
  baseURL,
}) => {
  for (const path of [
    '/i/hey-pookie-nsfw-test',
    '/i/hey-pookie-nsfw-test?safe',
  ]) {
    const html = await (await request.get(path)).text();
    expect(html, path).toContain('<meta name="robots" content="noindex">');
  }
  for (const file of ['thumb.webp', 'full.webp', 'original.png']) {
    const response = await request.get(`/img/hey-pookie-nsfw-test/${file}`);
    expect(response.headers()['x-robots-tag'], file).toBe('noindex');
  }
  const sfw = await request.get('/img/hey-pookie/full.webp');
  expect(sfw.headers()['x-robots-tag']).toBeUndefined();

  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /api/');
  expect(robots).toContain(`Sitemap: ${baseURL}/sitemap.xml`);
});

test.describe('the sitemap', () => {
  test.beforeAll(() =>
    addImages([{ id: 'draft', fields: { title: 'Draft', published: false } }]),
  );
  test.afterAll(() => seed());

  test('Sitemap contents: the home page and only the published SFW pieces', async ({
    request,
    baseURL,
  }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    const urls = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    expect(urls.sort()).toEqual(
      [
        '/',
        '/i/chibi-tigy',
        '/i/happy-tigy',
        '/i/hey-pookie',
        '/i/ref-sheet',
        '/i/tigy-portrait',
      ]
        .map((path) => baseURL + path)
        .sort(),
    );
  });
});

test('a missing file returns 404', async ({ request }) => {
  expect((await request.get('/img/no-such-piece/full.webp')).status()).toBe(
    404,
  );
  expect((await request.get('/avatars/placeholder-artist.webp')).status()).toBe(
    404,
  );
});
