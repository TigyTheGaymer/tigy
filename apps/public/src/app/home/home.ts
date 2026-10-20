import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  galleryQueryFromParams,
  galleryQueryToParams,
  UNFILTERED_QUERY,
  type GalleryQuery,
} from '@tigy/gallery';
import { TIGY_ID, type GalleryRow } from '@tigy/models';
import type { GalleryResponse } from '../../api/types';
import {
  CatalogService,
  type GalleryRequest,
} from '../catalog/catalog.service';
import { TopBar } from '../chrome/top-bar';
import { monthRange, pieceCount } from '../format';
import { GalleryPlaceService } from '../gallery/gallery-place.service';
import { HeadService } from '../head/head.service';
import { Mark } from '../markings/mark';
import { Paw } from '../markings/paw';
import { Stripes } from '../markings/stripes';
import { NsfwSwitchService } from '../nsfw/nsfw-switch.service';
import { latest } from '../resources';
import { injectServerResponse } from '../server-response';
import { SocialLink } from '../social/social-link';
import { avatarUrl } from '../urls';
import { activeFilters } from './filter-row/active-filters';
import { FilterRow } from './filter-row/filter-row';
import { TailTimeline } from './tail-timeline/tail-timeline';
import { toTile } from './tiles/tile';
import { Tiles } from './tiles/tiles';

/** Repeated query parameters arrive as a list. */
type QueryParam = string | string[] | undefined;

