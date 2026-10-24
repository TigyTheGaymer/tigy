import { computed, inject, linkedSignal, type Signal } from '@angular/core';
import type { GalleryQuery } from '@tigy/gallery';
import type { GalleryResponse } from '../../api/types';
import {
  CatalogService,
  type GalleryRequest,
} from '../catalog/catalog.service';
import type { GalleryPlace } from '../gallery/gallery-place.service';

type MorePages = GalleryPlace['more'];

/** A kept place stands in for the first page, so coming back shows what was loaded without a request. */
export function injectGalleryPages(options: {
  query: Signal<GalleryQuery>;
  includeNsfw: Signal<boolean>;
  /** A change starts over from the first page. */
  key: Signal<string>;
  restored: GalleryPlace | undefined;
}) {
  const { query, includeNsfw, key, restored } = options;
  const catalog = inject(CatalogService);

  const isRestored = computed(() => restored?.key === key());
  const firstPage = catalog.gallery(() =>
    isRestored() ? undefined : { query: query(), includeNsfw: includeNsfw() },
  );

  /** The last first page stays while another loads, so a swap never empties the gallery. */
  const first = linkedSignal<
    GalleryResponse | undefined,
    GalleryResponse | undefined
  >({
    source: () =>
      isRestored()
        ? restored?.first
        : firstPage.hasValue()
          ? firstPage.value()
          : undefined,
    computation: (value, previous) => value ?? previous?.value,
  });

  const nextRequest = linkedSignal<string, GalleryRequest | undefined>({
    source: key,
    computation: () => undefined,
  });
  const nextPage = catalog.gallery(nextRequest);

  const more = linkedSignal<
    { key: string; page: GalleryResponse | undefined },
    MorePages
  >({
    source: () => ({
      key: key(),
      page: nextPage.hasValue() ? nextPage.value() : undefined,
    }),
    computation: ({ key, page }, previous) => {
      if (!previous)
        return isRestored() && restored ? restored.more : { rows: [] };
      if (previous.source.key !== key) return { rows: [] };
      if (!page || page === previous.source.page) return previous.value;
      return {
        rows: [...previous.value.rows, ...page.rows],
        hasMore: page.hasMore,
      };
    },
  });

  const rows = computed(() => [...(first()?.rows ?? []), ...more().rows]);
  const hasMore = computed(() => more().hasMore ?? first()?.hasMore ?? false);
  const hasLoadMoreFailed = computed(() => nextPage.error() !== undefined);
  // A new first page is on its way: more pages would continue the old one.
  const canLoadMore = computed(
    () =>
      hasMore() &&
      !nextPage.isLoading() &&
      !hasLoadMoreFailed() &&
      !firstPage.isLoading(),
  );

  return {
    first: first.asReadonly(),
    more: more.asReadonly(),
    rows,
    hasMore,
    isLoadingFirst: firstPage.isLoading,
    isLoadingMore: nextPage.isLoading,
    hasLoadMoreFailed,
    hasFailed: computed(() => firstPage.error() !== undefined && !first()),
    /** Loads the page after the last row, or retries the one that failed. */
    loadMore(): void {
      if (hasLoadMoreFailed()) {
        nextPage.reload();
        return;
      }
      const last = rows().at(-1);
      if (!last || !canLoadMore()) return;
      nextRequest.set({
        query: query(),
        includeNsfw: includeNsfw(),
        after: last,
      });
    },
  };
}
