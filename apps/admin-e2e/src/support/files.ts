import { workspaceRoot } from '@nx/devkit';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const ASSETS = resolve(workspaceRoot, 'design/mockups/assets');

/** Drops files from the mockup assets on the page, as dragging them from a folder would. */
export async function dropFiles(page: Page, names: string[]): Promise<void> {
  const files = names.map((name) => ({
    name,
    type: name.endsWith('.gif') ? 'image/gif' : 'image/png',
    base64: readFileSync(resolve(ASSETS, name)).toString('base64'),
  }));
  const dataTransfer = await page.evaluateHandle((list) => {
    const transfer = new DataTransfer();
    for (const file of list) {
      const bytes = Uint8Array.from(atob(file.base64), (c) => c.charCodeAt(0));
      transfer.items.add(new File([bytes], file.name, { type: file.type }));
    }
    return transfer;
  }, files);
  await page.dispatchEvent('main', 'dragenter', { dataTransfer });
  await page.dispatchEvent('main', 'drop', { dataTransfer });
}
