import { expect, test } from '@playwright/test';

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
  await expect(page.locator('.download')).toBeVisible();
  await expect(page.locator('.nav.prev')).toHaveAttribute(
    'href',
    '/i/ref-sheet',
  );
  await expect(page.locator('.nav.next')).toHaveAttribute('href', '/i/chibi-tigy');
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
  await expect(page.locator('.chip.is-active')).toHaveText([
    'Artist: Artist name (placeholder)',
  ]);
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
  await expect(page.locator('.chip.is-active')).toHaveText([
    'Character: Character name (placeholder)',
  ]);
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
