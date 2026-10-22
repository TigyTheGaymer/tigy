import { expect, test, type Page } from '@playwright/test';
import { personPaths } from '@tigy/models';
import sharp from 'sharp';
import { bucket, db, readDoc, seed } from './support/emulators';
import { expectNoSidewaysScroll } from './support/layout';
import { signInAsOwner } from './support/sign-in';

test.afterEach(() => seed());

/** A 4000 by 3000 JPEG that says where it was taken. */
async function photoWithGps(): Promise<Buffer> {
  return sharp({
    create: {
      width: 4000,
      height: 3000,
      channels: 3,
      background: { r: 245, g: 167, b: 66 },
    },
  })
    .withExif({
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '47/1 22/1 0/1',
        GPSLongitudeRef: 'E',
        GPSLongitude: '8/1 32/1 0/1',
      },
    })
    .jpeg()
    .toBuffer();
}

const link = (page: Page, n: number) =>
  page.getByRole('group', { name: `Link ${n}` });

async function createPerson(page: Page, name: string): Promise<string> {
  await page.goto('/people');
  await page.getByLabel("New person's name").fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/people\/[A-Za-z0-9]+$/);
  return new URL(page.url()).pathname.split('/').pop() ?? '';
}

test('A person from creation to deletion: links, an avatar from a photo, and refusing while credited', async ({
  page,
}) => {
  test.slow();
  await signInAsOwner(page, '/people');
  const id = await createPerson(page, ' Bramble ');
  await expect(page.getByRole('heading', { name: 'Bramble' })).toBeVisible();

  // Pasting a Bluesky address fills the network and handle.
  await page.getByRole('button', { name: 'Add a link' }).click();
  await link(page, 1)
    .getByLabel('Address')
    .fill('https://bsky.app/profile/bramble.bsky.social');
  await link(page, 1).getByLabel('Address').press('Tab');
  await expect(link(page, 1).getByLabel('Network')).toHaveValue('Bluesky');
  await expect(link(page, 1).getByLabel('Handle')).toHaveValue(
    '@bramble.bsky.social',
  );
  await page.getByRole('button', { name: 'Add a link' }).click();
  await link(page, 2).getByLabel('Address').fill('https://t.me/bramble');
  await link(page, 2).getByLabel('Address').press('Tab');
  await page.getByRole('button', { name: 'Move link 2 up' }).click();

  // "Setting an avatar from a photo".
  await page.locator('input[type=file]').setInputFiles({
    name: 'photo.jpg',
    mimeType: 'image/jpeg',
    buffer: await photoWithGps(),
  });
  const zoom = page.getByRole('slider', { name: 'Zoom' });
  await zoom.fill('2');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await expect
    .poll(async () => (await readDoc(`people/${id}`))?.['avatar'])
    .toBe(personPaths.avatar(id));
  const person = await readDoc(`people/${id}`);
  expect(person?.['name']).toBe('Bramble');
  expect(person?.['links']).toEqual([
    { network: 'Telegram', handle: '@bramble', url: 'https://t.me/bramble' },
    {
      network: 'Bluesky',
      handle: '@bramble.bsky.social',
      url: 'https://bsky.app/profile/bramble.bsky.social',
    },
  ]);
  const [avatar] = await bucket.file(personPaths.avatar(id)).download();
  const meta = await sharp(avatar).metadata();
  expect([meta.format, meta.width, meta.height]).toEqual(['webp', 512, 512]);
  expect(meta.exif).toBeUndefined();

  // Deleting while credited is refused, with links to the crediting artworks.
  await db.doc('images/happy-tigy').update({ artistIds: [id] });
  await db
    .doc('images/chibi-tigy')
    .update({ characterIds: [id], published: false });
  await page.getByRole('button', { name: 'Delete' }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete' })
    .click();
  const refusal = page.getByRole('alert');
  await expect(refusal).toContainText("Bramble can't be deleted");
  await expect(
    refusal.getByRole('link', { name: 'Happy Tigy' }),
  ).toHaveAttribute('href', '/artworks/happy-tigy');
  await expect(refusal.getByRole('link')).toHaveCount(2);
  expect(await readDoc(`people/${id}`)).toBeDefined();

  // Uncredited, they can go, and their avatar with them.
  await db.doc('images/happy-tigy').update({ artistIds: [] });
  await db.doc('images/chibi-tigy').update({ characterIds: [] });
  await page.getByRole('button', { name: 'Delete' }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page).toHaveURL(/\/people$/);
  await expect(page.getByRole('list', { name: 'People' })).not.toContainText(
    'Bramble',
  );
  await expect
    .poll(async () => (await bucket.file(personPaths.avatar(id)).exists())[0], {
      timeout: 30_000,
    })
    .toBe(false);
});

test('Tigy cannot be deleted', async ({ page }) => {
  await signInAsOwner(page, '/people/tigy');
  await expect(page.getByText("The site's own person")).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete' })).toBeHidden();
});

test('Creating an artist from the picker and adding a link in the panel before saving the artwork', async ({
  page,
}) => {
  await signInAsOwner(page, '/artworks/chibi-tigy');
  await page.getByLabel('Title', { exact: true }).fill('Chibi Tigy');
  await page.getByRole('combobox', { name: 'Add to Artists' }).fill('Bramble');
  await page.getByRole('option', { name: 'Create “Bramble”' }).click();
  await page.getByRole('button', { name: 'Edit Bramble' }).click();

  const panel = page.getByRole('dialog', { name: 'Bramble' });
  await panel.getByRole('button', { name: 'Add a link' }).click();
  await panel.getByLabel('Address').fill('https://x.com/bramble');
  await panel.getByLabel('Address').press('Tab');
  await expect(panel.getByLabel('Network')).toHaveValue('Twitter');
  await panel.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(panel).toBeHidden();

  // The artwork's own edits are still there to save.
  await expect(page.getByText('Unsaved edits')).toBeVisible();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'Chibi Tigy',
  );
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  const bramble = await db
    .collection('people')
    .where('name', '==', 'Bramble')
    .get();
  expect(bramble.docs[0].get('links')).toEqual([
    { network: 'Twitter', handle: '@bramble', url: 'https://x.com/bramble' },
  ]);
  await expect
    .poll(() => readDoc('images/chibi-tigy'))
    .toEqual(
      expect.objectContaining({
        title: 'Chibi Tigy',
        artistIds: [bramble.docs[0].id],
      }),
    );
});

