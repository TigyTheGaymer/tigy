import type { GalleryRow } from '@tigy/models';
import { pieceTitle } from '../../shared/format';
import { thumbnailUrl } from '../../shared/urls';

export interface Tile {
  id: string;
  src: string;
  /** The piece's own size, for the image's width and height. */
  width: number;
  height: number;
  /** The tile's width over its height, kept between 1:2 and 12:5 so no tile becomes a sliver. */
  shape: number;
  /** The piece's own title, without the "Untitled" fallback. */
  title?: string;
  name: string;
  isNsfw: boolean;
}

const NARROWEST = 0.5;
const WIDEST = 2.4;

export function toTile(row: GalleryRow): Tile {
  const shape = row.h > 0 ? row.w / row.h : 1;
  return {
    id: row.id,
    src: thumbnailUrl(row.id),
    width: row.w,
    height: row.h,
    shape: Math.min(WIDEST, Math.max(NARROWEST, shape)),
    title: row.title,
    name: pieceTitle(row.title),
    isNsfw: row.nsfw,
  };
}
