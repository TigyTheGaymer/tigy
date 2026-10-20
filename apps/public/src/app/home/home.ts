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
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  galleryQueryFromParams,
  galleryQueryToParams,
  UNFILTERED_QUERY,
  type GalleryQuery,
} from '@tigy/gallery';
import { TIGY_ID } from '@tigy/models';
import { CatalogService } from '../catalog/catalog.service';
import { TopBar } from '../chrome/top-bar';
import { GalleryPlaceService } from '../gallery/gallery-place.service';
import { HeadService } from '../head/head.service';
import { injectServerResponse } from '../head/server-response';
import { Mark } from '../markings/mark';
import { Paw } from '../markings/paw';
import { Stripes } from '../markings/stripes';
import { NsfwSwitchService } from '../nsfw/nsfw-switch.service';
import { monthRange, pieceCount } from '../shared/format';
import { latest } from '../shared/resources';
import { avatarUrl } from '../shared/urls';
import { SocialLink } from '../social/social-link';
import { activeFilters } from './filter-row/active-filters';
import { FilterRow } from './filter-row/filter-row';
import { injectGalleryPages } from './gallery-pages';
import { TailTimeline } from './tail-timeline/tail-timeline';
import { toTile } from './tiles/tile';
import { Tiles } from './tiles/tiles';

/** Repeated query parameters arrive as a list. */
type QueryParam = string | string[] | undefined;

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
    { equal: isSameQuery },
  );

  /** Which gallery this is: its filters, sort and the NSFW switch. */
  private readonly key = computed(() =>
    JSON.stringify([galleryQueryToParams(this.query()), this.isNsfwShown()]),
  );

  protected readonly pages = injectGalleryPages({
    query: this.query,
    includeNsfw: this.isNsfwShown,
    key: this.key,
    restored: this.place.take(),
  });

  private readonly homeResource = this.catalog.home(this.isNsfwShown);
  protected readonly home = latest(this.homeResource);
  // Only needed to name person filters.
  private readonly people = this.catalog.people(() => {
    const { characterIds, artistIds } = this.query();
    return characterIds.length || artistIds.length
      ? this.isNsfwShown()
      : undefined;
  });

  protected readonly tiles = computed(() => this.pages.rows().map(toTile));
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
    const years = this.pages.first()?.years ?? [];
    return this.query().sort === 'oldest' ? [...years].reverse() : years;
  });

  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  private readonly tilesList = viewChild(Tiles);
  /** The piece the timeline asked for, until it is in view. Only DOM work reads it. */
  private travelTarget: number | undefined;
  private observer: IntersectionObserver | undefined;

  constructor() {
    inject(HeadService).siteCard();
    const response = injectServerResponse();
    effect(() => {
      if (this.pages.hasFailed() || this.hasHeaderFailed()) {
        response.unavailable();
      }
    });

    // For the artwork page's link back.
    effect(() => {
      const tree = this.router.createUrlTree(['/'], {
        queryParams: galleryQueryToParams(this.query()),
      });
      this.place.rememberAddress(this.router.serializeUrl(tree));
    });

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) this.pages.loadMore();
        },
        { rootMargin: '0px 0px 300px 0px' },
      );
      destroyRef.onDestroy(() => {
        this.observer?.disconnect();
        this.keepPlace();
      });
    });

    // A page that still leaves the end in view changes no intersection, so ask the observer
    // again after each page renders; and keep bringing the timeline's piece into view.
    afterRenderEffect(() => {
      this.pages.rows();
      const sentinel = this.sentinel()?.nativeElement;
      if (this.observer && sentinel) {
        this.observer.unobserve(sentinel);
        this.observer.observe(sentinel);
      }
      this.bringTargetIntoView();
    });
  }

  protected travel(index: number): void {
    this.travelTarget = index;
    this.bringTargetIntoView();
  }

  /** A piece not loaded yet: scrolling to the end makes the observer load the next page. */
  private bringTargetIntoView(): void {
    const target = this.travelTarget;
    if (target === undefined) return;
    if (this.tilesList()?.scrollToTile(target) || !this.pages.hasMore()) {
      this.travelTarget = undefined;
    } else {
      this.sentinel()?.nativeElement.scrollIntoView({ block: 'end' });
    }
  }

  private keepPlace(): void {
    const first = this.pages.first();
    if (!first) return;
    const target = this.router.currentNavigation()?.finalUrl;
    const isLeavingForArtwork =
      !!target && this.router.serializeUrl(target).startsWith('/i/');
    this.place.keep(
      { key: this.key(), first, more: this.pages.more() },
      isLeavingForArtwork,
    );
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

function isSameQuery(a: GalleryQuery, b: GalleryQuery): boolean {
  return (
    JSON.stringify(galleryQueryToParams(a)) ===
    JSON.stringify(galleryQueryToParams(b))
  );
}
