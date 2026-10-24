import {
  detectFormat,
  FORMAT_SIGNATURE_BYTES,
  isVideoFormat,
  maxBytesFor,
  type FileFormat,
} from '@tigy/uploads';

export type FileRefusal =
  'unsupported' | 'not-an-image' | 'image-too-large' | 'video-too-large';

export type FileCheck = { format: FileFormat } | { refusal: FileRefusal };

export const REFUSAL_MESSAGES: Record<FileRefusal, string> = {
  unsupported: 'Only JPEG, PNG, GIF, WebP, MP4, MOV and WebM are supported.',
  'not-an-image': 'Only JPEG, PNG, GIF and WebP are supported.',
  'image-too-large': 'The limit for images is 50 MB.',
  'video-too-large': 'The limit for videos is 200 MB.',
};

/** Reads the file's first bytes: its name and the browser's `type` come from the extension. */
export async function checkFile(
  file: Blob,
  { includeVideo = true } = {},
): Promise<FileCheck> {
  const head = await file.slice(0, FORMAT_SIGNATURE_BYTES).arrayBuffer();
  const format = detectFormat(new Uint8Array(head));
  if (!format)
    return { refusal: includeVideo ? 'unsupported' : 'not-an-image' };
  const isVideo = isVideoFormat(format);
  if (isVideo && !includeVideo) return { refusal: 'not-an-image' };
  if (file.size > maxBytesFor(format)) {
    return { refusal: isVideo ? 'video-too-large' : 'image-too-large' };
  }
  return { format };
}
