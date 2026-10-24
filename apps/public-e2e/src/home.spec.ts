import { expect, test, type Page } from '@playwright/test';
import {
  addImages,
  bulkPieces,
  db,
  rebuildSummaries,
  seed,
} from './support/emulators';

const tiles = (page: Page) => page.locator('.gallery .tile a');

test.describe('with 30 more pieces', () => {
  test.beforeAll(() => addImages(bulkPieces(30)));
  test.afterAll(() => seed());

  test('Visitor opens the home page: the first HTML has the header and the 24 newest SFW pieces', async ({
    page,
  }) => {
    const response = await page.goto('/');
    const html = (await response?.text()) ?? '';
    expect(html).toContain('<h1');
    expect(html).toContain('Tigy');
    expect(html).toContain('35 pieces · Jan 2025 – May 2026');
    const links = [
      ...html.matchAll(/class="tile[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"/g),
    ].map((m) => m[1]);
    expect(links).toHaveLength(24);
    expect(links[0]).toBe('/i/bulk-30');
    expect(links[23]).toBe('/i/bulk-07');
    expect(html).not.toContain('nsfw-test');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tigy');
    await expect(page.locator('.socials a')).toHaveCount(4);
    await expect(tiles(page)).toHaveCount(24);
  });

  test('Loading more: scrolling near the end shows the remaining 6 pieces below the first 24, and the end is reached', async ({
    page,
  }) => {
    await page.goto('/?tag=bulk');
    await expect(tiles(page)).toHaveCount(24);
    await expect(page.locator('.end')).toHaveCount(0);

    await page.locator('.sentinel').scrollIntoViewIfNeeded();
    await expect(tiles(page)).toHaveCount(30);
    await expect(tiles(page).nth(24)).toHaveAttribute('href', '/i/bulk-06');
    await expect(tiles(page).last()).toHaveAttribute('href', '/i/bulk-01');
    await expect(page.getByText("That's every piece.")).toBeVisible();
  });

  test('The address stays shareable: it carries only the filters and sort, and opens from the first piece', async ({
    page,
  }) => {
    await page.goto('/?tag=bulk&sort=oldest');
    await page.locator('.sentinel').scrollIntoViewIfNeeded();
    await expect(tiles(page)).toHaveCount(30);
    expect(page.url()).toMatch(/\/\?tag=bulk&sort=oldest$/);

    await page.goto(page.url());
    await expect(tiles(page)).toHaveCount(24);
    await expect(tiles(page).first()).toHaveAttribute('href', '/i/bulk-01');
  });

  test('Picking with the filter row stuck: the dropdown stays under its chip and the new result shows from its first piece', async ({
    page,
  }) => {
    await page.goto('/?sort=oldest');
    await page.mouse.wheel(0, 3000);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1000);
    const tags = page.getByRole('button', { name: 'Tags' });
    await tags.click();
    const picker = page.getByRole('dialog', { name: 'Tags' });
    await picker.getByRole('link', { name: 'bulk, 30 pieces' }).click();

    await expect(page).toHaveURL(/\/\?tag=bulk&sort=oldest$/);
    await expect(tiles(page).first()).toHaveAttribute('href', '/i/bulk-01');
    await expect(tiles(page).first()).toBeInViewport();
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
    await expect(picker).toBeVisible();
    const chip = (await tags.boundingBox())!;
    const panel = (await picker.locator('.panel').boundingBox())!;
    expect(panel.y).toBeGreaterThanOrEqual(chip.y + chip.height);
    expect(panel.y).toBeLessThan(chip.y + chip.height + 20);
  });
});

test.describe('with a tag only on an NSFW piece', () => {
  test.beforeAll(() =>
    addImages([
      { id: 'nsfw-only-tag', fields: { nsfw: true, tags: ['after dark'] } },
    ]),
  );
  test.afterAll(() => seed());

  test('Tag used only on NSFW pieces: offered only with the switch on', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Tags' }).click();
    const picker = page.getByRole('dialog', { name: 'Tags' });
    await expect(picker.locator('.choice').first()).toBeVisible();
    await expect(picker.getByText('after dark')).toHaveCount(0);

    await page.addInitScript(() => {
      localStorage.setItem('tigy.nsfw.age', '1');
      localStorage.setItem('tigy.nsfw', '1');
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Tags' }).click();
    await expect(
      picker.getByRole('link', { name: 'after dark, 1 piece' }),
    ).toBeVisible();
  });
});

test.describe('without art', () => {
  test.beforeAll(async () => {
    const images = await db.collection('images').get();
    await Promise.all(images.docs.map((doc) => doc.ref.delete()));
    await rebuildSummaries();
  });
  test.afterAll(() => seed());

  test('No art yet: the header has no count or date range, and the gallery says so', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('.empty')).toHaveText('No art yet.');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tigy');
    await expect(page.locator('.overview')).toHaveCount(0);
  });
});

