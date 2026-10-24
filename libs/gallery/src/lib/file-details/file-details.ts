const VIDEO_NAMES: Record<string, string> = {
  'video/mp4': 'MP4 video',
  'video/quicktime': 'MOV video',
  'video/webm': 'WebM video',
};

/** "PNG", "GIF", "MP4 video". */
export function formatName(mime: string): string {
  return VIDEO_NAMES[mime] ?? (mime.split('/')[1] ?? mime).toUpperCase();
}

/** "820 B", "340 KB", "1.2 MB". */
export function fileSize(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

/** "0:42", "2:05". */
export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** A video's duration, "0:42"; undefined for an image. */
export function fileDuration(file: {
  durationMs?: number;
}): string | undefined {
  return file.durationMs === undefined
    ? undefined
    : formatDuration(file.durationMs);
}
