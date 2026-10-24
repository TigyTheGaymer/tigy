import type { ImageFile } from '@tigy/models';
import { FORMATS, type ImageFormat } from '@tigy/uploads';
import { loadSharp } from './load-sharp';

export const FULL_SIZE = 2048;
export const THUMB_SIZE = 720;

export interface WebVersions {
  full: Buffer;
  thumb: Buffer;
  /** Everything but the original's path, which depends on the image ID. */
  file: Omit<ImageFile, 'original'>;
}

/** The seed's sizes and quality, so seeded and uploaded pieces look alike, with the orientation applied. */
export async function makeWebVersions(
  original: Buffer,
  format: ImageFormat,
): Promise<WebVersions> {
  const sharp = await loadSharp();
  // libvips reads only the first frame of an APNG, so its web versions are still.
  const image = () => sharp(original, { animated: true });
  const webp = (size: number) =>
    image()
      .rotate()
      .resize({
        width: size,
        height: size,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();

  const meta = await image().metadata();
  const storedHeight = meta.pageHeight ?? meta.height;
  const isSideways = (meta.orientation ?? 1) >= 5;
  const [full, thumb, isTransparent] = await Promise.all([
    webp(FULL_SIZE),
    webp(THUMB_SIZE),
    // Drawing apps often export an alpha channel with every pixel opaque.
    meta.hasAlpha
      ? image()
          .stats()
          .then((stats) => !stats.isOpaque)
      : false,
  ]);

  return {
    full,
    thumb,
    file: {
      w: isSideways ? storedHeight : meta.width,
      h: isSideways ? meta.width : storedHeight,
      bytes: original.length,
      mime: FORMATS[format].mime,
      animated: (meta.pages ?? 1) > 1 || isApng(original, format),
      transparent: isTransparent,
    },
  };
}

/** An `acTL` chunk before the first `IDAT` makes a PNG animated. */
function isApng(png: Buffer, format: ImageFormat): boolean {
  if (format !== 'png') return false;
  for (let pos = 8; pos + 8 <= png.length;) {
    const type = png.toString('latin1', pos + 4, pos + 8);
    if (type === 'acTL') return true;
    if (type === 'IDAT') return false;
    pos += 12 + png.readUInt32BE(pos);
  }
  return false;
}
