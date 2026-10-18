import { session } from './browser/storage';

const KEY = 'tigy.gallery';

/** Session storage is per tab, so each tab remembers its own gallery. */
export function rememberGallery(address: string): void {
  session.set(KEY, address);
}

/** Only addresses on this site count. */
export function rememberedGallery(): string | null {
  const address = session.get(KEY);
  return address?.startsWith('/') && !address.startsWith('//') ? address : null;
}
