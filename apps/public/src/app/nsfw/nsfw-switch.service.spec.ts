import { TestBed } from '@angular/core/testing';
import { rendered } from '../testing';
import { AgeCheckService } from './age-check.service';
import { NsfwSwitchService } from './nsfw-switch.service';

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
    localStorage.setItem('tigy.nsfw.age', '1');
    const nsfwSwitch = TestBed.inject(NsfwSwitchService);
    expect(nsfwSwitch.isOn()).toBe(false);
    await rendered();
    expect(nsfwSwitch.isOn()).toBe(true);
  });

  it('stays off when stored on without a passed age check', async () => {
    localStorage.setItem('tigy.nsfw', '1');
    const nsfwSwitch = TestBed.inject(NsfwSwitchService);
    await rendered();
    expect(nsfwSwitch.isOn()).toBe(false);
  });

  it('turns on only once the age check passes', async () => {
    const nsfwSwitch = TestBed.inject(NsfwSwitchService);
    const ageCheck = TestBed.inject(AgeCheckService);
    await rendered();
    nsfwSwitch.set(true);
    expect(nsfwSwitch.isOn()).toBe(false);
    expect(ageCheck.isPending()).toBe(true);
    expect(localStorage.getItem('tigy.nsfw')).toBeNull();

    ageCheck.pass();
    expect(nsfwSwitch.isOn()).toBe(true);
    expect(localStorage.getItem('tigy.nsfw')).toBe('1');
  });

  it('remembers turning it on and off, and turning off never asks', async () => {
    localStorage.setItem('tigy.nsfw.age', '1');
    const nsfwSwitch = TestBed.inject(NsfwSwitchService);
    const ageCheck = TestBed.inject(AgeCheckService);
    await rendered();
    nsfwSwitch.set(true);
    expect(nsfwSwitch.isOn()).toBe(true);
    expect(localStorage.getItem('tigy.nsfw')).toBe('1');
    nsfwSwitch.set(false);
    expect(localStorage.getItem('tigy.nsfw')).toBeNull();
    expect(ageCheck.isPending()).toBe(false);
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
    TestBed.inject(AgeCheckService).pass();
    expect(nsfwSwitch.isOn()).toBe(true);
  });
});
