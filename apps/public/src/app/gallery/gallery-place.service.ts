import { Service } from '@angular/core';
import type { GalleryRow } from '@tigy/models';
import type { GalleryResponse } from '../../api/types';
import { session } from '../browser/storage';

export interface GalleryPlace {
  /** The address's filters and sort, and the NSFW switch. */
  key: string;
  first: GalleryResponse;
  more: { rows: GalleryRow[]; hasMore?: boolean };
}

const ADDRESS_KEY = 'tigy.gallery';

/**
 * Where to go back to: the place (loaded pages) lives in memory, so a reload starts fresh, and the
 * router restores the scroll position itself. The address lives in session storage, per tab.
 */
@Service()
export class GalleryPlaceService {
  private place: GalleryPlace | undefined;
  private hasLeftForArtwork = false;

  keep(place: GalleryPlace, isLeavingForArtwork: boolean): void {
    this.place = place;
    this.hasLeftForArtwork = isLeavingForArtwork;
  }

  /** Given up once: the home page takes it when it opens. */
  take(): GalleryPlace | undefined {
    const place = this.place;
    this.place = undefined;
    this.hasLeftForArtwork = false;
    return place;
  }

  isFromGallery(): boolean {
    return this.hasLeftForArtwork && this.place !== undefined;
  }

  rememberAddress(address: string): void {
    session.set(ADDRESS_KEY, address);
  }

  /** Only addresses on this site count. */
  rememberedAddress(): string | null {
    const address = session.get(ADDRESS_KEY);
    return address?.startsWith('/') && !address.startsWith('//')
      ? address
      : null;
  }
}
