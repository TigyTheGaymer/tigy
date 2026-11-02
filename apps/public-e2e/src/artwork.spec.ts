import { expect, test, type Page } from '@playwright/test';

async function hold(page: Page, path: string): Promise<() => void> {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route(`**${path}`, async (route) => {
    await gate;
    await route.continue();
  });
  return () => release();
}

async function openHydrated(page: Page, path: string): Promise<void> {
  await page.goto(path);
  // A click before hydration is replayed after it, so the toggle flips only once the page is live.
  const credits = page.getByRole('button', { name: 'Credits and info' });
  await credits.click();
  await expect(credits).toHaveAttribute('aria-pressed', 'false');
  await credits.click();
  await expect(credits).toHaveAttribute('aria-pressed', 'true');
}

const stageSkeleton = (page: Page) => page.locator('.stage > app-skeleton');
const creditsSkeleton = (page: Page) =>
  page.locator('app-credits-panel app-skeleton');
const heading = (page: Page) => page.getByRole('heading', { level: 1 });

test.describe('moving between pieces', () => {
  test('Moving to the next piece: the page stays in place until the new data arrives', async ({
    page,
  }) => {
    await openHydrated(page, '/i/hey-pookie');
    const release = await hold(page, '/api/artworks/chibi-tigy');
    await page.evaluate(() => {
      for (const selector of ['.info-wrap', '[aria-label="Share"]', 'img']) {
        document.querySelector(selector)?.setAttribute('data-kept', '');
      }
    });

    await page.locator('.nav.next').click();
    await expect(page).toHaveURL(/\/i\/chibi-tigy$/);
    await expect(page.locator('.piece img')).toHaveAttribute(
      'src',
      '/img/hey-pookie/full.webp',
    );
    await expect(heading(page)).toHaveText('Hey Pookie!');
    await expect(page.locator('.nav.next')).toBeVisible();

    release();
    await expect(heading(page)).toHaveText('Untitled');
    await expect(page.locator('.piece img')).toHaveAttribute(
      'src',
      '/img/chibi-tigy/full.webp',
    );
    await expect(page.locator('.info-wrap[data-kept]')).toHaveCount(1);
    await expect(page.locator('[aria-label="Share"][data-kept]')).toHaveCount(
      1,
    );
  });

  test('Keyboard focus stays on the arrow', async ({ page }) => {
    await openHydrated(page, '/i/ref-sheet');
    const release = await hold(page, '/api/artworks/hey-pookie');
    await page.locator('.nav.next').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/i\/hey-pookie$/);
    await expect(page.locator('.nav.next')).toBeFocused();

    release();
    await expect(heading(page)).toHaveText('Hey Pookie!');
    await expect(page.locator('.nav.next')).toBeFocused();
  });

  test('Move at normal speed: the page shows no skeleton', async ({ page }) => {
    await openHydrated(page, '/i/hey-pookie');
    const api = await page.request.get('/api/artworks/chibi-tigy');
    const image = await page.request.get('/img/chibi-tigy/full.webp');
    await page.route('**/api/artworks/chibi-tigy', (route) =>
      route.fulfill({ response: api }),
    );
    await page.route('**/img/chibi-tigy/full.webp', (route) =>
      route.fulfill({ response: image }),
    );

    const opacities = await page.evaluate(async () => {
      const seen: string[] = [];
      const sample = () =>
        document
          .querySelectorAll('app-skeleton')
          .forEach((skeleton) => seen.push(getComputedStyle(skeleton).opacity));
      const observer = new MutationObserver(sample);
      observer.observe(document.body, { childList: true, subtree: true });
      document.querySelector<HTMLElement>('.nav.next')!.click();
      while (document.querySelector('h1')?.textContent?.trim() !== 'Untitled') {
        await new Promise((resolve) => setTimeout(resolve, 5));
        sample();
      }
      observer.disconnect();
      return seen;
    });

    expect(opacities.filter((opacity) => opacity !== '0')).toEqual([]);
    await expect(page.locator('app-skeleton')).toHaveCount(0);
  });

  test('Slow move: skeletons appear only after the delay, with the arrows and stage bar in place', async ({
    page,
  }) => {
    await openHydrated(page, '/i/hey-pookie');
    const release = await hold(page, '/api/artworks/chibi-tigy');

    const early = await page.evaluate(
      () =>
        new Promise<string>((resolve) => {
          const observer = new MutationObserver(() => {
            const skeleton = document.querySelector('.stage > app-skeleton');
            if (!skeleton) return;
            observer.disconnect();
            resolve(getComputedStyle(skeleton).opacity);
          });
          observer.observe(document.body, { childList: true, subtree: true });
          document.querySelector<HTMLElement>('.nav.next')!.click();
        }),
    );
    expect(early).toBe('0');

    await expect(stageSkeleton(page)).toHaveCSS('opacity', '1');
    await expect(creditsSkeleton(page)).toHaveCSS('opacity', '1');
    // Past the bottom of the held Share button, whose shadow would show otherwise.
    const over = (await creditsSkeleton(page).boundingBox())!;
    const share = (await page.locator('.actions .pad').first().boundingBox())!;
    expect(over.y + over.height).toBeGreaterThanOrEqual(
      share.y + share.height + 3,
    );
    await expect(page.locator('.nav.next')).toBeVisible();
    await expect(page.locator('[aria-label="Share"]')).toBeVisible();

    release();
    await expect(heading(page)).toHaveText('Untitled');
    await expect(page.locator('app-skeleton')).toHaveCount(0);
  });

  test('Slow image: the details show the new piece and only the stage shows a skeleton', async ({
    page,
  }) => {
    await openHydrated(page, '/i/hey-pookie');
    const release = await hold(page, '/img/chibi-tigy/full.webp');
    await page.locator('.nav.next').click();

    await expect(heading(page)).toHaveText('Untitled');
    await expect(creditsSkeleton(page)).toHaveCount(0);
    await expect(stageSkeleton(page)).toHaveCSS('opacity', '1');

    release();
    await expect(stageSkeleton(page)).toHaveCount(0);
  });

  test('Reduced motion: the skeleton does not animate', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHydrated(page, '/i/hey-pookie');
    const release = await hold(page, '/api/artworks/chibi-tigy');
    await page.locator('.nav.next').click();

    await expect(stageSkeleton(page)).toHaveCSS('opacity', '1');
    await expect(stageSkeleton(page).locator('.bar')).toHaveCSS(
      'animation-name',
      'none',
    );
    release();
  });

  test('The Show NSFW switch stays put on an image, a video and behind the confirm screen', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const left = async (path: string) => {
      await page.goto(path);
      return (await page.locator('app-nsfw-switch').boundingBox())!.x;
    };
    const image = await left('/i/hey-pookie');
    expect(await left('/i/happy-tigy-loop')).toBe(image);
    expect(await left('/i/hey-pookie-nsfw-test')).toBe(image);
  });

  test('On a phone: every control fits, on an image, a video and behind the confirm screen', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const path of [
      '/i/hey-pookie',
      '/i/happy-tigy-loop',
      '/i/hey-pookie-nsfw-test',
    ]) {
      await page.goto(path);
      const box = await page
        .locator('[aria-label="Download original"]')
        .boundingBox();
      expect(box!.x + box!.width, path).toBeLessThanOrEqual(375);
    }
  });

  test('Moving to an NSFW piece with the switch off: no file of it is requested', async ({
    page,
  }) => {
    const NSFW = 'hey-pookie-nsfw-test';
    const files: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes(`/img/${NSFW}/`)) files.push(request.url());
    });
    await page.route('**/api/artworks/hey-pookie', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        json: { ...(await response.json()), next: { id: NSFW } },
      });
    });
    await openHydrated(page, '/i/ref-sheet');
    await page.locator('.nav.next').click();
    await expect(heading(page)).toHaveText('Hey Pookie!');

    await page.locator('.nav.next').click();
    await expect(page.locator('.confirm')).toBeVisible();
    await expect(page.locator('.piece img')).toHaveCount(0);
    expect(files).toEqual([]);
  });

  test('an old image keeps its shape while a new one of a different shape loads', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openHydrated(page, '/i/ref-sheet');
    const image = page.locator('.piece img');
    const ratio = async () => {
      const box = (await image.boundingBox())!;
      return box.width / box.height;
    };
    await expect
      .poll(() => image.evaluate((i: HTMLImageElement) => i.complete))
      .toBe(true);
    const before = await ratio();
    const release = await hold(page, '/img/hey-pookie/full.webp');

    await page.locator('.nav.next').click();
    await expect(heading(page)).toHaveText('Hey Pookie!');
    expect(await ratio()).toBeCloseTo(before, 1);

    release();
    await expect(stageSkeleton(page)).toHaveCount(0);
    expect(await ratio()).toBeCloseTo(1620 / 2117, 1);
  });
});

