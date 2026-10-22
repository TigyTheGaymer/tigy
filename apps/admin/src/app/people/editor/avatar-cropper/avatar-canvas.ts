import { InjectionToken } from '@angular/core';
import { output, type Crop } from './crop';

export interface DecodedPicture {
  width: number;
  height: number;
  /** For showing it under the frame. */
  url: string;
  release(): void;
}

/** Decoding and drawing on a canvas, behind a token: the test browser has neither. */
export interface AvatarCanvas {
  decode(file: Blob): Promise<DecodedPicture & { bitmap: ImageBitmap }>;
  /** A WebP of the crop. Drawing on a canvas carries none of the file's metadata over. */
  encode(bitmap: ImageBitmap, crop: Crop): Promise<Blob>;
}

export const AVATAR_CANVAS = new InjectionToken<AvatarCanvas>('AVATAR_CANVAS', {
  factory: () => ({
    decode: async (file) => {
      // The first frame of an animation, turned upright as the camera meant.
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      });
      const url = URL.createObjectURL(file);
      return {
        bitmap,
        width: bitmap.width,
        height: bitmap.height,
        url,
        release: () => {
          bitmap.close();
          URL.revokeObjectURL(url);
        },
      };
    },
    encode: async (bitmap, crop) => {
      const { sx, sy, sourceSide, size } = output(crop);
      const canvas = new OffscreenCanvas(size, size);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No 2D canvas');
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        bitmap,
        sx,
        sy,
        sourceSide,
        sourceSide,
        0,
        0,
        size,
        size,
      );
      return canvas.convertToBlob({ type: 'image/webp', quality: 0.9 });
    },
  }),
});
