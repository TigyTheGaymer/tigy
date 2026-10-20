import { expect, test, type Page } from '@playwright/test';

const NSFW = 'hey-pookie-nsfw-test';
const toggle = (page: Page) => page.getByRole('switch', { name: 'Show NSFW' });
const tiles = (page: Page) => page.locator('.gallery .tile a');

test('Switch off: no NSFW piece, title or link is in the page or its source, and the count leaves it out', async ({
  page,
}) => {
  const response = await page.goto('/');
  const html = (await response?.text()) ?? '';
  expect(html).not.toContain(NSFW);
  expect(html).not.toContain('NSFW for testing');
  await expect(toggle(page)).not.toBeChecked();
  await expect(page.locator('.overview')).toHaveText(
    '5 pieces · Jan 2025 – Apr 2026',
  );
  await expect(tiles(page)).toHaveCount(5);
});

test('Turning the switch on: the gallery reloads with NSFW pieces in date order, and the choice holds', async ({
  page,
}) => {
  await page.goto('/');
  await expect(tiles(page)).toHaveCount(5);
  await toggle(page).check();
  await expect(tiles(page)).toHaveCount(6);
  await expect(tiles(page).nth(2)).toHaveAttribute('href', `/i/${NSFW}`);
  await expect(page.locator('.overview')).toHaveText(
    '6 pieces · Jan 2025 – Apr 2026',
  );

  await page.reload();
  await expect(toggle(page)).toBeChecked();
  await expect(tiles(page)).toHaveCount(6);
});

test('Switch already on: the SFW gallery shows at once and is replaced by the NSFW-inclusive one', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('tigy.nsfw', '1'));
  const response = await page.goto('/');
  // The first HTML is always the switch-off view.
  expect(await response?.text()).not.toContain(NSFW);
  await expect(page.locator(`.tile a[href="/i/${NSFW}"]`)).toHaveCount(1);
  await expect(toggle(page)).toBeChecked();
});

test.describe('the confirm screen', () => {
  test('Opening an NSFW link with the switch off: the confirm screen shows and the image is not loaded', async ({
    page,
  }) => {
    const images: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes(`/img/${NSFW}/`)) images.push(request.url());
    });
    await page.goto(`/i/${NSFW}`);
    await expect(
      page.getByRole('button', { name: 'Show this piece' }),
    ).toBeVisible();
    await expect(page.locator('.piece img')).toHaveCount(0);
    await expect(page.locator('.credits')).toHaveCount(2);
    // eslint-disable-next-line playwright/no-networkidle -- checks that no request is made
    await page.waitForLoadState('networkidle');
    expect(images).toEqual([]);
  });

  test('Confirming one piece: the image appears without another data request, and the switch stays off', async ({
    page,
  }) => {
    await page.goto(`/i/${NSFW}`);
    // eslint-disable-next-line playwright/no-networkidle -- checks that no request is made
    await page.waitForLoadState('networkidle');
    const data: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/')) {
        data.push(request.url());
      }
    });

    await page.getByRole('button', { name: 'Show this piece' }).click();
    await expect(page.locator('.piece img')).toBeVisible();
    await expect(page.locator('.confirm')).toHaveCount(0);
    await expect(page.locator('.artists')).toBeVisible();
    await expect(toggle(page)).not.toBeChecked();
    expect(data).toEqual([]);

    // Later in the same session: no question.
    await page.goto('/');
    await page.goto(`/i/${NSFW}`);
    await expect(page.locator('.piece img')).toBeVisible();
    await expect(page.locator('.confirm')).toHaveCount(0);
  });

  test('"Show NSFW everywhere" turns the switch on', async ({ page }) => {
    await page.goto(`/i/${NSFW}`);
    await page.getByRole('button', { name: 'Show NSFW everywhere' }).click();
    await expect(toggle(page)).toBeChecked();
    await expect(page.locator('.piece img')).toBeVisible();
  });
});
