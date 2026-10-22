import { TestBed } from '@angular/core/testing';
import { THEME_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => localStorage.clear());

  const theme = () => document.documentElement.dataset['theme'];

  it('follows the device until the owner chooses', () => {
    const service = TestBed.inject(ThemeService);
    TestBed.tick();
    expect(service.choice()).toBe('system');
    expect(theme()).toBe(service.theme());
  });

  it('applies and remembers a choice', () => {
    const service = TestBed.inject(ThemeService);
    service.choose('dark');
    TestBed.tick();
    expect(theme()).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    service.choose('light');
    TestBed.tick();
    expect(theme()).toBe('light');
  });

  it('forgets the choice when going back to the device setting', () => {
    const service = TestBed.inject(ThemeService);
    service.choose('dark');
    service.choose('system');
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it('starts from a remembered choice', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    expect(TestBed.inject(ThemeService).choice()).toBe('dark');
  });
});
