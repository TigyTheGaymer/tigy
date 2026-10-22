import {
  computed,
  inject,
  resource,
  Service,
  signal,
  type ResourceStreamItem,
  type Signal,
} from '@angular/core';
import { TIGY_ID, type Person, type WithId } from '@tigy/models';
import { storageUrl } from '../firebase/storage-url';
import { ArtworksService } from '../artworks/artworks.service';
import { PEOPLE_API, type PersonEdits } from './people-api';

export type PersonEntry = WithId<Person>;

/** Tigy first, then by name, ignoring case and accents: an admin-only order. */
export function comparePeople(a: PersonEntry, b: PersonEntry): number {
  if (a.id === TIGY_ID || b.id === TIGY_ID) {
    return a.id === TIGY_ID ? (b.id === TIGY_ID ? 0 : -1) : 1;
  }
  return (
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) ||
    (a.id < b.id ? -1 : 1)
  );
}

/** Lowercase, without accents, for matching typed names. */
export function foldName(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export function matchesName(person: Person, search: string): boolean {
  return foldName(person.name).includes(foldName(search));
}

/** The address of a person's avatar; the update time keeps a replaced one from showing from the cache. */
export function avatarUrl(person: Person): string | undefined {
  if (!person.avatar) return undefined;
  const version = person.updatedAt?.toDate().getTime() ?? 0;
  return `${storageUrl(person.avatar)}&v=${version}`;
}

/** Every person, live, shared by the admin's pages. */
@Service()
export class PeopleService {
  private readonly api = inject(PEOPLE_API);
  private readonly artworks = inject(ArtworksService);

  private readonly live = resource({
    defaultValue: [],
    stream: async ({ abortSignal }) => {
      const people = signal<ResourceStreamItem<PersonEntry[]>>({ value: [] });
      let markLoaded!: () => void;
      const loaded = new Promise<void>((resolve) => (markLoaded = resolve));
      const stop = this.api.watchPeople(
        (value) => {
          people.set({ value: [...value].sort(comparePeople) });
          markLoaded();
        },
        (error) => {
          people.set({ error });
          markLoaded();
        },
      );
      abortSignal.addEventListener('abort', stop);
      await loaded;
      return people;
    },
  });

  readonly people: Signal<PersonEntry[]> = computed(() =>
    this.live.hasValue() ? this.live.value() : [],
  );
  readonly isLoading = this.live.isLoading;
  readonly error = this.live.error;

  /** How many artworks, published or not, credit each person as an artist or a character. */
  readonly creditCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const image of this.artworks.artworks()) {
      const ids = new Set([...image.artistIds, ...image.characterIds]);
      for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  });

  readonly byId = computed(
    () => new Map(this.people().map((person) => [person.id, person])),
  );

  matching(search: () => string): Signal<PersonEntry[]> {
    return computed(() =>
      this.people().filter((person) => matchesName(person, search())),
    );
  }

  create(name: string): Promise<string> {
    return this.api.create(name.trim());
  }

  update(id: string, edits: PersonEdits): Promise<void> {
    return this.api.update(id, edits);
  }

  uploadAvatar(id: string, webp: Blob): Promise<void> {
    return this.api.uploadAvatar(id, webp);
  }

  deleteAvatar(id: string): Promise<void> {
    return this.api.deleteAvatar(id);
  }
}
