export type ImageFormat = 'jpeg' | 'png' | 'gif' | 'webp';

export interface ImageFormatInfo {
  /** The original's extension, `images/{id}/original.{ext}`. */
  ext: string;
  mime: string;
}

export const IMAGE_FORMATS: Record<ImageFormat, ImageFormatInfo> = {
  jpeg: { ext: 'jpg', mime: 'image/jpeg' },
  png: { ext: 'png', mime: 'image/png' },
  gif: { ext: 'gif', mime: 'image/gif' },
  webp: { ext: 'webp', mime: 'image/webp' },
};

/** How many leading bytes {@link detectImageFormat} needs. */
export const FORMAT_SIGNATURE_BYTES = 12;

/** Storage rules can't import this, so `storage.rules` repeats it. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** The format from a file's signature, never its name or declared type. */
export function detectImageFormat(bytes: Uint8Array): ImageFormat | undefined {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(bytes, PNG_SIGNATURE)) return 'png';
  if (
    startsWithText(bytes, 0, 'GIF87a') ||
    startsWithText(bytes, 0, 'GIF89a')
  ) {
    return 'gif';
  }
  if (startsWithText(bytes, 0, 'RIFF') && startsWithText(bytes, 8, 'WEBP')) {
    return 'webp';
  }
  return undefined;
}

function startsWith(
  bytes: Uint8Array,
  signature: number[],
  offset = 0,
): boolean {
  return (
    bytes.length >= offset + signature.length &&
    signature.every((byte, i) => bytes[offset + i] === byte)
  );
}

function startsWithText(
  bytes: Uint8Array,
  offset: number,
  text: string,
): boolean {
  return startsWith(
    bytes,
    [...text].map((char) => char.charCodeAt(0)),
    offset,
  );
}
