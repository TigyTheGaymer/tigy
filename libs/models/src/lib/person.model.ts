import type { TimestampLike } from './firestore.model';

export const PEOPLE_COLLECTION = 'people';

/** The site's own person, Tigy. */
export const TIGY_ID = 'tigy';

export interface SocialLink {
  network: string;
  handle: string;
  url: string;
}

/** `people/{personId}`: an artist, a character, or both. */
export interface Person {
  name: string;
  /** Storage path. */
  avatar?: string;
  /** Ordered as the owner set them. */
  links: SocialLink[];
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}
