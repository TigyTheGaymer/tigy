import type { ImageFormat } from '@tigy/uploads';
import { DamagedImageError, type StrippedImage } from './stripped-image';
import { stripGif } from './strip-gif';
import { stripJpeg } from './strip-jpeg';
import { stripPng } from './strip-png';
import { stripWebp } from './strip-webp';

// Removes metadata without re-encoding: only whole metadata segments, chunks
// or blocks are dropped, and every byte that carries pixels, colour or
// animation is copied unchanged.

export { DamagedImageError, type StrippedImage } from './stripped-image';

export function stripMetadata(buf: Buffer, format: ImageFormat): StrippedImage {
  try {
    switch (format) {
      case 'jpeg':
        return stripJpeg(buf);
      case 'png':
        return stripPng(buf);
      case 'gif':
        return stripGif(buf);
      case 'webp':
        return stripWebp(buf);
    }
  } catch (error) {
    // Buffer reads past the end throw RangeError.
    if (error instanceof RangeError) {
      throw new DamagedImageError(`${format}: ${error.message}`);
    }
    throw error;
  }
}
