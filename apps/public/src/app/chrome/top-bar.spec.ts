import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TopBar } from './top-bar';

describe('TopBar', () => {
  it('offers the logo, the theme button and the NSFW switch, off by default', async () => {
    TestBed.configureTestingModule({
      imports: [TopBar],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(TopBar);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.logo')?.getAttribute('href')).toBe('/');
    expect(
      element.querySelector('.theme-btn')?.getAttribute('aria-label'),
    ).toContain('Theme: Automatic');
    const toggle = element.querySelector<HTMLInputElement>(
      '.switch input[role="switch"]',
    );
    expect(element.querySelector('.switch')?.textContent).toContain(
      'Show NSFW',
    );
    expect(toggle?.checked).toBe(false);
  });
});
