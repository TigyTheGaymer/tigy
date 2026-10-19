import { TestBed } from '@angular/core/testing';
import { SocialLink } from './social-link';
import { brandFor } from './brands';

describe('brandFor', () => {
  it('knows the four networks however they are written', () => {
    expect(brandFor('bluesky')?.name).toBe('Bluesky');
    expect(brandFor('Fur Affinity')?.name).toBe('Fur Affinity');
    expect(brandFor('Telegram')?.name).toBe('Telegram');
    expect(brandFor('X')?.name).toBe('Twitter');
  });

  it('has no logo for other networks', () => {
    expect(brandFor('Mastodon')).toBeUndefined();
  });
});

describe('SocialLink', () => {
  function render(network: string) {
    const fixture = TestBed.createComponent(SocialLink);
    fixture.componentRef.setInput('link', {
      network,
      handle: 'tigy',
      url: 'https://example.com/tigy',
    });
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
  }

  it('Wide screen: shows the logo and the handle, named "Network: handle"', () => {
    const link = render('bluesky');
    expect(link.getAttribute('href')).toBe('https://example.com/tigy');
    expect(link.getAttribute('aria-label')).toBe('Bluesky: tigy');
    expect(link.querySelector('svg.logo path')).not.toBeNull();
    expect(link.querySelector('.handle')?.textContent).toBe('tigy');
  });

  it('Network without a logo: shows a generic link icon, named after the network', () => {
    const link = render('mastodon');
    expect(link.getAttribute('aria-label')).toBe('Mastodon: tigy');
    expect(link.querySelector('svg.generic')).not.toBeNull();
  });
});
