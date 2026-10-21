import {
  detectImageFormat,
  FORMAT_SIGNATURE_BYTES,
  MAX_UPLOAD_BYTES,
  type ImageFormat,
} from '@tigy/uploads';

export type FileRefusal = 'unsupported' | 'too-large';

export type FileCheck = { format: ImageFormat } | { refusal: FileRefusal };

export const REFUSAL_MESSAGES: Record<FileRefusal, string> = {
  unsupported: 'Only JPEG, PNG, GIF and WebP are supported.',
  'too-large': 'The limit is 50 MB.',
};

/** Reads the file's first bytes: its name and the browser's `type` come from the extension. */
export async function checkFile(file: Blob): Promise<FileCheck> {
  const head = await file.slice(0, FORMAT_SIGNATURE_BYTES).arrayBuffer();
  const format = detectImageFormat(new Uint8Array(head));
  if (!format) return { refusal: 'unsupported' };
  if (file.size > MAX_UPLOAD_BYTES) return { refusal: 'too-large' };
  return { format };
}
