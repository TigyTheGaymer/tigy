import { expect, test, type Locator, type Page } from '@playwright/test';
import { imagePaths, type Image } from '@tigy/models';
import sharp from 'sharp';
import { addImages, bucket, seed } from './support/emulators';
import { withoutAppScripts } from './support/without-app-scripts';

const LAPTOP = { width: 1440, height: 900 };
const VIDEO = 'happy-tigy-loop';

const PIECES: [id: string, w: number, h: number, sortDate: string][] = [
  ['fit-newest', 800, 800, '2027-01-08'],
  ['fit-square', 800, 800, '2027-01-07'],
  ['fit-small', 440, 242, '2027-01-06'],
  ['fit-vertical', 1000, 1600, '2027-01-05'],
  ['fit-wide', 2048, 1000, '2027-01-04'],
  ['fit-strip', 600, 3000, '2027-01-03'],
];

const box = async (locator: Locator) => (await locator.boundingBox())!;
const image = (page: Page) => page.locator('.piece img');
const frame = (page: Page) => page.locator('.frame');
const bar = (page: Page) => page.locator('.stage-top');

/** Whole, at its shape, and reaching the free space on the given side. */
async function expectFit(
  piece: Locator,
  space: Locator,
  ratio: number,
  reaches: 'width' | 'height',
): Promise<void> {
  const shown = await box(piece);
  const free = await box(space);
  expect(shown.x).toBeGreaterThanOrEqual(free.x - 1);
  expect(shown.y).toBeGreaterThanOrEqual(free.y - 1);
  expect(shown.x + shown.width).toBeLessThanOrEqual(free.x + free.width + 1);
  expect(shown.y + shown.height).toBeLessThanOrEqual(free.y + free.height + 1);
  expect(shown.width / shown.height).toBeCloseTo(ratio, 1);
  expect(shown[reaches]).toBeCloseTo(free[reaches], 0);
}

test.beforeAll(async () => {
  const images: { id: string; fields: Partial<Image> }[] = [];
  for (const [id, w, h, sortDate] of PIECES) {
    const full = await sharp({
      create: { width: w, height: h, channels: 3, background: '#f5a742' },
    })
      .webp()
      .toBuffer();
    await bucket
      .file(imagePaths.full(id))
      .save(full, { contentType: 'image/webp', resumable: false });
    images.push({
      id,
      fields: {
        sortDate,
        file: {
          original: imagePaths.original(id, 'png'),
          w,
          h,
          bytes: 1000,
          mime: 'image/png',
          animated: false,
          transparent: false,
        },
      },
    });
  }
  await addImages([
    ...images,
    { id: 'fit-lewd', fields: { sortDate: '2027-01-02', nsfw: true } },
  ]);
});
test.afterAll(() => seed());

