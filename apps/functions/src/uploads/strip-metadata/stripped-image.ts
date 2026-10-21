export interface StrippedImage {
  data: Buffer;
  /** EXIF orientation, 1 to 8; anything but 1 is kept as an orientation-only EXIF block. */
  orientation: number;
  /** What was dropped, for the logs: "APP1 Exif (1234 bytes)". */
  removed: string[];
}

/** The file can't be walked: cut off, or a length that points past its end. */
export class DamagedImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DamagedImageError';
  }
}

export function need(condition: boolean, message: string): asserts condition {
  if (!condition) throw new DamagedImageError(message);
}
