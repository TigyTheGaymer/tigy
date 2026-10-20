import { TestBed } from '@angular/core/testing';
import { rendered } from '../testing';
import {
  LOCAL_STORAGE,
  SafeStorage,
  SESSION_STORAGE,
  storedSignal,
} from './storage';

function stored() {
  return TestBed.runInInjectionContext(() =>
    storedSignal(SESSION_STORAGE, 'test.key', {
      initial: 'none',
      parse: (value) => value ?? 'none',
      serialize: (value) => (value === 'none' ? null : value),
    }),
  );
}

describe('storedSignal', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('holds the initial value until the first render, then the stored one', async () => {
    sessionStorage.setItem('test.key', 'kept');
    const value = stored();
    expect(value.value()).toBe('none');
    await rendered();
    expect(value.value()).toBe('kept');
  });

  it('stores what it is set to, and removes the entry for the empty value', () => {
    const value = stored();
    value.set('chosen');
    expect(value.value()).toBe('chosen');
    expect(sessionStorage.getItem('test.key')).toBe('chosen');
    value.set('none');
    expect(sessionStorage.getItem('test.key')).toBeNull();
  });

  it('A choice made before the first render: the render does not undo it', async () => {
    sessionStorage.setItem('test.key', 'kept');
    const value = stored();
    value.set('chosen');
    await rendered();
    expect(value.value()).toBe('chosen');
  });

  it('updates from the stored value even before the first render', () => {
    sessionStorage.setItem('test.key', 'kept');
    const value = stored();
    value.update((current) => `${current}+more`);
    expect(value.value()).toBe('kept+more');
  });
});

describe('SafeStorage', () => {
  it('Storage refused by the browser: reads nothing and never throws', () => {
    const refused = new SafeStorage(() => {
      throw new DOMException('Denied', 'SecurityError');
    });
    expect(refused.get('key')).toBeNull();
    expect(() => refused.set('key', 'value')).not.toThrow();
    expect(() => refused.remove('key')).not.toThrow();
  });

  it('defaults to the browser storage', () => {
    TestBed.configureTestingModule({});
    TestBed.inject(LOCAL_STORAGE).set('test.local', 'yes');
    expect(localStorage.getItem('test.local')).toBe('yes');
    localStorage.removeItem('test.local');
  });
});
