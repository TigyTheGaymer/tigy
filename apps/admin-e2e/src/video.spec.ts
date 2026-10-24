import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { readDoc, seed } from './support/emulators';
import { signInAsOwner } from './support/sign-in';

test.afterEach(() => seed());

const tiles = (page: Page) =>
  page.getByRole('list', { name: 'Artworks' }).getByRole('listitem');
const imageId = (page: Page) =>
  new URL(page.url()).pathname.split('/').pop() ?? '';

/** 3 s of 320 × 180 with a tone, made at test time so no video lives in the repository. */
function makeMp4(path: string): string {
  execFileSync(ffmpegPath as unknown as string, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-f',
    'lavfi',
    '-i',
    'testsrc=size=320x180:rate=10:duration=3',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:duration=3',
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    path,
  ]);
  return path;
}

test('Uploading a video: it becomes ready, the editor plays it with its duration, and it publishes', async ({
  page,
}, testInfo) => {
  test.slow();
  const clip = makeMp4(testInfo.outputPath('clip.mp4'));
  await signInAsOwner(page, '/artworks?view=unpublished');
  await page.locator('input[type=file]').setInputFiles(clip);

  await expect(tiles(page)).toHaveCount(1, { timeout: 120_000 });
  await expect(tiles(page)).toContainText('0:03');
  await tiles(page).getByRole('link').first().click();
  await expect(page).toHaveURL(/\/artworks\/[A-Za-z0-9]+\?view=unpublished$/);
  const id = imageId(page);

  const player = page.locator('section[aria-label="Picture"] video');
  await expect(player).toHaveAttribute('src', /images%2F.+%2Ffull\.mp4/);
  expect(
    await player.evaluate(
      (video: HTMLVideoElement) => video.muted && video.controls,
    ),
  ).toBe(true);
  const details = page.locator('#file-info');
  await expect(details).toContainText('MP4 video');
  await expect(details).toContainText('0:03');
  await expect(details).toContainText('320 × 180');

  await page.getByRole('switch', { name: 'Published' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  // A fresh upload has no artist, title or date.
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Publish anyway' })
    .click();
  await expect(page.getByText('Unsaved edits')).toBeHidden();
  await expect
    .poll(() => readDoc(`images/${id}`))
    .toEqual(
      expect.objectContaining({
        published: true,
        file: expect.objectContaining({
          mime: 'video/mp4',
          hasAudio: true,
          w: 320,
          h: 180,
        }),
      }),
    );
});
