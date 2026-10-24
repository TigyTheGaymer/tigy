import { expect, test, type Page } from '@playwright/test';
import { addImages, bulkPieces, seed } from './support/emulators';

const tiles = (page: Page) => page.locator('.gallery .tile a');
const background = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const FUR = 'rgb(245, 167, 66)';
const NIGHT = 'rgb(42, 13, 14)';

/** Lets only the page's own inline script run, as before the app loads. */
async function withoutAppScripts(page: Page): Promise<void> {
  await page.route(/\.(m?js)(\?|$)/, (route) => route.abort());
}

test.describe('foundations', () => {
  test('fonts are self-hosted, and the alternates are never downloaded', async ({
    page,
    baseURL,
  }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.goto('/i/hey-pookie');
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect(requests.filter((url) => !url.startsWith(baseURL!))).toEqual([]);
    const fonts = requests.filter((url) => url.includes('/fonts/'));
    expect(fonts.some((url) => url.includes('grandstander'))).toBe(true);
    expect(fonts.some((url) => url.includes('nunito'))).toBe(true);
    expect(fonts.filter((url) => /fredoka|sour-gummy/.test(url))).toEqual([]);
  });

  test('the colour tokens resolve in both themes', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    expect(await background(page)).toBe(FUR);
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await background(page)).toBe(NIGHT);
    // Tiles sit on the panel colour.
    const panel = await page.evaluate(
      () => getComputedStyle(document.querySelector('.tile')!).backgroundColor,
    );
    expect(panel).toBe('rgb(61, 23, 24)');
  });
});

test.describe('icons and controls', () => {
  test('social logos and interface icons use the text colour in both themes', async ({
    page,
  }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      await page.goto('/');
      const link = page.locator('.socials a').first();
      const [text, logo] = await link.evaluate((a) => [
        getComputedStyle(a).color,
        getComputedStyle(a.querySelector('svg.logo')!).fill,
      ]);
      expect(logo, colorScheme).toBe(text);
      const button = page.locator('.theme-btn');
      const [ink, stroke] = await button.evaluate((b) => [
        getComputedStyle(b).color,
        getComputedStyle(b.querySelector('svg')!).stroke,
      ]);
      expect(stroke, colorScheme).toBe(ink);
    }
  });

  test('the theme button and the NSFW switch work from the keyboard alone', async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem('tigy.nsfw.age', '1'));
    await page.goto('/');
    await page.locator('.theme-btn').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.theme-btn')).toHaveAttribute(
      'aria-label',
      /^Theme: Light/,
    );
    await page.keyboard.press('Tab');
    const toggle = page.getByRole('switch', { name: 'Show NSFW' });
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Space');
    await expect(toggle).toBeChecked();
  });
});

test.describe('theme', () => {
  test('Automatic: with no choice, the site follows the device', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    expect(
      await page.evaluate(() => document.documentElement.dataset['theme']),
    ).toBeUndefined();
    expect(await background(page)).toBe(NIGHT);
  });

  test('Choosing Dark: another page opens dark from its first paint', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const button = page.locator('.theme-btn');
    await button.click();
    await button.click();
    await expect(button).toHaveAttribute('aria-label', /^Theme: Dark/);
    expect(await background(page)).toBe(NIGHT);

    // Without the app's scripts, only the inline script can have set it.
    await withoutAppScripts(page);
    await page.goto('/i/hey-pookie');
    expect(
      await page.evaluate(() => document.documentElement.dataset['theme']),
    ).toBe('dark');
    expect(await background(page)).toBe(NIGHT);
  });
});