test('Direct link: the first HTML holds the finished page, and hydrating adds no skeleton', async ({
  page,
  request,
}) => {
  const html = await (await request.get('/i/hey-pookie')).text();
  expect(html).not.toContain('<app-skeleton');
  expect(html).toContain('/img/hey-pookie/full.webp');

  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await openHydrated(page, '/i/hey-pookie');
  await expect(page.locator('.piece img')).toBeVisible();
  await expect(page.locator('app-skeleton')).toHaveCount(0);
  await expect(page.locator('.stage')).not.toHaveAttribute('aria-busy', 'true');
  expect(errors).toEqual([]);
});

test('Piece with every field: shows the image, details, credits, tags, file, neighbours and the link back', async ({
  page,
}) => {
  await page.goto('/i/hey-pookie');
  await expect(page.locator('.piece img')).toHaveAttribute(
    'src',
    '/img/hey-pookie/full.webp',
  );
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Hey Pookie!',
  );
  await expect(page.locator('.desc')).toHaveText('A three-panel comic.');
  await expect(page.locator('.date')).toHaveText('14 Feb 2026');
  await expect(page.locator('.artists .name')).toHaveText([
    'Artist name (placeholder)',
  ]);
  await expect(page.locator('.characters .name')).toHaveText([
    'Tigy',
    'Character name (placeholder)',
  ]);
  await expect(page.locator('.tags a')).toHaveText(['#comic', '#couple']);
  await expect(page.locator('.file')).toContainText('PNG · 1620 × 2117 px');
  await expect(
    page.getByRole('link', { name: 'Download original' }),
  ).toBeVisible();
  await expect(page.locator('.nav.prev')).toHaveAttribute(
    'href',
    '/i/ref-sheet',
  );
  await expect(page.locator('.nav.next')).toHaveAttribute(
    'href',
    '/i/chibi-tigy',
  );
  await expect(
    page.getByRole('link', { name: 'Back to the gallery' }),
  ).toBeVisible();
});

