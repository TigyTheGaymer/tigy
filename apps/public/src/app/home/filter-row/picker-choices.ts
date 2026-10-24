import type { Params } from '@angular/router';
import { galleryQueryToParams, type GalleryQuery } from '@tigy/gallery';
import type { GalleryChoices, PickerPerson } from '../../../api/types';
import { avatarUrl } from '../../shared/urls';

export type PickerKind = 'characters' | 'artists' | 'tags' | 'years';

export interface PickerChoice {
  key: string;
  name: string;
  count: number;
  avatar?: string;
  isSelected: boolean;
  /** The gallery address with this choice toggled. */
  params: Params;
}

export type PickerChoices = Record<PickerKind, PickerChoice[]>;

interface Entry {
  key: string;
  name: string;
  count: number;
  avatar?: string;
}

/** Lists every active filter, even one no piece matches, so the visitor can always unpick it. */
export function pickerChoices(
  query: GalleryQuery,
  choices: GalleryChoices | undefined,
  /** Null while the names load. */
  personName: (id: string) => string | null,
): PickerChoices {
  const address = (change: Partial<GalleryQuery>) =>
    galleryQueryToParams({ ...query, ...change });
  const toggle = <T>(values: readonly T[], value: T) =>
    values.includes(value)
      ? values.filter((other) => other !== value)
      : [...values, value];
  const withActive = (
    entries: Entry[],
    active: readonly string[],
    nameOf: (key: string) => string,
  ): Entry[] => [
    ...entries,
    ...active
      .filter((key) => !entries.some((entry) => entry.key === key))
      .map((key) => ({ key, name: nameOf(key), count: 0 })),
  ];
  const people = (
    list: PickerPerson[] | undefined,
    active: readonly string[],
    field: 'characterIds' | 'artistIds',
  ) =>
    selectedFirst(
      withActive(
        (list ?? []).map((person) => ({
          key: person.id,
          name: person.name,
          count: person.count,
          ...(person.avatar && { avatar: avatarUrl(person.id) }),
        })),
        active,
        (id) => personName(id) ?? '…',
      ).map((entry) => ({
        ...entry,
        isSelected: active.includes(entry.key),
        params: address({ [field]: toggle(active, entry.key) }),
      })),
    );
  const years = withActive(
    (choices?.years ?? []).map(({ year, count }) => ({
      key: String(year),
      name: String(year),
      count,
    })),
    query.years.map(String),
    (year) => year,
  ).sort((a, b) => Number(b.key) - Number(a.key));
  // An active year the other filters leave empty adds nothing, and left alone it would empty the gallery.
  const keptYears = choices
    ? query.years.filter((year) => choices.years.some((m) => m.year === year))
    : query.years;
  return {
    characters: people(choices?.characters, query.characterIds, 'characterIds'),
    artists: people(choices?.artists, query.artistIds, 'artistIds'),
    tags: selectedFirst(
      withActive(
        (choices?.tags ?? []).map(({ value, count }) => ({
          key: value,
          name: value,
          count,
        })),
        query.tags,
        (tag) => tag,
      ).map((entry) => ({
        ...entry,
        isSelected: query.tags.includes(entry.key),
        params: address({ tags: toggle(query.tags, entry.key) }),
      })),
    ),
    // Newest first, selected or not: a year list reads as a timeline.
    years: years.map((entry) => {
      const year = Number(entry.key);
      const isSelected = query.years.includes(year);
      return {
        ...entry,
        isSelected,
        params: address({
          years: isSelected
            ? keptYears.filter((other) => other !== year)
            : [...keptYears, year],
        }),
      };
    }),
  };
}

export interface ListedChoice extends PickerChoice {
  /** False for a choice kept in its place after it stopped matching. */
  isAvailable: boolean;
}

/**
 * Keeps an open picker's order so nothing moves under the pointer: a choice that stops matching stays,
 * unavailable, and one that starts matching goes last.
 */
export function steadyChoices(
  opened: readonly PickerChoice[],
  current: readonly PickerChoice[],
): ListedChoice[] {
  const byKey = new Map(current.map((choice) => [choice.key, choice]));
  const openedKeys = new Set(opened.map((choice) => choice.key));
  return [
    ...opened.map((choice) => {
      const now = byKey.get(choice.key);
      return now
        ? { ...now, isAvailable: true }
        : { ...choice, count: 0, isSelected: false, isAvailable: false };
    }),
    ...current
      .filter((choice) => !openedKeys.has(choice.key))
      .map((choice) => ({ ...choice, isAvailable: true })),
  ];
}

function selectedFirst(choices: PickerChoice[]): PickerChoice[] {
  return [
    ...choices.filter((choice) => choice.isSelected),
    ...choices.filter((choice) => !choice.isSelected),
  ];
}
