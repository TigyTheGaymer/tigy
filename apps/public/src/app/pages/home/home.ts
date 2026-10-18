import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  PLATFORM_ID,
} from '@angular/core';
import { Router, RouterLink, type Params } from '@angular/router';
import {
  galleryQueryFromParams,
  galleryQueryToParams,
  UNFILTERED_QUERY,
  type GalleryQuery,
} from '@tigy/gallery';
import { TIGY_ID, type GalleryRow } from '@tigy/models';
import type { GalleryResponse } from '../../../api/types';
import {
  CatalogService,
  type GalleryRequest,
} from '../../catalog/catalog.service';
import { monthRange, pieceCount } from '../../format';
import { rememberGallery } from '../../gallery-address';
import { HeadService } from '../../head/head.service';
import { avatarUrl, thumbnailUrl } from '../../urls';
import { NsfwSwitchService } from '../../nsfw/nsfw-switch.service';
import { latest } from '../../resources';
import { injectServerResponse } from '../../server-response';

export interface ActiveFilter {
  key: string;
  kind: 'Character' | 'Artist' | 'Tag' | 'Year';
  name: string;
  remove: Params;
}

/** Repeated query parameters arrive as a list. */
type QueryParam = string | string[] | undefined;

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomePage {
  // Bound from the query string by the router.
  readonly character = input<QueryParam>();
  readonly artist = input<QueryParam>();
  readonly tag = input<QueryParam>();
  readonly year = input<QueryParam>();
  readonly sort = input<QueryParam>();

  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);
  private readonly isNsfwShown = inject(NsfwSwitchService).isOn;

  protected readonly query = computed(
    () =>
      galleryQueryFromParams({
        character: this.character(),
        artist: this.artist(),
        tag: this.tag(),
        year: this.year(),
        sort: this.sort(),
      }),
    { equal: (a, b) => sameQuery(a, b) },
  );

  private readonly homeResource = this.catalog.home(this.isNsfwShown);
  private readonly firstPage = this.catalog.gallery(() => ({
    query: this.query(),
    includeNsfw: this.isNsfwShown(),
  }));
  // Only needed to name person filters.
  private readonly people = this.catalog.people(() => {
    const { characterIds, artistIds } = this.query();
    return characterIds.length || artistIds.length
      ? this.isNsfwShown()
      : undefined;
  });

  protected readonly home = latest(this.homeResource);
  protected readonly gallery = latest(this.firstPage);

  /** Cleared whenever the first page changes: new filters, sort or switch start over. */
  private readonly nextRequest = linkedSignal<
    GalleryResponse | undefined,
    GalleryRequest | undefined
  >({ source: this.gallery, computation: () => undefined });
  private readonly nextPage = this.catalog.gallery(this.nextRequest);

  private readonly more = linkedSignal<
    { first: GalleryResponse | undefined; page: GalleryResponse | undefined },
    { rows: GalleryRow[]; hasMore?: boolean }
  >({
    source: () => ({
      first: this.gallery(),
      page: this.nextPage.hasValue() ? this.nextPage.value() : undefined,
    }),
    computation: ({ first, page }, previous) => {
      if (!previous || previous.source.first !== first) return { rows: [] };
      if (!page || page === previous.source.page) return previous.value;
      return {
        rows: [...previous.value.rows, ...page.rows],
        hasMore: page.hasMore,
      };
    },
  });

  protected readonly rows = computed(() => [
    ...(this.gallery()?.rows ?? []),
    ...this.more().rows,
  ]);
  protected readonly tiles = computed(() =>
    this.rows().map((row) => ({
      id: row.id,
      src: thumbnailUrl(row.id),
      width: row.w,
      height: row.h,
      alt: row.title ?? 'Untitled',
    })),
  );
  protected readonly hasMore = computed(
    () => this.more().hasMore ?? this.gallery()?.hasMore ?? false,
  );
  protected readonly isLoadingMore = this.nextPage.isLoading;
  // A new first page is on its way: more pages would continue the old one.
  protected readonly canLoadMore = computed(
    () => !this.isLoadingMore() && !this.firstPage.isLoading(),
  );
  protected readonly hasLoadMoreFailed = computed(
    () => this.nextPage.error() !== undefined,
  );
  protected readonly hasGalleryFailed = computed(
    () => this.firstPage.error() !== undefined && !this.gallery(),
  );
  private readonly hasHeaderFailed = computed(
    () => this.homeResource.error() !== undefined && !this.home(),
  );

  protected readonly socialLinks = computed(
    () => this.home()?.owner?.links ?? [],
  );
  protected readonly ownerName = computed(
    () => this.home()?.owner?.name ?? 'Tigy',
  );
  protected readonly ownerAvatar = computed(() =>
    this.home()?.owner?.avatar ? avatarUrl(TIGY_ID) : null,
  );
  protected readonly overview = computed(() => {
    const home = this.home();
    if (!home?.count || !home.oldest || !home.newest) return null;
    return `${pieceCount(home.count)} · ${monthRange(home.oldest, home.newest)}`;
  });

  protected readonly filters = computed(() =>
    activeFilters(this.query(), (id) => this.personName(id)),
  );
  protected readonly newest = computed(() =>
    galleryQueryToParams({ ...this.query(), sort: 'newest' }),
  );
  protected readonly oldest = computed(() =>
    galleryQueryToParams({ ...this.query(), sort: 'oldest' }),
  );
  protected readonly cleared = computed(() =>
    galleryQueryToParams({ ...UNFILTERED_QUERY, sort: this.query().sort }),
  );

  constructor() {
    inject(HeadService).siteCard();
    const response = injectServerResponse();
    effect(() => {
      if (this.hasGalleryFailed() || this.hasHeaderFailed()) {
        response.unavailable();
      }
    });
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      // For the artwork page's link back.
      effect(() => {
        const tree = this.router.createUrlTree(['/'], {
          queryParams: galleryQueryToParams(this.query()),
        });
        rememberGallery(this.router.serializeUrl(tree));
      });
    }
  }

  protected loadMore(): void {
    if (this.hasLoadMoreFailed()) {
      this.nextPage.reload();
      return;
    }
    const last = this.rows().at(-1);
    if (!last || !this.canLoadMore()) return;
    this.nextRequest.set({
      query: this.query(),
      includeNsfw: this.isNsfwShown(),
      after: last,
    });
  }

  /** Null while the names load. */
  private personName(id: string): string | null {
    if (!this.people.hasValue()) {
      return this.people.error() ? id : null;
    }
    const { characters, artists } = this.people.value();
    return (
      [...characters, ...artists].find((person) => person.id === id)?.name ??
      'Unknown person'
    );
  }
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

function sameQuery(a: GalleryQuery, b: GalleryQuery): boolean {
  return (
    JSON.stringify(galleryQueryToParams(a)) ===
    JSON.stringify(galleryQueryToParams(b))
  );
}
