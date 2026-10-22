import { expect, type Page } from '@playwright/test';

export const OWNER_EMAIL = 'owner@tigy.test';

/**
 * Signs in through the Auth emulator's Google popup, adding the account the
 * first time. The popup's wording follows firebase-tools; keep it here only.
 */
export async function signIn(
  page: Page,
  email = OWNER_EMAIL,
  path = '/artworks',
): Promise<void> {
  await page.goto(path);
  const button = page.getByRole('button', {
    name: /^(Sign in with Google|Account)$/,
  });
  await button.waitFor();
  // Already signed in, as after a first try that finished late.
  if ((await button.textContent())?.includes('Sign in') !== true) return;
  const popupOpened = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Sign in with Google' }).click();
  const popup = await popupOpened;
  await popup.waitForLoadState();
  const existing = popup.getByText(email);
  if (await existing.isVisible().catch(() => false)) {
    await existing.click();
  } else {
    await popup.getByRole('button', { name: /add new account/i }).click();
    await popup.getByLabel('Email').fill(email);
    await popup.getByLabel('Display name').fill(email.split('@')[0]);
    await popup.getByRole('button', { name: /sign in with google/i }).click();
  }
  await popup.waitForEvent('close');
}

/**
 * Signs in as the owner. The very first popup of a run sometimes leaves the
 * SDK waiting after it closes, so a second try starts from a fresh page.
 */
export async function signInAsOwner(page: Page, path = '/artworks') {
  const account = page.getByRole('button', { name: 'Account' });
  for (let attempt = 1; ; attempt++) {
    await signIn(page, OWNER_EMAIL, path);
    try {
      await expect(account).toBeVisible({ timeout: 20_000 });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
}