test.describe('filters', () => {
  test('Shared filtered link: the first HTML lists the oldest matching pieces and shows which pickers are active and the sort', async ({
    page,
  }) => {
    const response = await page.goto('/?character=tigy&tag=comic&sort=oldest');
    const html = (await response?.text()) ?? '';
    expect(html).toContain('aria-label="Characters, 1 selected"');
    expect(html).toContain('aria-label="Tags, 1 selected"');
    expect(html).toContain('Sort: Oldest first.');
    expect(html).toContain('href="/i/hey-pookie"');
    expect(html).not.toContain('nsfw-test');

    await expect(tiles(page)).toHaveCount(1);
  });

  test('Removing a filter: unpicking it shows the pieces matching the rest, from the first piece', async ({
    page,
  }) => {
    await page.goto('/?character=tigy&tag=comic&sort=oldest');
    await page.getByRole('button', { name: 'Tags' }).click();
    await page.getByRole('link', { name: 'comic, 1 piece, selected' }).click();
    await expect(page).toHaveURL(/\/\?character=tigy&sort=oldest$/);
    // chibi-tigy credits nobody.
    await expect(tiles(page)).toHaveCount(4);
    await expect(tiles(page).first()).toHaveAttribute('href', '/i/happy-tigy');
    await expect(page.locator('.pickers .chip.is-active')).toHaveAttribute(
      'aria-label',
      'Characters, 1 selected',
    );
  });

  test('Unknown person: lists the filter as "Unknown person" to unpick, says nothing matches and offers to clear', async ({
    page,
  }) => {
    await page.goto('/?artist=nobody&sort=oldest');
    await page.getByRole('button', { name: 'Artists, 1 selected' }).click();
    await expect(
      page.getByRole('link', { name: 'Unknown person, 0 pieces, selected' }),
    ).toHaveAttribute('href', '/?sort=oldest');
    await page.keyboard.press('Escape');
    await expect(
      page.getByText('Nothing matches these filters.'),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Clear the filters' }).click();
    await expect(page).toHaveURL(/\/\?sort=oldest$/);
    await expect(tiles(page)).toHaveCount(5);
  });

  test('No matches: the gallery says nothing matches and offers to clear the filters', async ({
    page,
  }) => {
    await page.goto('/?tag=no-such-tag');
    await expect(
      page.getByText('Nothing matches these filters.'),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Clear the filters' }),
    ).toHaveAttribute('href', '/');
  });

  test('Picking a tag: applies it at once, and the picker stays open with the tag selected', async ({
    page,
  }) => {
    await page.goto('/');
    const tags = page.getByRole('button', { name: 'Tags' });
    await tags.click();
    const picker = page.getByRole('dialog', { name: 'Tags' });
    const names = picker.locator('.choice .name');
    const comic = picker.getByRole('link', { name: 'comic, 1 piece' });
    await expect(comic).toBeVisible();
    const before = await names.allTextContents();
    const chipBefore = (await tags.boundingBox())!;
    await comic.click();

    await expect(page).toHaveURL(/\/\?tag=comic$/);
    await expect(tiles(page)).toHaveCount(1);
    await expect(page.locator('.pickers .chip.is-active')).toHaveAttribute(
      'aria-label',
      'Tags, 1 selected',
    );
    await expect(picker).toBeVisible();
    await expect(
      picker.getByRole('link', { name: 'comic, 1 piece, selected' }),
    ).toBeFocused();

    // Steady list: nothing moved, and tags no longer matching stay in place, unavailable.
    expect(await names.allTextContents()).toEqual(before);
    expect((await tags.boundingBox())!.x).toBe(chipBefore.x);
    await expect(
      picker.locator('.choice[aria-disabled="true"] .name'),
    ).toContainText(['animated', 'bust']);
    await expect(
      picker.getByRole('link', { name: 'couple, 1 piece' }),
    ).toBeVisible();
  });

  test('Picking a second character: lists only pieces with both', async ({
    page,
  }) => {
    await page.goto('/?character=tigy');
    await page.getByRole('button', { name: 'Characters' }).click();
    await page
      .getByRole('dialog', { name: 'Characters' })
      .getByRole('link', { name: 'Character name (placeholder), 1 piece' })
      .click();
    await expect(page).toHaveURL(
      /\/\?character=tigy&character=placeholder-character$/,
    );
    await expect(tiles(page)).toHaveCount(1);
    await expect(tiles(page).first()).toHaveAttribute('href', '/i/hey-pookie');
  });

  test('Unpicking a choice: removes its filter', async ({ page }) => {
    await page.goto('/?tag=comic');
    await page.getByRole('button', { name: 'Tags' }).click();
    const picker = page.getByRole('dialog', { name: 'Tags' });
    await picker
      .getByRole('link', { name: 'comic, 1 piece, selected' })
      .click();
    await expect(page).toHaveURL(/\/$/);
    await expect(tiles(page)).toHaveCount(5);
    await expect(
      picker.getByRole('link', { name: 'comic, 1 piece' }),
    ).toBeVisible();
  });

  test('Picking a second year: the gallery shows both years', async ({
    page,
  }) => {
    await page.goto('/?year=2025');
    await page.getByRole('button', { name: 'Year' }).click();
    const picker = page.getByRole('dialog', { name: 'Year' });
    await expect(picker.locator('.choice .name')).toHaveText(['2026', '2025']);
    await expect(picker.getByRole('searchbox')).toHaveCount(0);
    await picker.getByRole('link', { name: /^2026,/ }).click();
    await expect(page).toHaveURL(/\/\?year=2026&year=2025$/);
    await expect(page.locator('.pickers .chip.is-active')).toHaveAttribute(
      'aria-label',
      'Year, 2 selected',
    );
    await expect(
      picker.getByRole('link', { name: /, selected$/ }),
    ).toHaveCount(2);
  });

  test('Choices with a filter active: the pickers offer only what the matching pieces carry', async ({
    page,
  }) => {
    await page.goto('/?tag=comic');
    await page.getByRole('button', { name: 'Tags' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Tags' }).locator('.choice .name'),
    ).toHaveText(['comic', 'couple']);
  });

  test('Searching a picker: narrows the list as the visitor types', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Characters' }).click();
    const picker = page.getByRole('dialog', { name: 'Characters' });
    await expect(picker.locator('.choice .name')).toHaveText([
      'Tigy',
      'Character name (placeholder)',
    ]);
    await picker
      .getByRole('searchbox', { name: 'Search characters' })
      .fill('CHARA');
    await expect(picker.locator('.choice .name')).toHaveText([
      'Character name (placeholder)',
    ]);
    await picker.getByRole('searchbox').fill('nobody');
    await expect(picker.getByText('No matches')).toBeVisible();
  });

  test('Closing a picker: Escape closes it and returns focus to its chip', async ({
    page,
  }) => {
    await page.goto('/');
    const artists = page.getByRole('button', { name: 'Artists' });
    await artists.click();
    await expect(page.getByRole('dialog', { name: 'Artists' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(artists).toBeFocused();
    await expect(artists).toHaveAttribute('aria-expanded', 'false');
  });

  test('Picker on a phone: the choices open in a sheet along the bottom edge', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Artists' }).click();
    const panel = page
      .getByRole('dialog', { name: 'Artists' })
      .locator('.panel');
    await expect(panel).toBeVisible();
    // The sheet slides up as it opens.
    await expect
      .poll(async () => {
        const box = (await panel.boundingBox())!;
        return [box.x, box.width, Math.round(box.y + box.height)];
      })
      .toEqual([0, 375, 812]);
  });

  test('Many filters: the pickers count them, nothing is cut off, and "Clear all" removes them', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(
      '/?character=tigy&character=placeholder-character&artist=placeholder-artist&tag=comic&tag=couple&year=2026&sort=oldest',
    );
    await expect(page.locator('.pickers .chip')).toHaveText([
      /Characters\s*· 2/,
      /Artists\s*· 1/,
      /Tags\s*· 2/,
      /Year\s*· 1/,
    ]);
    const row = page.locator('.filters');
    expect(await row.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );

    await page.getByRole('link', { name: 'Clear all' }).click();
    await expect(page).toHaveURL(/\/\?sort=oldest$/);
    await expect(tiles(page)).toHaveCount(5);
    await expect(page.locator('.pickers .chip.is-active')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Clear all' })).toHaveCount(0);
  });

  test('offers newest and oldest first', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.chip.sort')).toHaveText('Newest first');
    await page.locator('.chip.sort').click();
    await expect(page).toHaveURL(/\/\?sort=oldest$/);
    await expect(tiles(page).first()).toHaveAttribute('href', '/i/happy-tigy');
  });
});
