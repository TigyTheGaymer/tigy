import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmedPiecesService } from './confirmed-pieces.service';

/** Runs the first-render callbacks. */
async function rendered(): Promise<void> {
  TestBed.inject(ApplicationRef).tick();
  await TestBed.inject(ApplicationRef).whenStable();
}

describe('ConfirmedPiecesService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('remembers a confirmed piece for the browser session', async () => {
    const confirmed = TestBed.inject(ConfirmedPiecesService);
    await rendered();
    confirmed.add('lewd');
    expect(confirmed.has('lewd')).toBe(true);
    expect(confirmed.has('other')).toBe(false);
    expect(JSON.parse(sessionStorage.getItem('tigy.nsfw.confirmed')!)).toEqual([
      'lewd',
    ]);
  });

  it('reads the pieces confirmed earlier in the session after the first render', async () => {
    sessionStorage.setItem('tigy.nsfw.confirmed', '["lewd"]');
    const confirmed = TestBed.inject(ConfirmedPiecesService);
    expect(confirmed.has('lewd')).toBe(false);
    await rendered();
    expect(confirmed.has('lewd')).toBe(true);
  });

  it('ignores a damaged entry', async () => {
    sessionStorage.setItem('tigy.nsfw.confirmed', '{not json');
    const confirmed = TestBed.inject(ConfirmedPiecesService);
    await rendered();
    expect(confirmed.has('lewd')).toBe(false);
  });
});
