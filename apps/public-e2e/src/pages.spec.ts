import { expect, test } from '@playwright/test';
import { addImages, seed } from './support/emulators';

test.beforeAll(async () => {
  await addImages([
    { id: 'draft', fields: { title: 'Draft', published: false } },
  ]);
});

test.afterAll(() => seed());

for (const path of ['/no-such-page', '/p/tigy']) {
  test(`Unknown address: ${path} shows the not-found page with 404 and a link home`, async ({
    page,
  }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'No tiger here',
    );
    await expect(
      page.locator('.shy a'),
    ).toHaveAttribute('href', '/');
  });
}

test('Unpublished artwork link: shows the not-found page with 404', async ({
  page,
}) => {
  const response = await page.goto('/i/draft');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'No tiger here',
  );
  await expect(page.getByText('Draft')).toHaveCount(0);
});

test('the not-found page is titled "Tigy" and carries the site card', async ({
  page,
}) => {
  await page.goto('/no-such-page');
  await expect(page).toHaveTitle('Tigy');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Tigy',
  );
});

test('Cache header on a page: lets a shared cache keep it for 5 minutes', async ({
  request,
}) => {
  for (const path of ['/', '/i/hey-pookie', '/no-such-page']) {
    const response = await request.get(path);
    expect(response.headers()['cache-control'], path).toBe(
      'public, max-age=0, s-maxage=300',
    );
  }
});
