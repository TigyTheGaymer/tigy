import { HttpErrorResponse } from '@angular/common/http';
import { signal, type ResourceSnapshot } from '@angular/core';
import type { ArtworkResponse } from '../../api/types';
import type { ArtworkRequest } from '../catalog/catalog.service';
import { artwork } from '../testing';
import { shownPiece } from './shown-piece';

type Snapshot = ResourceSnapshot<ArtworkResponse | undefined>;

const A = artwork({ id: 'a' });
const B = artwork({ id: 'b' });
const LOADING: Snapshot = { status: 'loading', value: undefined };
const failed = (status: number): Snapshot => ({
  status: 'error',
  error: new HttpErrorResponse({ status }),
});
const resolved = (value: ArtworkResponse): Snapshot => ({
  status: 'resolved',
  value,
});
const asking = (id: string, includeNsfw = false): ArtworkRequest => ({
  id,
  includeNsfw,
});

describe('shownPiece', () => {
  function setup(first: Snapshot, request: ArtworkRequest | undefined) {
    const snapshot = signal(first);
    const asked = signal(request);
    const { piece: shown, answered } = shownPiece(snapshot, asked);
    const move = (next: Snapshot, ...nextRequest: [ArtworkRequest?]) => {
      snapshot.set(next);
      if (nextRequest.length) asked.set(nextRequest[0]);
      answered();
      return shown();
    };
    return { shown, answered, move };
  }

  it('shows nothing while idle', () => {
    const { shown } = setup({ status: 'idle', value: undefined }, undefined);
    expect(shown()).toBeUndefined();
  });

  it('shows nothing while the first piece loads', () => {
    const { shown } = setup(LOADING, asking('a'));
    expect(shown()).toBeUndefined();
  });

  it('shows a resolved piece', () => {
    const { shown } = setup(resolved(A), asking('a'));
    expect(shown()).toBe(A);
  });

  it('shows a reloading value', () => {
    const { shown } = setup({ status: 'reloading', value: A }, asking('a'));
    expect(shown()).toBe(A);
  });

  it('keeps the previous piece while the next one loads, also when both change on one tick', () => {
    const { shown, move } = setup(resolved(A), asking('a'));
    expect(shown()).toBe(A);
    expect(move(LOADING, asking('b'))).toBe(A);
  });

  it('swaps to the new piece when it arrives', () => {
    const { shown, move } = setup(resolved(A), asking('a'));
    expect(shown()).toBe(A);
    move(LOADING, asking('b'));
    expect(move(resolved(B))).toBe(B);
  });

  it('shows a visited piece at once while it refreshes, then the fresh data', () => {
    const { shown, move } = setup(resolved(A), asking('a'));
    expect(shown()).toBe(A);
    move(LOADING, asking('b'));
    move(resolved(B));
    expect(move(LOADING, asking('a'))).toBe(A);
    const changed = artwork({ id: 'a', title: 'Changed' });
    expect(move(resolved(changed))).toBe(changed);
  });

  it('holds the last answer for files while a visited piece refreshes', () => {
    const { shown, answered, move } = setup(resolved(A), asking('a'));
    expect(shown()).toBe(A);
    move(LOADING, asking('b'));
    move(resolved(B));

    expect(move(LOADING, asking('a'))).toBe(A);
    expect(answered()).toBe(B);

    const flagged = artwork({ id: 'a', nsfw: true });
    expect(move(resolved(flagged))).toBe(flagged);
    expect(answered()).toBe(flagged);
  });

  it('empties when a visited piece fails to refresh', () => {
    const { shown, answered, move } = setup(resolved(A), asking('a'));
    expect(shown()).toBe(A);
    move(LOADING, asking('b'));
    move(resolved(B));
    move(LOADING, asking('a'));

    expect(move(failed(500))).toBeUndefined();
    expect(answered()).toBeUndefined();
  });

  it('keeps the visited pieces apart for the switch on and off', () => {
    const inclusive = artwork({ id: 'a' }, { next: { id: 'lewd' } });
    const { shown, move } = setup(resolved(A), asking('a'));
    expect(shown()).toBe(A);
    move(LOADING, asking('a', true));
    move(resolved(inclusive));
    expect(move(LOADING, asking('a'))).toBe(A);
    expect(move(LOADING, asking('a', true))).toBe(inclusive);
  });

  it('empties on a 404, and forgets that piece', () => {
    const { shown, move } = setup(resolved(A), asking('a'));
    expect(shown()).toBe(A);
    move(LOADING, asking('b'));
    move(resolved(B));
    move(LOADING, asking('a'));
    expect(move(failed(404))).toBeUndefined();
    move(LOADING, asking('b'));
    move(resolved(B));
    // Nothing remembered for this piece: it holds B until the piece arrives.
    expect(move(LOADING, asking('a'))).toBe(B);
  });

  it('empties when another piece fails', () => {
    const { shown, move } = setup(resolved(A), asking('a'));
    expect(shown()).toBe(A);
    move(LOADING, asking('b'));
    expect(move(failed(500))).toBeUndefined();
  });

  it('keeps the same piece when its reload fails', () => {
    const { shown, move } = setup(resolved(A), asking('a'));
    expect(shown()).toBe(A);
    move(LOADING, asking('a', true));
    expect(move(failed(500))).toBe(A);
  });

  it('empties when the request goes idle', () => {
    const { shown, move } = setup(resolved(A), asking('a'));
    expect(shown()).toBe(A);
    expect(move({ status: 'idle', value: undefined }, undefined)).toBe(
      undefined,
    );
  });
});
