import type { Image, Person, TagCounts, Upload, WithId } from '@tigy/models';
import type { User } from 'firebase/auth';
import type { UploadMetadata } from 'firebase/storage';
import type {
  ArtworksApi,
  BulkEdits,
  ImageEdits,
} from './artworks/artworks-api';
import type { AuthApi } from './firebase/firebase';
import type { PeopleApi, PersonEdits } from './people/people-api';
import type { UploadsApi } from './uploads/uploads-api';

// For the app's unit tests only.

export function fakeUser(
  claims: Record<string, unknown> = {},
  fields: Partial<User> = {},
): User {
  return {
    uid: 'someone',
    email: 'owner@tigy.test',
    displayName: 'Tigy Owner',
    photoURL: null,
    getIdTokenResult: async () => ({ claims }),
    ...fields,
  } as unknown as User;
}

export const OWNER = fakeUser({ owner: true });
export const NOT_OWNER = fakeUser({}, { email: 'stranger@example.com' });

/** Stands in for Firebase Auth: `emit` changes the user, and the first call also restores the session. */
export class FakeAuthApi implements AuthApi {
  private listener?: (user: User | null) => void;
  private current?: User | null;
  private markRestored!: () => void;
  private readonly restored = new Promise<void>(
    (resolve) => (this.markRestored = resolve),
  );
  signIn: () => Promise<User> = async () => OWNER;
  signOutCount = 0;

  authStateReady(): Promise<void> {
    return this.restored;
  }

  currentUser(): User | null {
    return this.current ?? null;
  }

  onIdTokenChanged(next: (user: User | null) => void) {
    this.listener = next;
    if (this.current !== undefined) next(this.current);
    return () => undefined;
  }

  emit(user: User | null): void {
    this.current = user;
    this.markRestored();
    this.listener?.(user);
  }

  signInWithGoogle(): Promise<User> {
    return this.signIn();
  }

  async signOut(): Promise<void> {
    this.signOutCount++;
    this.emit(null);
  }
}

export interface FakeUpload {
  path: string;
  metadata: UploadMetadata;
  progress(fraction: number): void;
  finish(): void;
  fail(): void;
}

export function record(
  id: string,
  fields: Partial<Upload> = {},
  createdAt = Date.now(),
): WithId<Upload> {
  const at = { toDate: () => new Date(createdAt) };
  return {
    id,
    fileName: `${id}.png`,
    bytes: 1000,
    status: 'processing',
    createdAt: at,
    updatedAt: at,
    ...fields,
  };
}

/** Stands in for Firestore and Storage; tests drive uploads and records by hand. */
export class FakeUploadsApi implements UploadsApi {
  private ids = 0;
  private watcher?: (records: WithId<Upload>[]) => void;
  readonly uploads: FakeUpload[] = [];
  readonly deleted: string[] = [];

  newId(): string {
    return `u${++this.ids}`;
  }

  upload(
    path: string,
    _file: Blob,
    metadata: UploadMetadata,
    onProgress: (fraction: number) => void,
  ) {
    let finish!: () => void;
    let fail!: () => void;
    const done = new Promise<void>((resolve, reject) => {
      finish = resolve;
      fail = () => reject(new Error('storage/unknown'));
    });
    this.uploads.push({ path, metadata, progress: onProgress, finish, fail });
    return { done, cancel: () => fail() };
  }

  watchUploads(_count: number, next: (records: WithId<Upload>[]) => void) {
    this.watcher = next;
    next([]);
    return () => (this.watcher = undefined);
  }

  /** Plays a snapshot of the upload records. */
  emit(records: WithId<Upload>[]): void {
    this.watcher?.(records);
  }

  async deleteRecord(uploadId: string): Promise<void> {
    this.deleted.push(uploadId);
  }
}

/** Waits for promise callbacks queued by the code under test. */
export const settle = () => new Promise((resolve) => setTimeout(resolve));

export function artwork(
  id: string,
  fields: Partial<Image> = {},
): WithId<Image> {
  const at = { toDate: () => new Date('2025-11-20T10:00:00Z') };
  return {
    id,
    sortDate: '2025-11-20',
    published: false,
    nsfw: false,
    artistIds: [],
    characterIds: [],
    tags: [],
    file: {
      original: `images/${id}/original.png`,
      w: 800,
      h: 600,
      bytes: 120_000,
      mime: 'image/png',
      animated: false,
      transparent: false,
    },
    createdAt: at,
    updatedAt: at,
    ...fields,
  };
}

