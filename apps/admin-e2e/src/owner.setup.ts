import { test as setup } from '@playwright/test';
import { OWNER_STATE, signInAsOwner } from './support/sign-in';

// Firebase Auth keeps the session in IndexedDB.
setup('the owner signs in', async ({ page }) => {
  await signInAsOwner(page);
  await page.context().storageState({ path: OWNER_STATE, indexedDB: true });
});
