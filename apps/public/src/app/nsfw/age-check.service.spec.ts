import { TestBed } from '@angular/core/testing';
import { rendered } from '../testing';
import { AgeCheckService, isAdult } from './age-check.service';

describe('isAdult', () => {
  const today = new Date(2026, 9, 24);

  it('passes on the 18th birthday and fails the day before', () => {
    expect(isAdult('2008-10-24', today)).toBe(true);
    expect(isAdult('2008-10-25', today)).toBe(false);
    expect(isAdult('1990-01-01', today)).toBe(true);
  });

  it('lets a 29 February birthday turn 18 on 1 March in a non-leap year', () => {
    expect(isAdult('2008-02-29', new Date(2026, 1, 28))).toBe(false);
    expect(isAdult('2008-02-29', new Date(2026, 2, 1))).toBe(true);
  });

  it('fails empty, malformed, impossible and future dates', () => {
    expect(isAdult('', today)).toBe(false);
    expect(isAdult('24.10.2000', today)).toBe(false);
    expect(isAdult('2000-02-30', today)).toBe(false);
    expect(isAdult('2030-01-01', today)).toBe(false);
  });
});

describe('AgeCheckService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => vi.restoreAllMocks());

  it('runs the action at once once the check passed', async () => {
    localStorage.setItem('tigy.nsfw.age', '1');
    const ageCheck = TestBed.inject(AgeCheckService);
    await rendered();
    const then = vi.fn();
    ageCheck.confirm(then);
    expect(then).toHaveBeenCalledOnce();
    expect(ageCheck.isPending()).toBe(false);
  });

  it('waits for the check, then stores only that it passed and runs the action once', async () => {
    const ageCheck = TestBed.inject(AgeCheckService);
    await rendered();
    const then = vi.fn();
    ageCheck.confirm(then);
    expect(then).not.toHaveBeenCalled();
    expect(ageCheck.isPending()).toBe(true);

    ageCheck.pass();
    expect(then).toHaveBeenCalledOnce();
    expect(ageCheck.isPending()).toBe(false);
    expect(ageCheck.isPassed()).toBe(true);
    expect({ ...localStorage }).toEqual({ 'tigy.nsfw.age': '1' });
    ageCheck.pass();
    expect(then).toHaveBeenCalledOnce();
  });

  it('dismissing runs nothing and stores nothing', async () => {
    const ageCheck = TestBed.inject(AgeCheckService);
    await rendered();
    const then = vi.fn();
    ageCheck.confirm(then);
    ageCheck.dismiss();
    expect(then).not.toHaveBeenCalled();
    expect(ageCheck.isPending()).toBe(false);
    expect(localStorage.length).toBe(0);
  });

  it('still passes in memory when the browser refuses storage', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const ageCheck = TestBed.inject(AgeCheckService);
    await rendered();
    const then = vi.fn();
    ageCheck.confirm(then);
    ageCheck.pass();
    expect(then).toHaveBeenCalledOnce();
    expect(ageCheck.isPassed()).toBe(true);
  });
});
