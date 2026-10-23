import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { appRoutes } from '../app.routes';

describe('PrivacyPage', () => {
  let page: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(appRoutes)] });
    const harness = await RouterTestingHarness.create('/privacy');
    page = harness.routeNativeElement as HTMLElement;
  });

  const meta = (selector: string) =>
    TestBed.inject(DOCUMENT)
      .head.querySelector(`meta[${selector}]`)
      ?.getAttribute('content');

  it('Link to the privacy page: carries only the site card', () => {
    expect(meta('property="og:title"')).toBe('Tigy');
    expect(meta('property="og:description"')).toBe('Tigy');
    expect(meta('name="twitter:card"')).toBe('summary');
    expect(meta('property="og:image"')).toMatch(/\/avatars\/tigy\.webp$/);
  });

  it('Reading the privacy page: names the operator and contact, the logs and every stored value', () => {
    const text = page.textContent?.replace(/\s+/g, ' ');
    expect(page.querySelector('h1')?.textContent).toBe('Privacy');
    expect(text).toContain('no cookies, analytics or tracking');
    expect(text).toContain('Tigy, in Switzerland');
    expect(page.querySelector('.contact')?.getAttribute('href')).toBe(
      'mailto:tigythegaymer@hotmail.com',
    );
    expect(page.querySelector('.retention')?.textContent).toBe('30 days');
    const stored = page.querySelector('.stored')?.textContent?.replace(/\s+/g, ' ');
    expect(stored).toContain('kept until you change them back');
    expect(stored).toContain('kept until you close the tab');
    expect(page.querySelector('.panel')?.textContent).not.toContain('NSFW');
    expect(text).toContain("blocking site data in your browser's settings");  });
});
