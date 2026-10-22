import { TestBed } from '@angular/core/testing';
import { SocialLink } from './social-link';

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
    expect(link.querySelector('ng-icon.generic svg')).not.toBeNull();
  });
});
