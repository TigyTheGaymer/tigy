import { parseGalleryItems, parsePeopleItems } from '@tigy/gallery';
import {
  META_GALLERY_DOC,
  META_PEOPLE_DOC,
  type GalleryRow,
  type PeopleEntry,
} from '@tigy/models';

/** Reads a summary document's `items` text, or null when it does not exist. */
export type LoadItems = (path: string) => Promise<string | null>;

/** Pages are CDN-cached for 5 minutes, so the summaries may be as old. */
export const SUMMARY_MAX_AGE_MS = 5 * 60 * 1000;

interface Entry {
  loadedAt: number;
  value: Promise<unknown[]>;
}

/**
 * Keeps the parsed `meta/gallery` and `meta/people` in memory for at most
 * `maxAgeMs` (design D5), so later pages and filter changes cost no Firestore
 * reads. Each summary is read only when first asked for; requests that arrive
 * while it loads share that one read, and a failed read is not kept.
 */
export class SummaryCache {
  private readonly entries = new Map<string, Entry>();

  constructor(
    private readonly loadItems: LoadItems,
    private readonly maxAgeMs = SUMMARY_MAX_AGE_MS,
    private readonly now: () => number = Date.now,
  ) {}

  gallery(): Promise<GalleryRow[]> {
    return this.get(META_GALLERY_DOC, parseGalleryItems);
  }

  people(): Promise<PeopleEntry[]> {
    return this.get(META_PEOPLE_DOC, parsePeopleItems);
  }

  private get<T>(path: string, parse: (items: string) => T[]): Promise<T[]> {
    const cached = this.entries.get(path);
    if (cached && this.now() - cached.loadedAt < this.maxAgeMs) {
      return cached.value as Promise<T[]>;
    }
    const value = this.loadItems(path).then((items) =>
      items === null ? [] : parse(items),
    );
    const entry: Entry = { loadedAt: this.now(), value };
    this.entries.set(path, entry);
    value.catch(() => {
      if (this.entries.get(path) === entry) this.entries.delete(path);
    });
    return value;
  }
}
