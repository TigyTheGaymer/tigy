import {
  computed,
  linkedSignal,
  type ResourceSnapshot,
  type Signal,
} from '@angular/core';
import type { ArtworkResponse } from '../../api/types';
import { isNotFound, type ArtworkRequest } from '../catalog/catalog.service';

interface ShownState {
  piece?: ArtworkResponse;
  answered?: ArtworkResponse;
  visited: ReadonlyMap<string, ArtworkResponse>;
}

export interface ShownPiece {
  /** The piece's details: the requested one once it is known, else the one before it. */
  piece: Signal<ArtworkResponse | undefined>;
  /** The last piece the server answered with. A remembered one may be stale, so files wait for this. */
  answered: Signal<ArtworkResponse | undefined>;
}

export function shownPiece(
  snapshot: () => ResourceSnapshot<ArtworkResponse | undefined>,
  request: () => ArtworkRequest | undefined,
): ShownPiece {
  const state = linkedSignal<
    {
      snapshot: ResourceSnapshot<ArtworkResponse | undefined>;
      request: ArtworkRequest | undefined;
    },
    ShownState
  >({
    source: () => ({ snapshot: snapshot(), request: request() }),
    computation: (source, previous) =>
      nextState(
        source.snapshot,
        source.request,
        previous?.value ?? { visited: new Map() },
      ),
  });
  return {
    piece: computed(() => state().piece),
    answered: computed(() => state().answered),
  };
}

function nextState(
  snapshot: ResourceSnapshot<ArtworkResponse | undefined>,
  request: ArtworkRequest | undefined,
  state: ShownState,
): ShownState {
  if (!request) return { visited: state.visited };
  const key = visitedKey(request);
  if (snapshot.status === 'error') {
    if (isNotFound(snapshot.error)) {
      const visited = new Map(state.visited);
      visited.delete(key);
      return { visited };
    }
    return state.answered?.artwork.id === request.id
      ? {
          piece: state.answered,
          answered: state.answered,
          visited: state.visited,
        }
      : { visited: state.visited };
  }
  if (snapshot.value) {
    return {
      piece: snapshot.value,
      answered: snapshot.value,
      visited: new Map(state.visited).set(key, snapshot.value),
    };
  }
  return {
    piece: state.visited.get(key) ?? state.piece,
    answered: state.answered,
    visited: state.visited,
  };
}

// Firestore IDs never contain a slash.
function visitedKey({ id, includeNsfw }: ArtworkRequest): string {
  return `${id}/${includeNsfw}`;
}
