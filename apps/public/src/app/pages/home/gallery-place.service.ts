import { Service } from '@angular/core';
import type { GalleryRow } from '@tigy/models';
import type { GalleryResponse } from '../../../api/types';

/** The gallery as the visitor left it: which gallery, and every piece loaded. */
export interface GalleryPlace {
  /** The address's filters and sort, and the NSFW switch. */
  key: string;
  first: GalleryResponse;
  more: { rows: GalleryRow[]; hasMore?: boolean };
}

/**
 * Keeps the visitor's place in memory for the visit, so going back to the
 * gallery shows the same pieces without loading them again. A reload starts
 * fresh. The router restores the scroll position itself.
 */
@Service()
export class GalleryPlaceService {
  private place: GalleryPlace | undefined;
  private hasLeftForArtwork = false;

  keep(place: GalleryPlace, isLeavingForArtwork: boolean): void {
    this.place = place;
    this.hasLeftForArtwork = isLeavingForArtwork;
  }

  /** The kept place, given up once: the home page takes it back when it opens. */
  take(): GalleryPlace | undefined {
    const place = this.place;
    this.place = undefined;
    this.hasLeftForArtwork = false;
    return place;
  }

  /** Whether the visitor opened artwork pages from the gallery, so going back in history returns there. */
  isFromGallery(): boolean {
    return this.hasLeftForArtwork && this.place !== undefined;
  }
}
