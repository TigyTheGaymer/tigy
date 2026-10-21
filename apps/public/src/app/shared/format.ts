import { formatArtworkDate } from '@tigy/gallery';

export function pieceTitle(title: string | undefined): string {
  return title ?? 'Untitled';
}

export function pieceCount(count: number): string {
  return count === 1 ? '1 piece' : `${count} pieces`;
}

/** "Nov 2025 – Apr 2026", or one month when both share it. */
export function monthRange(oldest: string, newest: string): string {
  const from = formatArtworkDate(oldest.slice(0, 7));
  const to = formatArtworkDate(newest.slice(0, 7));
  return from === to ? from : `${from} – ${to}`;
}
