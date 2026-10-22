import { expect, type Page } from '@playwright/test';

/** On a phone, nothing may need sideways scrolling. */
export async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const width = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    screen: document.documentElement.clientWidth,
  }));
  expect(width.page).toBeLessThanOrEqual(width.screen);
}
