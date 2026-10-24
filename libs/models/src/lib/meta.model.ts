import type { TimestampLike } from './firestore.model';

// Everything under `meta` is derived from `people` and `images` and written only by Cloud Functions.

export const META_GALLERY_DOC = 'meta/gallery';
export const META_PEOPLE_DOC = 'meta/people';
export const META_TAGS_DOC = 'meta/tags';

/** One published image in `meta/gallery`. */
export interface GalleryRow {
  id: string;
  title?: string;
  sortDate: string;
  w: number;
  h: number;
  nsfw: boolean;
  artistIds: string[];
  characterIds: string[];
  tags: string[];
  // Absent for images, so their rows don't grow.
  isVideo?: true;
}

/** One person in `meta/people`, for the filter pickers and chips. */
export interface PeopleEntry {
  id: string;
  name: string;
  avatar?: string;
}

/** Tag to the number of images using it, published or not. */
export type TagCounts = Record<string, number>;

/** `meta/gallery`: `items` is a JSON array of {@link GalleryRow}. */
export interface GallerySummary {
  items: string;
  updatedAt: TimestampLike;
}

/** `meta/people`: `items` is a JSON array of {@link PeopleEntry}. */
export interface PeopleSummary {
  items: string;
  updatedAt: TimestampLike;
}

/** `meta/tags`, readable only by the owner. */
export interface TagSummary {
  counts: TagCounts;
  updatedAt: TimestampLike;
}
