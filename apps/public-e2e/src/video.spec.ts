import { expect, test, type Page } from '@playwright/test';
import { addImages, bucket, rebuildSummaries, seed } from './support/emulators';

const VIDEO = 'happy-tigy-loop';
const NSFW_VIDEO = 'lewd-loop';

const tile = (page: Page, id = VIDEO) =>
  page.locator(`.gallery .tile a[href="/i/${id}"]`);
const isPlaying = (video: HTMLVideoElement) =>
  !video.paused && video.currentTime > 0;

test('the server sends a video tile as its still alone', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain(`/img/${VIDEO}/thumb.webp`);
  expect(html).not.toContain('<video');
});

test('Scrolling past a video: its tile plays the silent preview in a loop', async ({
  page,
}) => {
  await page.goto('/');
  await tile(page).scrollIntoViewIfNeeded();
  const video = tile(page).locator('video');
  await expect(video).toHaveAttribute('src', `/img/${VIDEO}/preview.mp4`);
  await expect.poll(() => video.evaluate(isPlaying)).toBe(true);
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted && v.loop)).toBe(
    true,
  );
  await expect(tile(page).locator('img')).toBeAttached();
});

test('Reduced motion: video tiles show their stills and load no preview', async ({
  page,
}) => {
  const previews: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/preview.mp4')) previews.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await tile(page).scrollIntoViewIfNeeded();
  await expect(tile(page).locator('img')).toBeVisible();
  await expect(tile(page).locator('video')).toHaveCount(0);
  expect(previews).toEqual([]);
});

test('Opening a video piece: the player starts muted and looping, and can be unmuted', async ({
  page,
}) => {
  await page.goto(`/i/${VIDEO}`);
  const player = page.locator('video.player');
  await expect(player).toHaveAttribute('src', `/img/${VIDEO}/full.mp4`);
  await expect(player).toHaveAttribute('poster', `/img/${VIDEO}/full.webp`);
  await expect.poll(() => player.evaluate(isPlaying)).toBe(true);
  expect(await player.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
  await expect(page.locator('[aria-label="Full view"]')).toHaveCount(0);
  await expect(page.locator('.file')).toHaveText(
    /^MP4 video · 0:04 · With sound · 640 × 640 px · \d+ KB$/,
  );

  await player.evaluate((v: HTMLVideoElement) => {
    v.muted = false;
  });
  expect(
    await player.evaluate((v: HTMLVideoElement) => !v.muted && !v.paused),
  ).toBe(true);
});

test('Reduced motion: the player waits on its still until play is pressed', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/i/${VIDEO}`);
  const player = page.locator('video.player');
  await expect(player).toBeVisible();
  expect(await player.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
});

test('Seeking: the player reads the web copy in byte ranges', async ({
  page,
  request,
}) => {
  const statuses: number[] = [];
  page.on('response', (response) => {
    if (response.url().endsWith(`/img/${VIDEO}/full.mp4`)) {
      statuses.push(response.status());
    }
  });
  await page.goto(`/i/${VIDEO}`);
  const player = page.locator('video.player');
  await expect.poll(() => player.evaluate(isPlaying)).toBe(true);
  await player.evaluate((v: HTMLVideoElement) => {
    v.currentTime = 2.5;
  });
  await expect
    .poll(() => player.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThanOrEqual(2.5);
  expect(statuses).toContain(206);

  const range = await request.get(`/img/${VIDEO}/full.mp4`, {
    headers: { Range: 'bytes=1000-1999' },
  });
  expect(range.status()).toBe(206);
  expect((await range.body()).length).toBe(1000);
  expect(range.headers()['content-range']).toMatch(/^bytes 1000-1999\/\d+$/);
});

test('Video download: the original saves under the title with its extension', async ({
  page,
}) => {
  await page.goto(`/i/${VIDEO}`);
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download original' }).click();
  expect((await download).suggestedFilename()).toBe('happy-tigy-loop.mp4');
});

test.describe('an NSFW video', () => {
  test.beforeAll(async () => {
    for (const file of [
      'original.mp4',
      'full.mp4',
      'preview.mp4',
      'full.webp',
      'thumb.webp',
    ]) {
      await bucket
        .file(`images/${VIDEO}/${file}`)
        .copy(`images/${NSFW_VIDEO}/${file}`);
    }
    await addImages([
      {
        id: NSFW_VIDEO,
        fields: {
          title: 'Lewd loop',
          nsfw: true,
          file: {
            original: `images/${NSFW_VIDEO}/original.mp4`,
            w: 640,
            h: 640,
            bytes: 69_339,
            mime: 'video/mp4',
            animated: true,
            transparent: false,
            durationMs: 4000,
            hasAudio: true,
          },
        },
      },
    ]);
    await rebuildSummaries();
  });
  test.afterAll(() => seed());

  test('NSFW video behind the confirm screen: nothing of it loads until the visitor confirms', async ({
    page,
    request,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem('tigy.nsfw.age', '1'),
    );
    const files: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes(`/img/${NSFW_VIDEO}/`)) files.push(r.url());
    });
    await page.goto(`/i/${NSFW_VIDEO}`);
    await expect(
      page.getByRole('button', { name: 'Show this piece' }),
    ).toBeVisible();
    await expect(page.locator('video')).toHaveCount(0);
    // eslint-disable-next-line playwright/no-networkidle -- checks that no request is made
    await page.waitForLoadState('networkidle');
    expect(files).toEqual([]);

    await page.getByRole('button', { name: 'Show this piece' }).click();
    await expect(page.locator('video.player')).toHaveAttribute(
      'src',
      `/img/${NSFW_VIDEO}/full.mp4`,
    );

    for (const file of ['full.mp4', 'preview.mp4', 'original.mp4']) {
      const response = await request.get(`/img/${NSFW_VIDEO}/${file}`);
      expect(response.headers()['x-robots-tag'], file).toBe('noindex');
    }
  });
});
