import { expect, test } from '@playwright/test';

test('Privacy page: answers 200 with the site card and the "Tigy" title', async ({
  page,
}) => {
  const response = await page.goto('/privacy');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Tigy');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Tigy',
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary',
  );
});

test('Browsing the site: no cookie and no request to another site', async ({
  page,
  context,
}) => {
  const requested: string[] = [];
  const cookieHeaders: (string | null)[] = [];
  page.on('request', (request) => requested.push(request.url()));
  page.on('response', async (response) =>
    cookieHeaders.push(await response.headerValue('set-cookie')),
  );

  await page.goto('/');
  const origin = new URL(page.url()).origin;
  // The social links are shown, and must load nothing from their networks.
  await expect(page.locator('.socials a').first()).toBeVisible();
  await page.getByRole('switch', { name: 'Show NSFW' }).click();
  await page.getByLabel('Your birthday').fill('1990-05-01');
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.locator('.gallery .tile a')).toHaveCount(6);
  await page.goto('/i/hey-pookie');
  await expect(page.locator('.piece img')).toBeVisible();
  await page.goto('/no-such-page');
  await page.getByRole('link', { name: 'Privacy' }).click();
  await expect(page).toHaveURL('/privacy');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy');

  expect(requested.length).toBeGreaterThan(0);
  expect(
    requested.filter(
      (url) => !url.startsWith('data:') && new URL(url).origin !== origin,
    ),
  ).toEqual([]);
  expect(cookieHeaders.filter(Boolean)).toEqual([]);
  expect(await context.cookies()).toEqual([]);
});
