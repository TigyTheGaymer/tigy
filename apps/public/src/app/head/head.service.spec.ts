import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { artwork } from '../testing';
import { HeadService } from './head.service';

describe('HeadService', () => {
  let head: HeadService;
  let document: Document;
  const content = (selector: string) =>
    document.head.querySelector(`meta[${selector}]`)?.getAttribute('content');

  beforeEach(() => {
    TestBed.configureTestingModule({});
    head = TestBed.inject(HeadService);
    document = TestBed.inject(DOCUMENT);
  });

  it('Site card: names Tigy with the avatar, and can hide the page from search', () => {
    head.siteCard();
    expect(content('property="og:title"')).toBe('Tigy');
    expect(content('property="og:image"')).toBe(
      `${location.origin}/avatars/tigy.webp`,
    );
    expect(content('name="robots"')).toBeUndefined();

    head.siteCard({ isHiddenFromSearch: true });
    expect(content('name="robots"')).toBe('noindex');
  });

  it('Artwork card: the piece replaces every tag of the previous page', () => {
    head.siteCard({ isHiddenFromSearch: true });
    head.artwork(
      artwork({ id: 'hey-pookie', title: 'Hey Pookie!', nsfw: false }),
    );
    expect(content('property="og:title"')).toBe('Hey Pookie!');
    expect(content('property="og:image"')).toBe(
      `${location.origin}/img/hey-pookie/full.webp`,
    );
    expect(content('property="og:url"')).toBe(
      `${location.origin}/i/hey-pookie`,
    );
    expect(content('name="twitter:card"')).toBe('summary_large_image');
    expect(content('name="robots"')).toBeUndefined();
    expect(
      document.head.querySelectorAll('meta[property="og:title"]'),
    ).toHaveLength(1);
  });

  it('Untitled NSFW piece: titled "Untitled" and hidden from search', () => {
    head.artwork(artwork({ id: 'lewd', title: undefined, nsfw: true }));
    expect(content('property="og:title"')).toBe('Untitled');
    expect(content('name="robots"')).toBe('noindex');
  });
});
