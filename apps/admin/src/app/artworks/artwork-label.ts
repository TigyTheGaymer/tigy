import { formatArtworkDate } from '@tigy/gallery';
import type { Image } from '@tigy/models';
import type { Gap } from './artworks.service';

export const GAP_LABELS: Record<Gap, string> = {
  artist: 'No artist',
  title: 'No title',
  date: 'No date',
};

export function titleOf(image: Image): string {
  return image.title || 'Untitled';
}

/** The artwork date at its precision, or the day the file was added: "Apr 2021", "Added 20 Nov 2025". */
export function dateOf(image: Image): string {
  if (image.date) return formatArtworkDate(image.date);
  return `Added ${addedOn(image)}`;
}

/** "20 Nov 2025", in UTC like the sort date. */
export function addedOn(image: Image): string {
  return formatArtworkDate(image.createdAt.toDate().toISOString().slice(0, 10));
}
