export type ImageFormat = 'jpeg' | 'png' | 'gif' | 'webp';
export type VideoFormat = 'mp4' | 'mov' | 'webm';
export type FileFormat = ImageFormat | VideoFormat;

export interface FormatInfo {
  /** The original's extension, `images/{id}/original.{ext}`. */
  ext: string;
  mime: string;
}

export const FORMATS: Record<FileFormat, FormatInfo> = {
  jpeg: { ext: 'jpg', mime: 'image/jpeg' },
  png: { ext: 'png', mime: 'image/png' },
  gif: { ext: 'gif', mime: 'image/gif' },
  webp: { ext: 'webp', mime: 'image/webp' },
  mp4: { ext: 'mp4', mime: 'video/mp4' },
  mov: { ext: 'mov', mime: 'video/quicktime' },
  webm: { ext: 'webm', mime: 'video/webm' },
};

/** How many leading bytes {@link detectFormat} needs. */
export const FORMAT_SIGNATURE_BYTES = 64;

// Storage rules can't import these, so `storage.rules` repeats them.
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const EBML_MAGIC = [0x1a, 0x45, 0xdf, 0xa3];
const EBML_DOC_TYPE = [0x42, 0x82];

// HEIC, AVIF and 3GP share the `ftyp` box, so only these major brands pass.
const MP4_BRANDS = new Set([
  'isom',
  'iso2',
  'iso3',
  'iso4',
  'iso5',
  'iso6',
  'mp41',
  'mp42',
  'avc1',
  'M4V ',
  'dash',
  'mmp4',
]);

/** The format from a file's signature, never its name or declared type. */
export function detectFormat(bytes: Uint8Array): FileFormat | undefined {
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
  if (startsWithText(bytes, 4, 'ftyp') && bytes.length >= 12) {
    const brand = String.fromCharCode(...bytes.subarray(8, 12));
    if (brand === 'qt  ') return 'mov';
    if (MP4_BRANDS.has(brand)) return 'mp4';
    return undefined;
  }
  if (startsWith(bytes, EBML_MAGIC) && hasWebmDocType(bytes)) return 'webm';
  return undefined;
}

export function isVideoFormat(format: FileFormat): format is VideoFormat {
  return format === 'mp4' || format === 'mov' || format === 'webm';
}

export function maxBytesFor(format: FileFormat): number {
  return isVideoFormat(format) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

/** Other Matroska files carry the DocType `matroska`. */
function hasWebmDocType(bytes: Uint8Array): boolean {
  const end = Math.min(bytes.length, FORMAT_SIGNATURE_BYTES);
  for (let pos = EBML_MAGIC.length; pos + 2 < end; pos++) {
    if (!startsWith(bytes, EBML_DOC_TYPE, pos)) continue;
    // A one-byte EBML size: the high bit set, the rest the length.
    const size = bytes[pos + 2];
    return size === 0x84 && startsWithText(bytes, pos + 3, 'webm');
  }
  return false;
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