/** Stands in for Firestore: keeps the artworks in memory and plays each change back as a snapshot. */
export class FakeArtworksApi implements ArtworksApi {
  private watcher?: (images: WithId<Image>[]) => void;
  private failer?: (error: Error) => void;
  readonly updates: { id: string; edits: ImageEdits }[] = [];
  readonly batches: { ids: string[]; edits: BulkEdits | 'delete' }[] = [];
  /** Makes the next write fail, as a lost connection would. */
  shouldFail = false;
  counts: TagCounts = {};

  constructor(public images: WithId<Image>[] = []) {}

  watchImages(
    next: (images: WithId<Image>[]) => void,
    error: (error: Error) => void,
  ) {
    this.watcher = next;
    this.failer = error;
    next(this.images);
    return () => (this.watcher = undefined);
  }

  emit(images: WithId<Image>[] = this.images): void {
    this.images = images;
    this.watcher?.(images);
  }

  fail(error = new Error('permission-denied')): void {
    this.failer?.(error);
  }

  async update(id: string, edits: ImageEdits): Promise<void> {
    this.check();
    this.updates.push({ id, edits });
    this.emit(this.images.map((i) => (i.id === id ? applyEdits(i, edits) : i)));
  }

  async updateMany(ids: readonly string[], edits: BulkEdits): Promise<void> {
    this.check();
    this.batches.push({ ids: [...ids], edits });
    this.emit(
      this.images.map((i) => (ids.includes(i.id) ? applyEdits(i, edits) : i)),
    );
  }

  async deleteMany(ids: readonly string[]): Promise<void> {
    this.check();
    this.batches.push({ ids: [...ids], edits: 'delete' });
    this.emit(this.images.filter((i) => !ids.includes(i.id)));
  }

  async tagCounts(): Promise<TagCounts> {
    return this.counts;
  }

  private check(): void {
    if (!this.shouldFail) return;
    this.shouldFail = false;
    throw new Error('unavailable');
  }
}

function applyEdits(image: WithId<Image>, edits: ImageEdits): WithId<Image> {
  const result: Record<string, unknown> = { ...image };
  for (const [key, value] of Object.entries(edits)) {
    if (value === null) delete result[key];
    else result[key] = value;
  }
  return result as unknown as WithId<Image>;
}

/** Answers every question the admin asks with `answer`, and remembers the questions. */
export class FakeConfirmService {
  readonly asked: { title: string; description?: string }[] = [];
  constructor(public answer = true) {}

  async ask(question: { title: string; description?: string }) {
    this.asked.push(question);
    return this.answer;
  }
}

/** An element's text, one space between elements, as a reader would see it. */
export function text(element: Element | null | undefined): string {
  if (!element) return '';
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? '');
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

export function person(
  id: string,
  fields: Partial<Person> = {},
): WithId<Person> {
  const at = { toDate: () => new Date('2025-11-20T10:00:00Z') };
  return { id, name: id, links: [], createdAt: at, updatedAt: at, ...fields };
}

/** Stands in for Firestore and Storage: keeps people in memory and plays each change back. */
export class FakePeopleApi implements PeopleApi {
  private watcher?: (people: WithId<Person>[]) => void;
  private ids = 0;
  readonly updates: { id: string; edits: PersonEdits }[] = [];
  readonly avatars = new Map<string, Blob>();
  readonly deletedAvatars: string[] = [];
  shouldFail = false;

  constructor(public people: WithId<Person>[] = []) {}

  watchPeople(next: (people: WithId<Person>[]) => void) {
    this.watcher = next;
    next(this.people);
    return () => (this.watcher = undefined);
  }

  emit(people: WithId<Person>[] = this.people): void {
    this.people = people;
    this.watcher?.(people);
  }

  async create(name: string): Promise<string> {
    this.check();
    const id = `new${++this.ids}`;
    this.emit([...this.people, person(id, { name })]);
    return id;
  }

  async update(id: string, edits: PersonEdits): Promise<void> {
    this.check();
    this.updates.push({ id, edits });
    this.emit(
      this.people.map((p) => {
        if (p.id !== id) return p;
        const result: Record<string, unknown> = { ...p };
        for (const [key, value] of Object.entries(edits)) {
          if (value === null) delete result[key];
          else result[key] = value;
        }
        return result as unknown as WithId<Person>;
      }),
    );
  }

  async uploadAvatar(id: string, webp: Blob): Promise<void> {
    this.check();
    this.avatars.set(id, webp);
  }

  async deleteAvatar(id: string): Promise<void> {
    this.check();
    this.deletedAvatars.push(id);
  }

  private check(): void {
    if (!this.shouldFail) return;
    this.shouldFail = false;
    throw new Error('unavailable');
  }
}
