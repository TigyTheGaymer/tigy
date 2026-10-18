import type {
  GalleryRow,
  Image,
  PeopleEntry,
  Person,
  TagCounts,
  WithId,
} from '@tigy/models';
import { compareText } from '../shared/compare';
import { compareNewestFirst } from '../gallery-query/gallery-query';

/** The `meta/gallery` row of an image. Callers leave unpublished images out. */
export function toGalleryRow(image: WithId<Image>): GalleryRow {
  const row: GalleryRow = {
    id: image.id,
    sortDate: image.sortDate,
    w: image.file.w,
    h: image.file.h,
    nsfw: image.nsfw,
    artistIds: [...image.artistIds],
    characterIds: [...image.characterIds],
    tags: [...image.tags],
  };
  if (image.title) row.title = image.title;
  return row;
}

/** The `meta/people` entry of a person. */
export function toPeopleEntry(person: WithId<Person>): PeopleEntry {
  const entry: PeopleEntry = { id: person.id, name: person.name };
  if (person.avatar) entry.avatar = person.avatar;
  return entry;
}

/** The `items` of `meta/gallery`: a row for every published image, newest first. */
export function buildGalleryItems(images: readonly WithId<Image>[]): string {
  return JSON.stringify(
    images
      .filter((image) => image.published)
      .map(toGalleryRow)
      .sort(compareNewestFirst),
  );
}

/** The `items` of `meta/people`: an entry for every person, by ID. */
export function buildPeopleItems(people: readonly WithId<Person>[]): string {
  return JSON.stringify(
    people.map(toPeopleEntry).sort((a, b) => compareText(a.id, b.id)),
  );
}

/** The `counts` of `meta/tags`: every tag in use on any image, published or not. */
export function buildTagCounts(
  images: readonly Pick<Image, 'tags'>[],
): TagCounts {
  const counts = new Map<string, number>();
  for (const image of images) {
    for (const tag of new Set(image.tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Object.fromEntries(counts);
}

export function parseGalleryItems(items: string): GalleryRow[] {
  return JSON.parse(items) as GalleryRow[];
}

export function parsePeopleItems(items: string): PeopleEntry[] {
  return JSON.parse(items) as PeopleEntry[];
}

/** Adds, replaces or removes an image's row; `image` is the image after the write, or null when deleted. */
export function withGalleryRow(
  rows: readonly GalleryRow[],
  imageId: string,
  image: Image | null,
): GalleryRow[] {
  const others = rows.filter((row) => row.id !== imageId);
  if (!image?.published) return others;
  return [...others, toGalleryRow({ ...image, id: imageId })].sort(
    compareNewestFirst,
  );
}

/** Adds, replaces or removes a person's entry; `person` is the person after the write, or null when deleted. */
export function withPeopleEntry(
  entries: readonly PeopleEntry[],
  personId: string,
  person: Person | null,
): PeopleEntry[] {
  const others = entries.filter((entry) => entry.id !== personId);
  if (!person) return others;
  return [...others, toPeopleEntry({ ...person, id: personId })].sort((a, b) =>
    compareText(a.id, b.id),
  );
}

/**
 * Tag counts after an image's tags change from `before` to `after` (either empty for a create or a delete).
 * A tag whose count reaches 0 is removed.
 */
export function adjustTagCounts(
  counts: TagCounts,
  before: readonly string[],
  after: readonly string[],
): TagCounts {
  // A Map, so tags such as "constructor" never read inherited object properties.
  const result = new Map(Object.entries(counts));
  for (const tag of new Set(before)) {
    const count = (result.get(tag) ?? 0) - 1;
    if (count > 0) result.set(tag, count);
    else result.delete(tag);
  }
  for (const tag of new Set(after)) result.set(tag, (result.get(tag) ?? 0) + 1);
  return Object.fromEntries(result);
}
