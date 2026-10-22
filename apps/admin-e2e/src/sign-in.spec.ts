import { expect, test } from '@playwright/test';
import { signIn, signInAsOwner } from './support/sign-in';

test('Owner signs in: the admin opens the Artworks page', async ({ page }) => {
  await signInAsOwner(page);
  await expect(page).toHaveURL(/\/artworks$/);
  await expect(page.getByRole('heading', { name: 'Artworks' })).toBeVisible();
});

test('Stranger signs in: only the owner can sign in', async ({ page }) => {
  await signIn(page, 'stranger@example.com');
  await expect(page.getByRole('alert')).toHaveText(
    'Only the owner can sign in.',
  );
  await expect(page).toHaveURL(/\/sign-in/);
});

test('Coming back later: opens without asking to sign in again', async ({
  page,
  context,
}) => {
  await signInAsOwner(page);
  const later = await context.newPage();
  await later.goto('/people');
  await expect(later.getByRole('heading', { name: 'People' })).toBeVisible();
  await expect(later).toHaveURL(/\/people$/);
});

test('Signing out: shows the sign-in page', async ({ page }) => {
  await signInAsOwner(page, '/uploads');
  await page.getByRole('button', { name: 'Account' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto('/uploads');
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fuploads$/);
});
