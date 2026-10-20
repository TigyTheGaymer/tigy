import { TestBed } from '@angular/core/testing';
import { galleryPage, rendered, rows } from '../testing';
import {
  GalleryPlaceService,
  type GalleryPlace,
} from './gallery-place.service';

const PLACE: GalleryPlace = {
  key: '[{},false]',
  first: galleryPage(rows(24), true),
  more: { rows: rows(6, 25), hasMore: false },
};

describe('GalleryPlaceService', () => {
  let place: GalleryPlaceService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    place = TestBed.inject(GalleryPlaceService);
  });

  it('gives the kept place back once', () => {
    place.keep(PLACE, true);
    expect(place.take()).toBe(PLACE);
    expect(place.take()).toBeUndefined();
  });

  it('Opening a piece from the gallery: going back in history returns to it', () => {
    expect(place.isFromGallery()).toBe(false);
    place.keep(PLACE, true);
    expect(place.isFromGallery()).toBe(true);
    place.take();
    expect(place.isFromGallery()).toBe(false);
  });

  it('Leaving for another page: history back would not reach the gallery', () => {
    place.keep(PLACE, false);
    expect(place.isFromGallery()).toBe(false);
  });

  it('remembers the gallery address for this tab', () => {
    expect(place.rememberedAddress()).toBeNull();
    place.rememberAddress('/?tag=comic');
    expect(place.rememberedAddress()).toBe('/?tag=comic');
    expect(sessionStorage.getItem('tigy.gallery')).toBe('/?tag=comic');
  });

  it('reads the address stored earlier in this tab once rendered', async () => {
    sessionStorage.setItem('tigy.gallery', '/?sort=oldest');
    expect(place.rememberedAddress()).toBeNull();
    await rendered();
    expect(place.rememberedAddress()).toBe('/?sort=oldest');
  });

  it.each(['//evil.example/', 'https://evil.example/'])(
    'ignores a stored address that leaves the site: %s',
    async (address) => {
      sessionStorage.setItem('tigy.gallery', address);
      await rendered();
      expect(place.rememberedAddress()).toBeNull();
    },
  );
});
