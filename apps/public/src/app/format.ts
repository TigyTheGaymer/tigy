import { formatArtworkDate } from '@tigy/gallery';

export function pieceCount(count: number): string {
  return count === 1 ? '1 piece' : `${count} pieces`;
}

/** "Nov 2025 – Apr 2026", or one month when both share it. */
export function monthRange(oldest: string, newest: string): string {
  const from = formatArtworkDate(oldest.slice(0, 7));
  const to = formatArtworkDate(newest.slice(0, 7));
  return from === to ? from : `${from} – ${to}`;
}

export function formatName(mime: string): string {
  return (mime.split('/')[1] ?? mime).toUpperCase();
}

/** "820 B", "340 KB", "1.2 MB". */
export function fileSize(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
