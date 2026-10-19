import { ApplicationRef, DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { nextTheme, ThemeService } from './theme.service';

/** Runs the first-render callbacks. */
async function rendered(): Promise<void> {
  TestBed.inject(ApplicationRef).tick();
  await TestBed.inject(ApplicationRef).whenStable();
}

describe('ThemeService', () => {
  let root: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    root = TestBed.inject(DOCUMENT).documentElement;
    delete root.dataset['theme'];
  });

  it('cycles Automatic, Light, Dark and back', () => {
    expect(nextTheme('auto')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('auto');
  });

  it('Automatic: follows the device when nothing was chosen', async () => {
    const theme = TestBed.inject(ThemeService);
    await rendered();
    expect(theme.theme()).toBe('auto');
    expect(root.dataset['theme']).toBeUndefined();
  });

  it('Choosing Dark: sets the page theme and remembers it', async () => {
    const theme = TestBed.inject(ThemeService);
    await rendered();
    theme.cycle();
    theme.cycle();
    expect(theme.theme()).toBe('dark');
    expect(root.dataset['theme']).toBe('dark');
    expect(localStorage.getItem('tigy.theme')).toBe('dark');

    theme.cycle();
    expect(root.dataset['theme']).toBeUndefined();
    expect(localStorage.getItem('tigy.theme')).toBeNull();
  });

  it('shows the stored choice once rendered', async () => {
    localStorage.setItem('tigy.theme', 'light');
    const theme = TestBed.inject(ThemeService);
    expect(theme.theme()).toBe('auto');
    await rendered();
    expect(theme.theme()).toBe('light');
  });
});