test.describe('home', () => {
  test('Privacy footer: every page ends with one, holding only the privacy link', async ({
    page,
  }) => {
    for (const path of ['/', '/i/hey-pookie', '/no-such-page', '/privacy']) {
      await page.goto(path);
      const footer = page.locator('footer');
      await expect(footer, path).toHaveCount(1);
      await expect(footer.getByRole('link'), path).toHaveCount(1);
      await expect(footer.getByRole('link'), path).toHaveAttribute(
        'href',
        '/privacy',
      );
    }
    await expect(page.locator('.socials')).toHaveCount(0);
  });

  test('Social links: the logo and handle on wide screens, the logo alone on phones', async ({
    page,
  }) => {
    await page.goto('/');
    const link = page.locator('.socials a').first();
    await expect(link).toHaveAttribute('aria-label', 'Bluesky: placeholder');
    await expect(link.locator('svg.logo')).toBeVisible();
    await expect(link.locator('.handle')).toBeVisible();

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(link.locator('svg.logo')).toBeVisible();
    await expect(link.locator('.handle')).toBeHidden();
    await expect(link).toHaveAttribute('aria-label', 'Bluesky: placeholder');
  });

  test('Tall comic and transparent sticker: tiles show each piece whole at its shape', async ({
    page,
  }) => {
    await page.goto('/');
    const comic = page.locator('.tile', {
      has: page.locator('a[href="/i/hey-pookie"]'),
    });
    const box = (await comic.boundingBox())!;
    expect(box.height).toBeGreaterThan(box.width);
    const sticker = page.locator('.tile', {
      has: page.locator('a[href="/i/chibi-tigy"]'),
    });
    expect(
      await sticker
        .locator('img')
        .evaluate((img) => getComputedStyle(img).objectFit),
    ).toBe('contain');
    expect(
      await sticker.evaluate((tile) => getComputedStyle(tile).backgroundColor),
    ).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('the server-rendered gallery does not move when the page hydrates', async ({
    page,
    browser,
  }) => {
    const boxes = async (target: Page) =>
      target.locator('.tile').evaluateAll((list) =>
        list.map((tile) => {
          const box = tile.getBoundingClientRect();
          return [box.x, box.y, box.width, box.height].map(Math.round);
        }),
      );
    const serverOnly = await browser.newPage();
    await withoutAppScripts(serverOnly);
    await serverOnly.goto('/');
    const before = await boxes(serverOnly);
    await serverOnly.close();

    await page.goto('/');
    await page.waitForFunction(
      () => '__ngContext__' in (document.querySelector('app-root') ?? {}),
    );
    expect(await boxes(page)).toEqual(before);
  });

  test('Pieces from several years: one run, newest first, with no year headings', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('.gallery h2, .gallery h3')).toHaveCount(0);
    await expect(tiles(page).first()).toHaveAttribute(
      'href',
      '/i/tigy-portrait',
    );
    await expect(tiles(page).last()).toHaveAttribute('href', '/i/happy-tigy');
  });

  test('Pressing a picker: the gallery does not change, and the picker says filters are coming later', async ({
    page,
  }) => {
    await page.goto('/');
    const tags = page.getByRole('button', { name: 'Tags' });
    await expect(tags).toHaveAttribute('aria-disabled', 'true');
    await expect(tags).toHaveAttribute('title', 'Filters are coming later');
    // aria-disabled controls stay pressable, so force past Playwright's enabled check.
    await tags.click({ force: true });
    await expect(page).toHaveURL(/\/$/);
    await expect(tiles(page)).toHaveCount(5);
  });

  test('Filtered gallery: the timeline marks only the matching years', async ({
    page,
  }) => {
    await page.goto('/?character=placeholder-character');
    await expect(page.locator('app-tail-timeline .year')).toHaveText(['2026']);
  });

  test('Phone: a progress bar along the bottom fills as the page scrolls', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const bar = page.locator('.phone-tail');
    await expect(bar).toBeVisible();
    await expect(page.locator('app-tail-timeline .timeline')).toBeHidden();
    const before = (await bar.boundingBox())!.width;
    await page.mouse.wheel(0, 2000);
    await expect
      .poll(async () => (await bar.boundingBox())!.width)
      .toBeGreaterThan(before);
  });
});

test.describe('with three pages of art', () => {
  test.beforeAll(() => addImages(bulkPieces(60)));
  test.afterAll(() => seed());

  async function loadAll(page: Page, path: string, count: number) {
    await page.goto(path);
    while ((await tiles(page).count()) < count) {
      const before = await tiles(page).count();
      await page.locator('.sentinel').scrollIntoViewIfNeeded();
      await expect.poll(() => tiles(page).count()).toBeGreaterThan(before);
    }
  }

  test('loading as the visitor scrolls skips and repeats no piece', async ({
    page,
  }) => {
    await loadAll(page, '/?tag=bulk', 60);
    const hrefs = await tiles(page).evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')),
    );
    expect(hrefs).toEqual(
      Array.from(
        { length: 60 },
        (_, i) => `/i/bulk-${String(60 - i).padStart(2, '0')}`,
      ),
    );
    await expect(page.getByText("That's every piece.")).toBeVisible();
  });

  test('Back from a piece: the gallery shows the loaded pages, scrolled where the visitor left it', async ({
    page,
  }) => {
    await loadAll(page, '/?tag=bulk', 60);
    const piece = tiles(page).nth(55);
    await piece.scrollIntoViewIfNeeded();
    const scrolled = await page.evaluate(() => window.scrollY);
    await piece.click();
    await expect(page).toHaveURL(/\/i\/bulk-05$/);

    await page.goBack();
    await expect(tiles(page)).toHaveCount(60);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeCloseTo(scrolled, -2);

    // The page's own back control does the same, also after moving to the next piece.
    await tiles(page).nth(55).click();
    await page.locator('.nav.next').click();
    await page.getByRole('link', { name: 'Back to the gallery' }).click();
    await expect(page).toHaveURL(/\/\?tag=bulk$/);
    await expect(tiles(page)).toHaveCount(60);
  });

  test('Reloading the gallery: it opens from its first piece', async ({
    page,
  }) => {
    await loadAll(page, '/?tag=bulk', 48);
    await page.reload();
    await expect(tiles(page)).toHaveCount(24);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('Dragging the timeline: choosing 2025 loads pages until its pieces are shown', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(tiles(page)).toHaveCount(24);
    const mark = page.locator('app-tail-timeline .year', { hasText: '2025' });
    const box = (await mark.boundingBox())!;
    const timeline = (await page
      .locator('app-tail-timeline .timeline')
      .boundingBox())!;
    await page.mouse.click(
      timeline.x + timeline.width - 14,
      box.y + box.height / 2 + 2,
    );
    const chibi = page.locator('.tile a[href="/i/chibi-tigy"]');
    await expect(chibi).toBeInViewport();
  });
});

