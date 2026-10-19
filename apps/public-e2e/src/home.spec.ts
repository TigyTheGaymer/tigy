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
    const links = [...html.matchAll(/class="tile[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"/g)].map(
      (m) => m[1],
    );
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
  test('Shared filtered link: the first HTML lists the oldest matching pieces and names the filters and sort', async ({
    page,
  }) => {
    const response = await page.goto('/?character=tigy&tag=comic&sort=oldest');
    const html = (await response?.text()) ?? '';
    expect(html).toContain('Character: Tigy');
    expect(html).toContain('Tag: comic');
    expect(html).toContain('Sort: Oldest first.');
    expect(html).toContain('href="/i/hey-pookie"');
    expect(html).not.toContain('nsfw-test');

    await expect(tiles(page)).toHaveCount(1);
  });

  test('Removing a filter: shows the pieces matching the rest, from the first piece', async ({
    page,
  }) => {
    await page.goto('/?character=tigy&tag=comic&sort=oldest');
    await page.getByRole('link', { name: 'Remove filter Tag: comic' }).click();
    await expect(page).toHaveURL(/\/\?character=tigy&sort=oldest$/);
    // chibi-tigy credits nobody.
    await expect(tiles(page)).toHaveCount(4);
    await expect(tiles(page).first()).toHaveAttribute('href', '/i/happy-tigy');
    await expect(page.locator('.chip.is-active')).toHaveText([
      'Character: Tigy',
    ]);
  });

  test('Unknown person: names the filter "Unknown person", says nothing matches and offers to clear', async ({
    page,
  }) => {
    await page.goto('/?artist=nobody&sort=oldest');
    await expect(page.locator('.chip.is-active')).toHaveText([
      'Artist: Unknown person',
    ]);
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

  test('offers newest and oldest first', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.chip.sort')).toHaveText('Newest first');
    await page.locator('.chip.sort').click();
    await expect(page).toHaveURL(/\/\?sort=oldest$/);
    await expect(tiles(page).first()).toHaveAttribute('href', '/i/happy-tigy');
  });
});