test.describe('on a laptop', () => {
  test.beforeEach(({ page }) => page.setViewportSize(LAPTOP));

  for (const [name, id, ratio, reaches] of [
    ['Small picture', 'fit-small', 440 / 242, 'width'],
    ['Vertical picture', 'fit-vertical', 1000 / 1600, 'height'],
    ['Wide picture', 'fit-wide', 2048 / 1000, 'width'],
    ['Square picture', 'fit-square', 1, 'height'],
    ['A very tall strip', 'fit-strip', 600 / 3000, 'height'],
  ] as const) {
    test(`${name}: fills the free space and is not cut off`, async ({
      page,
    }) => {
      await page.goto(`/i/${id}`);
      await expectFit(image(page), frame(page), ratio, reaches);
    });
  }

  test('Small video: the player fills the free space at the video’s shape', async ({
    page,
  }) => {
    await page.goto(`/i/${VIDEO}`);
    await expectFit(page.locator('video.player'), frame(page), 1, 'height');
  });

  test('First HTML: the piece is at its final size without scripts', async ({
    page,
  }) => {
    await withoutAppScripts(page);
    await page.goto('/i/fit-vertical');
    await expectFit(image(page), frame(page), 1000 / 1600, 'height');
  });

  test('Vertical piece under the bar: the top of the piece starts below it', async ({
    page,
  }) => {
    await page.goto('/i/fit-vertical');
    const stageBar = await box(bar(page));
    expect((await box(image(page))).y).toBeGreaterThanOrEqual(
      stageBar.y + stageBar.height,
    );
  });

  test('Wide piece between the arrows: it touches neither', async ({
    page,
  }) => {
    await page.goto('/i/fit-wide');
    const previous = await box(page.locator('.nav.prev'));
    const next = await box(page.locator('.nav.next'));
    const shown = await box(image(page));
    expect(shown.x).toBeGreaterThanOrEqual(previous.x + previous.width);
    expect(shown.x + shown.width).toBeLessThanOrEqual(next.x);
  });

  test('The arrows sit level with the piece', async ({ page }) => {
    await page.goto('/i/fit-wide');
    const arrow = await box(page.locator('.nav.next'));
    const shown = await box(image(page));
    expect(arrow.y + arrow.height / 2).toBeCloseTo(
      shown.y + shown.height / 2,
      0,
    );
  });

  test('The newest piece: its place does not depend on having a previous piece', async ({
    page,
  }) => {
    await page.goto('/i/fit-newest');
    await expect(page.locator('.nav.prev')).toHaveCount(0);
    const before = await box(image(page));

    await page.locator('.nav.next').click();
    await expect(page.locator('.nav.prev')).toHaveCount(1);
    await expect(image(page)).toHaveAttribute(
      'src',
      '/img/fit-square/full.webp',
    );
    expect(await box(image(page))).toEqual(before);
  });

  test('Closing the credits panel: the piece grows without reloading', async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('/img/fit-wide/full.webp')) {
        requests.push(request.url());
      }
    });
    await page.goto('/i/fit-wide');
    const before = await box(image(page));

    const close = page.getByRole('button', { name: 'Close credits' });
    await expect
      .poll(async () => {
        if (await close.isVisible()) await close.click();
        return (await box(image(page))).width;
      })
      .toBeGreaterThan(before.width);
    await expectFit(image(page), frame(page), 2048 / 1000, 'width');
    expect(requests).toHaveLength(1);
  });

  test('Resizing the window: the piece shrinks with it and is never cut off', async ({
    page,
  }) => {
    await page.goto('/i/fit-vertical');
    const before = await box(image(page));

    await page.setViewportSize({ width: 1200, height: 500 });
    await expectFit(image(page), frame(page), 1000 / 1600, 'height');
    expect((await box(image(page))).height).toBeLessThan(before.height);
  });

  test('Confirm screen on a laptop: centred in the free space, clear of the bar', async ({
    page,
  }) => {
    await page.goto('/i/fit-lewd');
    const panel = await box(page.locator('.stage-panel'));
    const stageBar = await box(bar(page));
    const stage = await box(page.locator('.stage'));
    const free = {
      top: stageBar.y + stageBar.height,
      bottom: stage.y + stage.height - 16,
    };
    expect(panel.y).toBeGreaterThanOrEqual(free.top);
    expect(panel.y + panel.height / 2).toBeCloseTo(
      (free.top + free.bottom) / 2,
      0,
    );
    expect(panel.x + panel.width / 2).toBeCloseTo(stage.x + stage.width / 2, 0);
  });

  test('Full view, opening a small piece: fills the screen’s width, larger than on the page', async ({
    page,
  }) => {
    await page.goto('/i/fit-small');
    const onPage = await box(image(page));
    await page
      .getByRole('button', { name: 'Full view', exact: true })
      .first()
      .click();

    const shown = await box(page.locator('app-full-view img'));
    expect(shown.width).toBeCloseTo(LAPTOP.width, 0);
    expect(shown.width / shown.height).toBeCloseTo(440 / 242, 1);
    expect(shown.width).toBeGreaterThan(onPage.width);
  });

  test('Full view, dragging a zoomed vertical piece: it stops with its edge at the edge of the screen', async ({
    page,
  }) => {
    await page.goto('/i/fit-vertical');
    await page
      .getByRole('button', { name: 'Full view', exact: true })
      .first()
      .click();
    const shown = page.locator('app-full-view img');
    const zoom = page.getByRole('button', { name: 'Zoom in' });
    await zoom.click();
    await zoom.click();
    await zoom.click();
    await expect(page.locator('app-full-view .zoom')).toHaveText('338%');
    await expect
      .poll(async () => (await box(shown)).width)
      .toBeGreaterThan(LAPTOP.width);

    await page.mouse.move(100, 450);
    await page.mouse.down();
    await page.mouse.move(1400, 450);
    await page.mouse.up();

    expect((await box(shown)).x).toBeCloseTo(0, 0);
  });
});

test.describe('the stage bar', () => {
  const fade = (page: Page) =>
    bar(page).evaluate((el) => {
      const style = getComputedStyle(el);
      return { position: style.position, image: style.backgroundImage };
    });

  test('takes its own row, with no fade, on an artwork page', async ({
    page,
  }) => {
    await page.goto('/i/fit-wide');
    expect(await fade(page)).toEqual({ position: 'static', image: 'none' });
  });

  for (const path of ['/privacy', '/no-such-page']) {
    test(`still floats with its fade on ${path}`, async ({ page }) => {
      await page.goto(path);
      const { position, image: background } = await fade(page);
      expect(position).toBe('absolute');
      expect(background).toContain('linear-gradient');
    });
  }
});

test.describe('on smaller screens', () => {
  test('On a phone: the arrows sit below the piece and the bar above it', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/i/fit-vertical');
    const shown = await box(image(page));
    const stageBar = await box(bar(page));
    expect(shown.y).toBeGreaterThanOrEqual(stageBar.y + stageBar.height);
    for (const arrow of ['.nav.prev', '.nav.next']) {
      const { y, x, width } = await box(page.locator(arrow));
      expect(y).toBeGreaterThanOrEqual(shown.y + shown.height);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + width).toBeLessThanOrEqual(375);
    }
    await expectFit(image(page), frame(page), 1000 / 1600, 'height');
  });

  test('On a phone, a wide piece fills the width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/i/fit-wide');
    await expectFit(image(page), frame(page), 2048 / 1000, 'width');
    expect((await box(image(page))).width).toBeCloseTo(375, 0);
  });

  test('On a small phone: every control fits within the screen', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/i/fit-wide');
    const widths = await bar(page).evaluate((el) => [
      el.scrollWidth,
      el.clientWidth,
    ]);
    expect(widths[0]).toBeLessThanOrEqual(widths[1]);
    await expect(page.locator('.stage')).toHaveJSProperty('clientWidth', 320);
  });

  test('On a tablet: the start of the credits shows below the stage', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/i/fit-vertical');
    const stage = await box(page.locator('.stage'));
    expect(stage.height).toBeLessThan(1024);
    expect((await box(page.locator('#credits'))).y).toBeLessThan(1024);
    await expectFit(image(page), frame(page), 1000 / 1600, 'height');
  });
});
