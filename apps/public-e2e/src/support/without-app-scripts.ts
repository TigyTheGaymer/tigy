import type { Page } from '@playwright/test';

/** Lets only the page's own inline script run, as before the app loads. */
export async function withoutAppScripts(page: Page): Promise<void> {
  await page.route(/\.(m?js)(\?|$)/, (route) => route.abort());
}