test("Following an artist's credit: opens the gallery filtered by that artist", async ({
  page,
}) => {
  await page.goto('/i/hey-pookie');
  await page.getByRole('link', { name: 'Artist name (placeholder)' }).click();
  await expect(page).toHaveURL(/\/\?artist=placeholder-artist$/);
  await expect(page.locator('.pickers .chip.is-active')).toHaveAttribute(
    'aria-label',
    'Artists, 1 selected',
  );
  await page.getByRole('button', { name: 'Artists' }).click();
  await expect(
    page.getByRole('link', {
      name: /^Artist name \(placeholder\), \d+ pieces?, selected$/,
    }),
  ).toBeVisible();
});

test('following a tag opens the gallery filtered by it', async ({ page }) => {
  await page.goto('/i/hey-pookie');
  await page.locator('.tags').getByRole('link', { name: 'comic' }).click();
  await expect(page).toHaveURL(/\/\?tag=comic$/);
  await expect(page.locator('.gallery .tile a')).toHaveCount(1);
});

test('Year only: the page shows "2019"-style years, and the year filter includes the piece', async ({
  page,
}) => {
  await page.goto('/i/happy-tigy');
  await expect(page.locator('.date')).toHaveText('2025');
  await page.goto('/?year=2025');
  await expect(page.locator('.gallery .tile a').first()).toHaveAttribute(
    'href',
    '/i/chibi-tigy',
  );
  await expect(
    page.locator('.gallery .tile a[href="/i/happy-tigy"]'),
  ).toHaveCount(1);
});

test('Piece without credits: shows neither an artists nor a characters section', async ({
  page,
}) => {
  await page.goto('/i/chibi-tigy');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Untitled');
  await expect(page.locator('.piece img')).toBeVisible();
  await expect(page.locator('.credits')).toHaveCount(0);
});

