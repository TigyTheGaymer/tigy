import {
  computed,
  inject,
  resource,
  Service,
  signal,
  type ResourceStreamItem,
  type Signal,
} from '@angular/core';
import type { Image, WithId } from '@tigy/models';
import { ARTWORKS_API, type BulkEdits, type ImageEdits } from './artworks-api';

export type Artwork = WithId<Image>;

export const ARTWORK_VIEWS = [
  'all',
  'unpublished',
  'sfw',
  'nsfw',
  'needs-work',
] as const;

export type ArtworkView = (typeof ARTWORK_VIEWS)[number];

export type Gap = 'artist' | 'title' | 'date';

export interface ArtworkCounts {
  sfw: number;
  nsfw: number;
  unpublished: number;
  needsWork: number;
}

/** A view from the address; anything else is All. */
export function parseView(value: string | null | undefined): ArtworkView {
  return ARTWORK_VIEWS.find((view) => view === value) ?? 'all';
}

/** What an artwork still lacks; characters and tags are optional. */
export function missing(image: Image): Gap[] {
  const gaps: Gap[] = [];
  if (!image.artistIds?.length) gaps.push('artist');
  if (!image.title) gaps.push('title');
  if (!image.date) gaps.push('date');
  return gaps;
}

export function isInView(image: Image, view: ArtworkView): boolean {
  switch (view) {
    case 'all':
      return true;
    case 'unpublished':
      return !image.published;
    case 'sfw':
      return image.published && !image.nsfw;
    case 'nsfw':
      return image.published && image.nsfw;
    case 'needs-work':
      return missing(image).length > 0;
  }
}

export function matchesSearch(image: Image, search: string): boolean {
  const text = search.trim().toLowerCase();
  return !text || (image.title ?? '').toLowerCase().includes(text);
}

/** The gallery's order: newest sort date first, then the ID, also descending. */
export function compareArtworks(a: Artwork, b: Artwork): number {
  if (a.sortDate !== b.sortDate) return a.sortDate < b.sortDate ? 1 : -1;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

export function countArtworks(artworks: readonly Image[]): ArtworkCounts {
  const counts = { sfw: 0, nsfw: 0, unpublished: 0, needsWork: 0 };
  for (const image of artworks) {
    if (!image.published) counts.unpublished++;
    else if (image.nsfw) counts.nsfw++;
    else counts.sfw++;
    if (missing(image).length) counts.needsWork++;
  }
  return counts;
}

/** Every artwork, live, shared by the admin's pages; loaded once while the admin is open. */
@Service()
export class ArtworksService {
  private readonly api = inject(ARTWORKS_API);

  private readonly live = resource({
    defaultValue: [],
    stream: async ({ abortSignal }) => {
      const images = signal<ResourceStreamItem<Artwork[]>>({ value: [] });
      let markLoaded!: () => void;
      const loaded = new Promise<void>((resolve) => (markLoaded = resolve));
      const stop = this.api.watchImages(
        (value) => {
          images.set({ value: [...value].sort(compareArtworks) });
          markLoaded();
        },
        (error) => {
          images.set({ error });
          markLoaded();
        },
      );
      abortSignal.addEventListener('abort', stop);
      // Until the first snapshot the list is loading, not empty.
      await loaded;
      return images;
    },
  });

  readonly artworks: Signal<Artwork[]> = computed(() =>
    this.live.hasValue() ? this.live.value() : [],
  );
  readonly isLoading = this.live.isLoading;
  readonly error = this.live.error;
  readonly counts = computed(() => countArtworks(this.artworks()));

  filtered(view: () => ArtworkView, search: () => string): Signal<Artwork[]> {
    return computed(() =>
      this.artworks().filter(
        (image) => isInView(image, view()) && matchesSearch(image, search()),
      ),
    );
  }

  byId(id: () => string): Signal<Artwork | undefined> {
    return computed(() => this.artworks().find((image) => image.id === id()));
  }

  update(id: string, edits: ImageEdits): Promise<void> {
    return this.api.update(id, edits);
  }

  updateMany(ids: readonly string[], edits: BulkEdits): Promise<void> {
    return this.api.updateMany(ids, edits);
  }

  delete(ids: readonly string[]): Promise<void> {
    return this.api.deleteMany(ids);
  }

  tagCounts() {
    return this.api.tagCounts();
  }
}
