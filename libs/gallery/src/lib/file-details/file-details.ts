/** "PNG", "GIF". */
export function formatName(mime: string): string {
  return (mime.split('/')[1] ?? mime).toUpperCase();
}

/** "820 B", "340 KB", "1.2 MB". */
export function fileSize(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
