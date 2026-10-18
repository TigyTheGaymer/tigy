import {
  imagePaths,
  type GalleryRow,
  type Image,
  type Person,
  type TimestampLike,
  type WithId,
} from '@tigy/models';

// Builders for unit tests only; excluded from the library build.

const stamp: TimestampLike = { toDate: () => new Date('2025-11-20T00:00:00Z') };

export function anImage(
  id: string,
  fields: Partial<Image> = {},
): WithId<Image> {
  return {
    id,
    sortDate: '2025-11-20',
    published: true,
    nsfw: false,
    artistIds: ['artist'],
    characterIds: ['tigy'],
    tags: [],
    file: {
      original: imagePaths.original(id, 'png'),
      w: 512,
      h: 512,
      bytes: 1000,
      mime: 'image/png',
      animated: false,
      transparent: false,
    },
    createdAt: stamp,
    updatedAt: stamp,
    ...fields,
  };
}

export function aPerson(
  id: string,
  fields: Partial<Person> = {},
): WithId<Person> {
  return {
    id,
    name: id,
    links: [],
    createdAt: stamp,
    updatedAt: stamp,
    ...fields,
  };
}

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