test('Cropping on a phone: one finger moves the crop and two fingers zoom it @phone', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Touch');
  await signInAsOwner(page, '/people');
  const id = await createPerson(page, 'Pinch');
  await page.locator('input[type=file]').setInputFiles({
    name: 'photo.jpg',
    mimeType: 'image/jpeg',
    buffer: await photoWithGps(),
  });
  const frame = page.getByRole('img', { name: /Avatar crop/ });
  const box = await frame.boundingBox();
  if (!box) throw new Error('No crop frame');
  const touch = await page.context().newCDPSession(page);
  const fingers = (points: [number, number][]) =>
    points.map(([x, y], id) => ({ x: box.x + x, y: box.y + y, id }));
  const send = (type: string, points: [number, number][]) =>
    touch.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: fingers(points),
    });
  // One finger drags the crop.
  await send('touchStart', [[150, 150]]);
  await send('touchMove', [[100, 150]]);
  await send('touchEnd', []);
  // Two fingers move apart.
  await send('touchStart', [
    [120, 144],
    [168, 144],
  ]);
  await send('touchMove', [
    [100, 144],
    [200, 144],
  ]);
  await send('touchMove', [
    [60, 144],
    [250, 144],
  ]);
  await send('touchEnd', []);
  const zoom = Number(
    await page.getByRole('slider', { name: 'Zoom' }).inputValue(),
  );
  expect(zoom).toBeGreaterThan(2);
  await expectNoSidewaysScroll(page);

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect
    .poll(async () => (await bucket.file(personPaths.avatar(id)).exists())[0])
    .toBe(true);
});