test.describe('artwork page', () => {
  test('Arrow key and First piece: the right arrow opens the next piece; the newest has no previous', async ({
    page,
  }) => {
    await page.goto('/i/tigy-portrait');
    await expect(page.locator('.piece img')).toBeVisible();
    await expect(page.locator('.nav.prev')).toHaveCount(0);
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/\/i\/ref-sheet$/);
  });

  test('Escape returns to the gallery', async ({ page }) => {
    await page.goto('/?tag=comic');
    await tiles(page).first().click();
    await expect(page.locator('.piece img')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/\?tag=comic$/);
  });

  test('Swipe on a phone: swiping left opens the next piece', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/i/tigy-portrait');
    await expect(page.locator('.piece img')).toBeVisible();
    await page.locator('.stage').evaluate((stage) => {
      const touch = (x: number) =>
        new Touch({ identifier: 1, target: stage, clientX: x, clientY: 300 });
      stage.dispatchEvent(
        new TouchEvent('touchstart', { touches: [touch(300)], bubbles: true }),
      );
      stage.dispatchEvent(
        new TouchEvent('touchend', {
          changedTouches: [touch(120)],
          bubbles: true,
        }),
      );
    });
    await expect(page).toHaveURL(/\/i\/ref-sheet$/);
  });

  test('Piece with only an image: "Untitled" and the day it was added', async ({
    page,
  }) => {
    await page.goto('/i/chibi-tigy');
    await expect(page.locator('app-credits-panel h1')).toHaveText('Untitled');
    await expect(page.locator('.date')).toHaveText('Added 20 Nov 2025');
    await expect(page.locator('.credits')).toHaveCount(0);
  });

  test('Credits panel: beside the piece on wide screens, closed and reopened, and a closed panel is remembered', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/i/hey-pookie');
    const panel = page.locator('.info-wrap');
    await expect(panel).toBeVisible();
    await page.getByRole('button', { name: 'Close credits' }).click();
    await expect(panel).toBeHidden();
    await page.getByRole('button', { name: 'Credits and info' }).click();
    await expect(panel).toBeVisible();

    await page.getByRole('button', { name: 'Close credits' }).click();
    await withoutAppScripts(page);
    await page.goto('/i/ref-sheet');
    expect(
      await page.evaluate(() => document.documentElement.dataset['credits']),
    ).toBe('closed');
    await expect(panel).toBeHidden();
  });

  test('Desktop without a share sheet: Share copies the address and confirms', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { value: undefined });
    });
    await page.goto('/i/hey-pookie');
    await page
      .locator('app-credits-panel')
      .getByRole('button', { name: 'Share' })
      .click();
    await expect(page.locator('.toast')).toHaveText('Link copied!');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      `${baseURL}/i/hey-pookie`,
    );
  });
});

test.describe('full view', () => {
  test('Opening before the original arrives, then zooming into a reference sheet', async ({
    page,
  }) => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route('**/img/ref-sheet/original.png', async (route) => {
      await held;
      await route.continue();
    });
    await page.goto('/i/ref-sheet');
    await page.locator('.piece').click();
    const image = page.locator('app-full-view img');
    await expect(image).toHaveAttribute('src', '/img/ref-sheet/full.webp');

    release();
    await expect(image).toHaveAttribute('src', '/img/ref-sheet/original.png');
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await expect(page.locator('app-full-view .zoom')).toHaveText('150%');
    const before = await image.evaluate((img) => img.style.transform);
    const box = (await page.locator('app-full-view .stage').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 120,
      box.y + box.height / 2 + 60,
    );
    await page.mouse.up();
    expect(await image.evaluate((img) => img.style.transform)).not.toBe(before);
  });

  test('Closing: Escape closes the full view and stays on the piece', async ({
    page,
  }) => {
    await page.goto('/i/ref-sheet');
    await page
      .getByRole('button', { name: 'Full view', exact: true })
      .first()
      .click();
    await expect(
      page.getByRole('dialog', { name: /^Full view/ }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('app-full-view')).toHaveCount(0);
    await expect(page).toHaveURL(/\/i\/ref-sheet$/);
  });

  test('Closing with the button: focus returns to what opened the full view, and the page scrolls again', async ({
    page,
  }) => {
    await page.goto('/i/ref-sheet');
    const piece = page.getByRole('button', {
      name: 'Full view of Tigy reference sheet',
    });
    await piece.click();
    const close = page.getByRole('button', { name: 'Close full view' });
    await expect(close).toBeFocused();
    await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');

    await close.click();
    await expect(page.locator('app-full-view')).toHaveCount(0);
    await expect(piece).toBeFocused();
    await expect(page.locator('html')).not.toHaveCSS('overflow-y', 'hidden');
  });
});
