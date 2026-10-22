/** The avatar's largest side; smaller crops keep their own size. */
export const AVATAR_SIZE = 512;
export const MAX_ZOOM = 8;

/** A square crop of a picture, in the picture's pixels: centred on (cx, cy), `zoom` 1 fitting the shorter side. */
export interface Crop {
  width: number;
  height: number;
  cx: number;
  cy: number;
  zoom: number;
}

/** The largest centred square. */
export function initialCrop(width: number, height: number): Crop {
  return { width, height, cx: width / 2, cy: height / 2, zoom: 1 };
}

export function side(crop: Crop): number {
  return Math.min(crop.width, crop.height) / crop.zoom;
}

/** Keeps the zoom within its limits and the square inside the picture. */
export function clamp(crop: Crop): Crop {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, crop.zoom));
  const half = Math.min(crop.width, crop.height) / zoom / 2;
  return {
    ...crop,
    zoom,
    cx: Math.min(crop.width - half, Math.max(half, crop.cx)),
    cy: Math.min(crop.height - half, Math.max(half, crop.cy)),
  };
}

/** Drags the picture by (dx, dy) screen pixels under a frame `frame` pixels wide. */
export function pan(crop: Crop, dx: number, dy: number, frame: number): Crop {
  const perPixel = side(crop) / frame;
  return clamp({
    ...crop,
    cx: crop.cx - dx * perPixel,
    cy: crop.cy - dy * perPixel,
  });
}

/** Zooms to `zoom`, keeping the picture point under (fx, fy) in the frame where it is. */
export function zoomAround(
  crop: Crop,
  zoom: number,
  fx: number,
  fy: number,
  frame: number,
): Crop {
  const before = side(crop);
  const pointX = crop.cx - before / 2 + (fx / frame) * before;
  const pointY = crop.cy - before / 2 + (fy / frame) * before;
  const next = clamp({ ...crop, zoom });
  const after = side(next);
  return clamp({
    ...next,
    cx: pointX - (fx / frame) * after + after / 2,
    cy: pointY - (fy / frame) * after + after / 2,
  });
}

/** The square to draw, in whole picture pixels, and the avatar's size. */
export function output(crop: Crop): {
  sx: number;
  sy: number;
  sourceSide: number;
  size: number;
} {
  const sourceSide = side(crop);
  return {
    sx: crop.cx - sourceSide / 2,
    sy: crop.cy - sourceSide / 2,
    sourceSide,
    size: Math.min(AVATAR_SIZE, Math.floor(sourceSide)),
  };
}
