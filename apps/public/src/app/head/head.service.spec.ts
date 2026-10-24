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

  it('GIF: the preview links the original, which embedders animate', () => {
    head.artwork(
      artwork({
        id: 'wave',
        file: {
          ...artwork().artwork.file,
          original: 'images/wave/original.gif',
          mime: 'image/gif',
          animated: true,
        },
      }),
    );
    expect(content('property="og:image"')).toBe(
      `${location.origin}/img/wave/original.gif`,
    );
    expect(content('property="og:video"')).toBeUndefined();
  });

  it('Video: the preview plays the MP4 over its poster, and the next page drops it', () => {
    head.artwork(
      artwork({
        id: 'dance',
        file: {
          ...artwork().artwork.file,
          original: 'images/dance/original.mov',
          mime: 'video/quicktime',
          animated: true,
          w: 1920,
          h: 1080,
        },
      }),
    );
    expect(content('property="og:image"')).toBe(
      `${location.origin}/img/dance/full.webp`,
    );
    expect(content('property="og:type"')).toBe('video.other');
    expect(content('property="og:video"')).toBe(
      `${location.origin}/img/dance/full.mp4`,
    );
    expect(content('property="og:video:type"')).toBe('video/mp4');
    expect(content('property="og:video:width"')).toBe('1920');
    expect(content('property="og:video:height"')).toBe('1080');

    head.siteCard();
    expect(content('property="og:video"')).toBeUndefined();
    expect(content('property="og:type"')).toBeUndefined();
  });
});
