import { expect, test } from '@playwright/test';
import { imagePaths } from '@tigy/models';
import {
  addImages,
  bucket,
  db,
  rebuildSummaries,
  seed,
} from './support/emulators';

test('Hydration: no data request while an artwork page becomes interactive', async ({
  page,
}) => {
  const data: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) {
      data.push(request.url());
    }
  });
  await page.goto('/i/hey-pookie');
  // Set once Angular takes over the server's HTML.
  await page.waitForFunction(
    () => '__ngContext__' in (document.querySelector('app-root') ?? {}),
  );
  // eslint-disable-next-line playwright/no-networkidle -- checks that no request is made
  await page.waitForLoadState('networkidle');
  expect(data).toEqual([]);

  await page.locator('.nav.next').click();
  await expect(page).toHaveURL(/\/i\/chibi-tigy$/);
});

test.describe('edits', () => {
  test.afterEach(() => seed());

  test("Editing a person: an artist's new link shows on every artwork crediting them", async ({
    page,
  }) => {
    await db.doc('people/placeholder-artist').update({
      links: [
        {
          network: 'mastodon',
          handle: 'artist',
          url: 'https://example.com/new',
        },
      ],
    });
    for (const id of ['hey-pookie', 'happy-tigy']) {
      await page.goto(`/i/${id}`);
      const link = page.locator('.artists .links a');
      await expect(link).toHaveAttribute('aria-label', 'Mastodon: artist');
      await expect(link.locator('ng-icon.generic svg')).toHaveCount(1);
    }
  });

  test('Owner edits a social link: the home header shows the new link', async ({
    page,
  }) => {
    await db.doc('people/tigy').update({
      links: [
        { network: 'bluesky', handle: 'tigy', url: 'https://example.com/tigy' },
      ],
    });
    await page.goto('/');
    await expect(page.locator('.socials a')).toHaveAttribute(
      'aria-label',
      'Bluesky: tigy',
    );
    await expect(page.locator('.socials a')).toHaveAttribute(
      'href',
      'https://example.com/tigy',
    );
  });

  test('Renaming a person: a shared filter link still filters by them, showing the new name', async ({
    page,
  }) => {
    await db.doc('people/placeholder-character').update({ name: 'Pookie' });
    await rebuildSummaries();
    await page.goto('/?character=placeholder-character');
    await expect(page.locator('.chip.is-active')).toHaveText([
      'Character: Pookie',
    ]);
    await expect(page.locator('.gallery .tile a')).toHaveCount(1);
  });

  test('Publishing later: the piece appears in the gallery, the count and the date range', async ({
    page,
  }) => {
    await addImages([
      {
        id: 'later',
        fields: {
          title: 'Later',
          date: '2026-06-01',
          sortDate: '2026-06-01',
          published: false,
        },
      },
    ]);
    await page.goto('/');
    await expect(page.locator('.tile a[href="/i/later"]')).toHaveCount(0);

    await db.doc('images/later').update({ published: true });
    await rebuildSummaries();
    await page.goto('/');
    await expect(page.locator('.gallery .tile a').first()).toHaveAttribute(
      'href',
      '/i/later',
    );
    await expect(page.locator('.overview')).toHaveText(
      '6 pieces · Jan 2025 – Jun 2026',
    );
    await page.goto('/i/later');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Later');
  });

  test('Deleting a published artwork: it leaves the gallery, its page is not found and its files 404', async ({
    page,
    request,
  }) => {
    await db.doc('images/hey-pookie').delete();
    await bucket.deleteFiles({ prefix: imagePaths.folder('hey-pookie') });
    await rebuildSummaries();

    await page.goto('/');
    await expect(page.locator('.tile a[href="/i/hey-pookie"]')).toHaveCount(0);
    expect((await page.goto('/i/hey-pookie'))?.status()).toBe(404);
    for (const file of ['thumb.webp', 'full.webp', 'original.png']) {
      expect(
        (await request.get(`/img/hey-pookie/${file}`)).status(),
        file,
      ).toBe(404);
    }
  });
});
