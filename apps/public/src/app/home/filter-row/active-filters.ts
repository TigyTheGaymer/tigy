import type { Params } from '@angular/router';
import { galleryQueryToParams, type GalleryQuery } from '@tigy/gallery';

export interface ActiveFilter {
  key: string;
  kind: 'Character' | 'Artist' | 'Tag' | 'Year';
  name: string;
  /** The gallery address without this filter. */
  remove: Params;
}

export function activeFilters(
  query: GalleryQuery,
  personName: (id: string) => string | null,
): ActiveFilter[] {
  const without = (change: Partial<GalleryQuery>) =>
    galleryQueryToParams({ ...query, ...change });
  return [
    ...query.characterIds.map((id) => ({
      key: `character:${id}`,
      kind: 'Character' as const,
      name: personName(id) ?? '…',
      remove: without({
        characterIds: query.characterIds.filter((other) => other !== id),
      }),
    })),
    ...query.artistIds.map((id) => ({
      key: `artist:${id}`,
      kind: 'Artist' as const,
      name: personName(id) ?? '…',
      remove: without({
        artistIds: query.artistIds.filter((other) => other !== id),
      }),
    })),
    ...query.tags.map((tag) => ({
      key: `tag:${tag}`,
      kind: 'Tag' as const,
      name: tag,
      remove: without({ tags: query.tags.filter((other) => other !== tag) }),
    })),
    ...(query.year === undefined
      ? []
      : [
          {
            key: 'year',
            kind: 'Year' as const,
            name: String(query.year),
            remove: without({ year: undefined }),
          },
        ]),
  ];
}