interface MorePages {
  rows: GalleryRow[];
  hasMore?: boolean;
}

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    TopBar,
    Mark,
    Paw,
    Stripes,
    SocialLink,
    FilterRow,
    Tiles,
    TailTimeline,
  ],
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
  private readonly place = inject(GalleryPlaceService);
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

  /** Which gallery this is: its filters, sort and the NSFW switch. */
  private readonly key = computed(() =>
    JSON.stringify([galleryQueryToParams(this.query()), this.isNsfwShown()]),
  );

  private readonly restored = this.place.take();
  private readonly isRestored = computed(
    () => this.restored?.key === this.key(),
  );

  private readonly homeResource = this.catalog.home(this.isNsfwShown);
  private readonly firstPage = this.catalog.gallery(() =>
    this.isRestored()
      ? undefined
      : { query: this.query(), includeNsfw: this.isNsfwShown() },
  );
  // Only needed to name person filters.
  private readonly people = this.catalog.people(() => {
    const { characterIds, artistIds } = this.query();
    return characterIds.length || artistIds.length
      ? this.isNsfwShown()
      : undefined;
  });

  protected readonly home = latest(this.homeResource);

  /** The first page; the last one stays while another loads, so a swap never empties the page. */
  protected readonly gallery = linkedSignal<
    GalleryResponse | undefined,
    GalleryResponse | undefined
  >({
    source: () =>
      this.isRestored()
        ? this.restored?.first
        : this.firstPage.hasValue()
          ? this.firstPage.value()
          : undefined,
    computation: (value, previous) => value ?? previous?.value,
  });

  /** Cleared when the gallery changes. */
  private readonly nextRequest = linkedSignal<
    string,
    GalleryRequest | undefined
  >({ source: this.key, computation: () => undefined });
  private readonly nextPage = this.catalog.gallery(this.nextRequest);

  private readonly more = linkedSignal<
    { key: string; page: GalleryResponse | undefined },
    MorePages
  >({
    source: () => ({
      key: this.key(),
      page: this.nextPage.hasValue() ? this.nextPage.value() : undefined,
    }),
    computation: ({ key, page }, previous) => {
      if (!previous) {
        return this.isRestored() && this.restored
          ? this.restored.more
          : { rows: [] };
      }
      if (previous.source.key !== key) return { rows: [] };
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
  protected readonly tiles = computed(() => this.rows().map(toTile));
  protected readonly hasMore = computed(
    () => this.more().hasMore ?? this.gallery()?.hasMore ?? false,
  );
  protected readonly isLoadingMore = this.nextPage.isLoading;
  protected readonly hasLoadMoreFailed = computed(
    () => this.nextPage.error() !== undefined,
  );
  // A new first page is on its way: more pages would continue the old one.
  private readonly canLoadMore = computed(
    () =>
      this.hasMore() &&
      !this.isLoadingMore() &&
      !this.hasLoadMoreFailed() &&
      !this.firstPage.isLoading(),
  );
  protected readonly hasGalleryFailed = computed(
    () => this.firstPage.error() !== undefined && !this.gallery(),
  );
  private readonly hasHeaderFailed = computed(
    () => this.homeResource.error() !== undefined && !this.home(),
  );

  protected readonly ownerName = computed(
    () => this.home()?.owner?.name ?? 'Tigy',
  );
  protected readonly ownerAvatar = computed(() =>
    this.home()?.owner?.avatar ? avatarUrl(TIGY_ID) : null,
  );
  protected readonly socialLinks = computed(
    () => this.home()?.owner?.links ?? [],
  );
  protected readonly overview = computed(() => {
    const home = this.home();
    if (!home?.count || !home.oldest || !home.newest) return null;
    return `${pieceCount(home.count)} · ${monthRange(home.oldest, home.newest)}`;
  });

  protected readonly filters = computed(() =>
    activeFilters(this.query(), (id) => this.personName(id)),
  );
  protected readonly otherSortParams = computed(() =>
    galleryQueryToParams({
      ...this.query(),
      sort: this.query().sort === 'newest' ? 'oldest' : 'newest',
    }),
  );
  protected readonly cleared = computed(() =>
    galleryQueryToParams({ ...UNFILTERED_QUERY, sort: this.query().sort }),
  );

  /** Year marks in gallery order. */
  protected readonly years = computed(() => {
    const years = this.gallery()?.years ?? [];
    return this.query().sort === 'oldest' ? [...years].reverse() : years;
  });

  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  private readonly tilesList = viewChild(Tiles);
  private readonly isNearEnd = signal(false);
  /** The piece the timeline asked for, until it is in view. */
  private readonly travelTarget = signal<number | undefined>(undefined);

  constructor() {
    inject(HeadService).siteCard();
    const response = injectServerResponse();
    effect(() => {
      if (this.hasGalleryFailed() || this.hasHeaderFailed()) {
        response.unavailable();
      }
    });

    // The next page loads by itself once the end of the gallery is near, and
    // keeps loading while the timeline's chosen piece is not there yet.
    effect(() => {
      const target = this.travelTarget();
      const isWanted =
        this.isNearEnd() ||
        (target !== undefined && target >= this.rows().length);
      if (isWanted && this.canLoadMore()) this.loadMore();
    });

    afterRenderEffect(() => {
      const target = this.travelTarget();
      if (target === undefined) return;
      if (this.tilesList()?.scrollToTile(target) || !this.hasMore()) {
        this.travelTarget.set(undefined);
      }
    });

    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      // For the artwork page's link back.
      effect(() => {
        const tree = this.router.createUrlTree(['/'], {
          queryParams: galleryQueryToParams(this.query()),
        });
        this.place.rememberAddress(this.router.serializeUrl(tree));
      });

      const destroyRef = inject(DestroyRef);
      afterNextRender(() => {
        const sentinel = this.sentinel()?.nativeElement;
        if (!sentinel || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(
          ([entry]) => this.isNearEnd.set(entry.isIntersecting),
          { rootMargin: '0px 0px 300px 0px' },
        );
        observer.observe(sentinel);
        destroyRef.onDestroy(() => observer.disconnect());
      });

      destroyRef.onDestroy(() => {
        const first = this.gallery();
        if (!first) return;
        const target = this.router.currentNavigation()?.finalUrl;
        const isLeavingForArtwork =
          !!target && this.router.serializeUrl(target).startsWith('/i/');
        this.place.keep(
          { key: this.key(), first, more: this.more() },
          isLeavingForArtwork,
        );
      });
    }
  }

  protected travel(index: number): void {
    this.travelTarget.set(index);
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

function sameQuery(a: GalleryQuery, b: GalleryQuery): boolean {
  return (
    JSON.stringify(galleryQueryToParams(a)) ===
    JSON.stringify(galleryQueryToParams(b))
  );
}
