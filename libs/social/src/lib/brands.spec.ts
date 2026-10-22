import { brandFor, profileFromUrl } from './brands';

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

describe('profileFromUrl', () => {
  it.each([
    [
      'https://bsky.app/profile/bramble.bsky.social',
      'Bluesky',
      '@bramble.bsky.social',
    ],
    ['https://t.me/bramble', 'Telegram', '@bramble'],
    ['https://telegram.me/bramble', 'Telegram', '@bramble'],
    ['https://x.com/bramble', 'Twitter', '@bramble'],
    ['https://twitter.com/bramble', 'Twitter', '@bramble'],
    ['https://www.twitter.com/bramble', 'Twitter', '@bramble'],
    ['https://furaffinity.net/user/bramble', 'Fur Affinity', 'bramble'],
    ['https://www.furaffinity.net/user/bramble/', 'Fur Affinity', 'bramble'],
  ])('reads %s as %s %s', (url, network, handle) => {
    expect(profileFromUrl(url)).toEqual({ network, handle });
  });

  it('ignores www., a trailing slash, a query string and surrounding spaces', () => {
    expect(profileFromUrl(' https://www.x.com/bramble/?s=20 ')).toEqual({
      network: 'Twitter',
      handle: '@bramble',
    });
    expect(
      profileFromUrl('https://bsky.app/profile/bramble.bsky.social/#posts'),
    ).toEqual({ network: 'Bluesky', handle: '@bramble.bsky.social' });
  });

  it('reads nothing from a page that is not a profile', () => {
    expect(profileFromUrl('https://x.com/')).toBeUndefined();
    expect(profileFromUrl('https://x.com/bramble/status/1')).toBeUndefined();
    expect(profileFromUrl('https://bsky.app/search')).toBeUndefined();
    expect(profileFromUrl('https://furaffinity.net/view/123')).toBeUndefined();
  });

  it('Unknown site: reads nothing', () => {
    expect(profileFromUrl('https://bramble.example/art')).toBeUndefined();
    expect(profileFromUrl('https://notx.com/bramble')).toBeUndefined();
  });

  it('reads nothing from text that is not an address', () => {
    expect(profileFromUrl('bramble.example')).toBeUndefined();
    expect(profileFromUrl('')).toBeUndefined();
  });
});