test('Tigy credited as a character: the credit links home and shows no social links', async ({
  page,
}) => {
  await page.goto('/i/happy-tigy');
  const credit = page.locator('.characters .person').first();
  await expect(credit.getByRole('link', { name: 'Tigy' })).toHaveAttribute(
    'href',
    '/',
  );
  await expect(credit.locator('.links')).toHaveCount(0);
});

test('Back to a filtered gallery: returns to the gallery with its filter, also after next', async ({
  page,
}) => {
  await page.goto('/?character=placeholder-character');
  await page.locator('.gallery .tile a').first().click();
  await expect(page).toHaveURL(/\/i\/hey-pookie$/);
  await page.locator('.nav.next').click();
  await expect(page).toHaveURL(/\/i\/chibi-tigy$/);
  await page.getByRole('link', { name: 'Back to the gallery' }).click();
  await expect(page).toHaveURL(/\/\?character=placeholder-character$/);
  await expect(page.locator('.pickers .chip.is-active')).toHaveAttribute(
    'aria-label',
    'Characters, 1 selected',
  );
});

test('Arriving from a shared link: the link back opens the home page', async ({
  page,
}) => {
  await page.goto('/i/hey-pookie');
  const back = page.getByRole('link', { name: 'Back to the gallery' });
  await expect(back).toHaveAttribute('href', '/');
  await back.click();
  await expect(page).toHaveURL(/\/$/);
});

test.describe('link previews', () => {
  const meta = (html: string, key: string) =>
    new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`).exec(
      html,
    )?.[1];

  test('Default link to an NSFW piece: the preview carries its title and full image', async ({
    request,
    baseURL,
  }) => {
    const html = await (await request.get('/i/hey-pookie-nsfw-test')).text();
    expect(meta(html, 'og:title')).toBe('Hey Pookie! (NSFW for testing)');
    expect(meta(html, 'og:image')).toBe(
      `${baseURL}/img/hey-pookie-nsfw-test/full.webp`,
    );
    expect(meta(html, 'twitter:card')).toBe('summary_large_image');
    expect(meta(html, 'robots')).toBe('noindex');
  });

  test('Safe link to an NSFW piece: the preview carries only the site card', async ({
    request,
    baseURL,
  }) => {
    const html = await (
      await request.get('/i/hey-pookie-nsfw-test?safe')
    ).text();
    const head = html.slice(0, html.indexOf('</head>'));
    expect(meta(head, 'og:title')).toBe('Tigy');
    expect(meta(head, 'og:description')).toBe('Tigy');
    expect(meta(head, 'og:image')).toBe(`${baseURL}/avatars/tigy.webp`);
    expect(meta(head, 'twitter:card')).toBe('summary');
    expect(meta(head, 'robots')).toBe('noindex');
    expect(head).not.toContain('Hey Pookie');
    expect(head).not.toContain('/img/');
  });

  test('the home page carries the site card', async ({ request }) => {
    const html = await (await request.get('/')).text();
    expect(meta(html, 'og:title')).toBe('Tigy');
    expect(meta(html, 'twitter:card')).toBe('summary');
  });

  test('previews use the public address the proxy names, as on App Hosting', async ({
    request,
  }) => {
    // Unlike the address the server is reached on, which has a port.
    const headers = {
      'X-Forwarded-Host': 'localhost',
      'X-Forwarded-Proto': 'https',
    };
    for (const [path, image] of [
      ['/', '/avatars/tigy.webp'],
      ['/i/hey-pookie', '/img/hey-pookie/full.webp'],
    ]) {
      const html = await (await request.get(path, { headers })).text();
      expect(meta(html, 'og:image'), path).toBe(`https://localhost${image}`);
    }
  });

  test('Title of an NSFW piece: the tab says "Tigy"', async ({ page }) => {
    await page.goto('/i/hey-pookie-nsfw-test');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Hey Pookie! (NSFW for testing)',
    );
    await expect(page).toHaveTitle('Tigy');
  });

  test('Safe link of an NSFW piece: the artwork page copies it and confirms', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/i/hey-pookie-nsfw-test');
    await page.getByRole('button', { name: 'Copy safe link' }).click();
    await expect(page.locator('.toast')).toHaveText('Safe link copied!');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      `${baseURL}/i/hey-pookie-nsfw-test?safe`,
    );
  });
});
