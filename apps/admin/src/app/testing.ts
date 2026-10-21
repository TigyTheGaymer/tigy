import type { Upload, WithId } from '@tigy/models';
import type { User } from 'firebase/auth';
import type { UploadMetadata } from 'firebase/storage';
import type { AuthApi } from './firebase/firebase';
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

  async thumbnailUrl(imageId: string): Promise<string> {
    return `data:image/gif;base64,R0lGODlhAQABAAAAACw=#${imageId}`;
  }
}

/** Waits for promise callbacks queued by the code under test. */
export const settle = () => new Promise((resolve) => setTimeout(resolve));
