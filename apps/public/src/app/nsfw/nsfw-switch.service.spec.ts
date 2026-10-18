import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NsfwSwitchService } from './nsfw-switch.service';

/** Runs the first-render callbacks. */
async function rendered(): Promise<void> {
  TestBed.inject(ApplicationRef).tick();
  await TestBed.inject(ApplicationRef).whenStable();
}

describe('NsfwSwitchService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => vi.restoreAllMocks());

  it('is off by default', async () => {
    const nsfwSwitch = TestBed.inject(NsfwSwitchService);
    await rendered();
    expect(nsfwSwitch.isOn()).toBe(false);
  });

  it('applies the stored choice only after the first render', async () => {
    localStorage.setItem('tigy.nsfw', '1');
    const nsfwSwitch = TestBed.inject(NsfwSwitchService);
    expect(nsfwSwitch.isOn()).toBe(false);
    await rendered();
    expect(nsfwSwitch.isOn()).toBe(true);
  });

  it('remembers turning it on and off', async () => {
    const nsfwSwitch = TestBed.inject(NsfwSwitchService);
    await rendered();
    nsfwSwitch.set(true);
    expect(nsfwSwitch.isOn()).toBe(true);
    expect(localStorage.getItem('tigy.nsfw')).toBe('1');
    nsfwSwitch.set(false);
    expect(localStorage.getItem('tigy.nsfw')).toBeNull();
  });

  it('still switches when the browser refuses storage', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const nsfwSwitch = TestBed.inject(NsfwSwitchService);
    await rendered();
    expect(nsfwSwitch.isOn()).toBe(false);
    nsfwSwitch.set(true);
    expect(nsfwSwitch.isOn()).toBe(true);
  });
});
