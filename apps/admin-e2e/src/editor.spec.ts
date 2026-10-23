import { expect, test, type Page } from '@playwright/test';
import { addImages, batchPieces, db, readDoc, seed } from './support/emulators';
import { dropFiles } from './support/files';
import { expectNoSidewaysScroll } from './support/layout';
import { signInAsOwner } from './support/sign-in';

test.afterEach(() => seed());

const tiles = (page: Page) =>
  page.getByRole('list', { name: 'Artworks' }).getByRole('listitem');
const save = (page: Page) =>
  page.getByRole('button', { name: 'Save', exact: true });
const imageId = (page: Page) =>
  new URL(page.url()).pathname.split('/').pop() ?? '';

test('Publishing a new upload, marking it NSFW, then deleting it from the editor', async ({
  page,
}) => {
  test.slow();
  await signInAsOwner(page, '/artworks?view=unpublished');
  await dropFiles(page, ['tigy-hearts.png']);
  await expect(tiles(page)).toHaveCount(1, { timeout: 60_000 });
  await tiles(page).getByRole('link').first().click();
  await expect(page).toHaveURL(/\/artworks\/[A-Za-z0-9]+\?view=unpublished$/);
  const id = imageId(page);
  await expect(page.getByRole('list', { name: 'Characters' })).toContainText(
    'Tigy',
  );

  await page.getByLabel('Title', { exact: true }).fill('Happy hearts');
  await page.getByLabel('Year').fill('2024');
  await page.getByLabel('Month').fill('2');
  await page.getByRole('combobox', { name: 'Add to Artists' }).fill('Bramble');
  await page.getByRole('option', { name: 'Create “Bramble”' }).click();
  await expect(page.getByRole('list', { name: 'Artists' })).toContainText(
    'Bramble',
  );
  const tags = page.getByRole('combobox', { name: 'Tags' });
  await tags.fill('Hearts');
  await tags.press('Enter');
  await page.getByRole('switch', { name: 'Published' }).click();
  await save(page).click();
  await expect(page.getByText('Unsaved edits')).toBeHidden();

  const bramble = await db
    .collection('people')
    .where('name', '==', 'Bramble')
    .get();
  expect(bramble.size).toBe(1);
  await expect
    .poll(() => readDoc(`images/${id}`))
    .toEqual(
      expect.objectContaining({
        title: 'Happy hearts',
        date: '2024-02',
        sortDate: '2024-02-01',
        artistIds: [bramble.docs[0].id],
        characterIds: ['tigy'],
        tags: ['hearts'],
        published: true,
        nsfw: false,
      }),
    );
  await page.getByRole('link', { name: 'Artworks' }).first().click();
  await expect(page.getByLabel('Counts')).toContainText('6 published SFW');

  // Marking a published piece NSFW.
  await page.goto(`/artworks/${id}`);
  await page.getByRole('switch', { name: 'NSFW' }).click();
  await save(page).click();
  await expect
    .poll(async () => (await readDoc(`images/${id}`))?.['nsfw'])
    .toBe(true);

  await page.getByRole('button', { name: 'Delete' }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page).toHaveURL(/\/artworks$/);
  await expect.poll(() => readDoc(`images/${id}`)).toBeUndefined();
  await expect
    .poll(() => readDoc(`uploads/${id}`), { timeout: 30_000 })
    .toBeUndefined();
});

test('Save and next through three unpublished pieces', async ({ page }) => {
  await addImages(batchPieces(3));
  await signInAsOwner(page, '/artworks?view=unpublished');
  await tiles(page).first().getByRole('link').first().click();
  for (const n of [1, 2]) {
    await expect(
      page.getByRole('heading', { name: `Batch ${n}` }),
    ).toBeVisible();
    await page.getByRole('switch', { name: 'Published' }).click();
    await page.getByRole('button', { name: 'Save and next' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Batch 3' })).toBeVisible();
  // The last piece of the view offers Save only.
  await expect(
    page.getByRole('button', { name: 'Save and next' }),
  ).toBeHidden();
  await page.getByRole('switch', { name: 'Published' }).click();
  await save(page).click();
  for (const n of [1, 2, 3]) {
    await expect
      .poll(async () => (await readDoc(`images/batch-${n}`))?.['published'])
      .toBe(true);
  }
});

test('Ctrl+Enter and Alt+arrows through Needs work until a piece leaves it', async ({
  page,
}) => {
  await addImages([
    { id: 'undated', fields: { title: 'Undated', sortDate: '2026-06-20' } },
    { id: 'untitled', fields: { date: '2026-06', sortDate: '2026-06-10' } },
  ]);
  await signInAsOwner(page, '/artworks?view=needs-work');
  const needsWork = page.getByRole('tab', { name: /Needs work/ });
  await expect(needsWork).toHaveText(/3/);
  await tiles(page).first().getByRole('link').first().click();
  await expect(page.getByRole('heading', { name: 'Undated' })).toBeVisible();

  await page.keyboard.press('Alt+ArrowRight');
  await expect(page).toHaveURL(/\/artworks\/untitled\?view=needs-work$/);
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(page).toHaveURL(/\/artworks\/undated\?view=needs-work$/);

  await page.getByLabel('Year').fill('2020');
  await page.getByLabel('Year').press('Control+Enter');
  await expect(page).toHaveURL(/\/artworks\/untitled\?view=needs-work$/);
  await expect
    .poll(async () => (await readDoc('images/undated'))?.['date'])
    .toBe('2020');
  await page.goto('/artworks?view=needs-work');
  await expect(needsWork).toHaveText(/2/);
  await expect(tiles(page)).not.toContainText(['Undated']);
});

test('Leaving with unsaved edits asks, and staying keeps the edit', async ({
  page,
}) => {
  await signInAsOwner(page, '/artworks/happy-tigy');
  await page.getByLabel('Title', { exact: true }).fill('Happier Tigy');
  await page.getByRole('link', { name: 'People' }).first().click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Leave without saving?');
  await dialog.getByRole('button', { name: 'Stay' }).click();
  await expect(page).toHaveURL(/\/artworks\/happy-tigy$/);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'Happier Tigy',
  );
});

test('Editing on a phone: the image is above the form and nothing scrolls sideways @phone', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'A phone layout');
  await signInAsOwner(page, '/artworks/happy-tigy');
  const image = await page
    .getByRole('img', { name: 'Happy Tigy' })
    .boundingBox();
  const form = await page
    .getByRole('form', { name: 'Artwork details' })
    .boundingBox();
  expect(image && form && image.y + image.height <= form.y).toBe(true);
  await expectNoSidewaysScroll(page);
  await page.getByLabel('Title', { exact: true }).fill('Happy Tigy on a phone');
  await save(page).click();
  await expect
    .poll(async () => (await readDoc('images/happy-tigy'))?.['title'])
    .toBe('Happy Tigy on a phone');
});
