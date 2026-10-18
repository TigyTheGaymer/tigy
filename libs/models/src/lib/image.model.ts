import type { TimestampLike } from './firestore.model';

export const IMAGES_COLLECTION = 'images';

export interface ImageFile {
  /** Storage path of the original, `images/{id}/original.{ext}`. */
  original: string;
  w: number;
  h: number;
  bytes: number;
  mime: string;
  animated: boolean;
  transparent: boolean;
}

/** `images/{imageId}`: the source of truth for one artwork. */
export interface Image {
  title?: string;
  description?: string;
  /** Artwork date: `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. */
  date?: string;
  /** `YYYY-MM-DD`: the first day of `date`'s period, or the day the image was added. */
  sortDate: string;
  published: boolean;
  nsfw: boolean;
  /** Person IDs, lead artist first. */
  artistIds: string[];
  /** Person IDs, Tigy first. */
  characterIds: string[];
  /** Flat, normalised tags. */
  tags: string[];
  file: ImageFile;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

/** Storage paths of an image's files. Tiles build their URL from the image ID alone. */
export const imagePaths = {
  folder: (imageId: string) => `images/${imageId}/`,
  thumb: (imageId: string) => `images/${imageId}/thumb.webp`,
  full: (imageId: string) => `images/${imageId}/full.webp`,
  original: (imageId: string, ext: string) =>
    `images/${imageId}/original.${ext}`,
};
