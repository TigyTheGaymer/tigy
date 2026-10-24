import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import {
  addImages,
  batchPieces,
  db,
  fileExists,
  readDoc,
  seed,
} from './support/emulators';
import { ASSETS, dropFiles } from './support/files';
import { expectNoSidewaysScroll } from './support/layout';
import { signInAsOwner } from './support/sign-in';

test.afterEach(() => seed());

const counts = (page: Page) => page.getByLabel('Counts');
const tiles = (page: Page) =>
  page.getByRole('list', { name: 'Artworks' }).getByRole('listitem');
const dialog = (page: Page) => page.getByRole('alertdialog');

async function published(ids: string[]): Promise<boolean[]> {
  return Promise.all(
    ids.map(
      async (id) => (await readDoc(`images/${id}`))?.['published'] === true,
    ),
  );
}

test('Publishing a batch: all five are published and the counts change by five @phone', async ({
  page,
}) => {
  await addImages(batchPieces(5));
  await signInAsOwner(page, '/artworks?view=unpublished');
  await expect(counts(page)).toContainText('5 unpublished');
  await expect(tiles(page)).toHaveCount(5);
  await expectNoSidewaysScroll(page);

  await page.getByRole('checkbox', { name: 'Select all', exact: true }).click();
  const bar = page.getByRole('toolbar', { name: 'Selected artworks' });
  await expect(bar).toContainText('5 selected');
  await bar.getByRole('button', { name: 'Publish', exact: true }).click();

  await expect(counts(page)).toContainText('0 unpublished');
  await expect(counts(page)).toContainText('11 published SFW');
  await expect(page.getByText('No artworks match')).toBeVisible();
  await expect
    .poll(() => published(batchPieces(5).map((p) => p.id)))
    .toEqual(Array(5).fill(true));
});

test('Publishing a batch with uncredited pieces: asks, and confirming publishes all five', async ({
  page,
}) => {
  await addImages(
    batchPieces(5).map((piece, i) => ({
      ...piece,
      fields: {
        ...piece.fields,
        artistIds: i < 2 ? [] : ['placeholder-artist'],
      },
    })),
  );
  await signInAsOwner(page, '/artworks?view=unpublished');
  await page.getByRole('checkbox', { name: 'Select all', exact: true }).click();
  await page
    .getByRole('toolbar', { name: 'Selected artworks' })
    .getByRole('button', { name: 'Publish', exact: true })
    .click();
  await expect(dialog(page)).toContainText('2 of 5 have no artist credited.');
  await dialog(page).getByRole('button', { name: 'Publish' }).click();
  await expect(counts(page)).toContainText('0 unpublished');
  await expect
    .poll(() => published(batchPieces(5).map((p) => p.id)))
    .toEqual(Array(5).fill(true));
});

test('Deleting a batch: asks to confirm deleting 3 artworks, then deletes them', async ({
  page,
}) => {
  await addImages(batchPieces(4));
  await signInAsOwner(page, '/artworks?view=unpublished');
  for (const n of [1, 2, 3]) {
    await page.getByRole('checkbox', { name: `Select Batch ${n}` }).click();
  }
  await page
    .getByRole('toolbar', { name: 'Selected artworks' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(dialog(page)).toContainText('Delete 3 artworks?');
  await dialog(page).getByRole('button', { name: 'Delete' }).click();
  await expect(tiles(page)).toHaveCount(1);
  await expect(tiles(page)).toContainText('Batch 4');
  for (const n of [1, 2, 3]) {
    expect(await readDoc(`images/batch-${n}`)).toBeUndefined();
  }
});

test('Uploading from the Artworks page, editing the fresh upload, then deleting it', async ({
  page,
}) => {
  test.slow();
  await signInAsOwner(page, '/artworks?view=unpublished');
  await expect(page.getByText('No artworks yet')).toBeHidden();
  await dropFiles(page, ['tigy-chibi.png']);

  const uploads = page.getByRole('list', { name: 'Uploads in progress' });
  await expect(uploads).toContainText('tigy-chibi.png');
  // The tile becomes the artwork's own tile once processing is done.
  await expect(tiles(page)).toHaveCount(1, { timeout: 60_000 });
  await expect(uploads.getByRole('listitem')).toHaveCount(0);
  await expect(tiles(page)).toContainText('Untitled');

  // The Uploads page lists it.
  await page.getByRole('link', { name: 'Uploads' }).first().click();
  const row = page.getByRole('link', { name: 'tigy-chibi.png' });
  await expect(row).toBeVisible();

  // The ready row opens the artwork's editor.
  await row.click();
  await expect(page).toHaveURL(/\/artworks\/[A-Za-z0-9]+$/);
  const id = page.url().split('/').pop() ?? '';
  await expect(page.getByRole('img', { name: 'Untitled' })).toBeVisible();
  expect(await readDoc(`uploads/${id}`)).toBeDefined();

  // Tigy comes credited, and removing the credit sticks.
  await page.getByRole('button', { name: 'Remove Tigy' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect
    .poll(async () => (await readDoc(`images/${id}`))?.['characterIds'])
    .toEqual([]);

  // Its row leaves the upload list.
  await page.getByRole('button', { name: 'Delete' }).click();
  await dialog(page).getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL(/\/artworks$/);
  await page.goto('/uploads');
  await expect(page.getByText('tigy-chibi.png')).toBeHidden({
    timeout: 30_000,
  });
  await expect
    .poll(() => fileExists(`images/${id}/thumb.webp`), { timeout: 30_000 })
    .toBe(false);
  expect(await readDoc(`uploads/${id}`)).toBeUndefined();
});

test('Uploading from a phone: both photos upload with their tiles at the top @phone', async ({
  page,
}) => {
  test.slow();
  await signInAsOwner(page, '/artworks?view=sfw');
  await page
    .locator('input[type=file]')
    .setInputFiles([
      resolve(ASSETS, 'tigy-chibi.png'),
      resolve(ASSETS, 'tigy-hearts.png'),
    ]);
  const uploads = page.getByRole('list', { name: 'Uploads in progress' });
  await expect(uploads.getByRole('listitem')).toHaveCount(2);
  await expectNoSidewaysScroll(page);
  // Both finish as unpublished artworks, which the SFW view hides.
  await expect(page.getByText('2 artworks ready')).toBeVisible({
    timeout: 60_000,
  });
  await page.getByRole('button', { name: 'Show unpublished' }).click();
  await expect(page).toHaveURL(/view=unpublished/);
  await expect(tiles(page)).toHaveCount(2);
  const ready = await db
    .collection('uploads')
    .where('status', '==', 'ready')
    .get();
  expect(ready.size).toBe(2);
});
