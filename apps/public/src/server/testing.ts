import type { GalleryRow } from '@tigy/models';

// For the server's tests only.

export function aRow(
  id: string,
  sortDate: string,
  fields: Partial<GalleryRow> = {},
): GalleryRow {
  return {
    id,
    sortDate,
    w: 512,
    h: 512,
    nsfw: false,
    artistIds: [],
    characterIds: [],
    tags: [],
    ...fields,
  };
}
