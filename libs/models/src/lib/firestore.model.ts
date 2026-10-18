/** A Firestore timestamp from either the Admin or the client SDK. */
export interface TimestampLike {
  toDate(): Date;
}

export type WithId<T> = T & { id: string };
