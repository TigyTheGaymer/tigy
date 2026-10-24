import { galleryQueryFromParams } from '@tigy/gallery';
import type { GalleryChoices } from '../../../api/types';
import {
  pickerChoices,
  steadyChoices,
  type PickerChoice,
} from './picker-choices';

const CHOICES: GalleryChoices = {
  characters: [
    { id: 'tigy', name: 'Tigy', avatar: 'people/tigy.webp', count: 5 },
    { id: 'bramble', name: 'Bramble', count: 2 },
  ],
  artists: [{ id: 'ari', name: 'Ari', count: 3 }],
  tags: [
    { value: 'chibi', count: 4 },
    { value: 'comic', count: 2 },
  ],
  years: [
    { year: 2026, count: 1 },
    { year: 2025, count: 3 },
    { year: 2024, count: 1 },
  ],
};

const noNames = () => null;

describe('pickerChoices', () => {
  it('Picking a tag: adds it to the address and keeps the sort', () => {
    const query = galleryQueryFromParams({ sort: 'oldest' });
    const [chibi] = pickerChoices(query, CHOICES, noNames).tags;
    expect(chibi).toMatchObject({
      name: 'chibi',
      count: 4,
      isSelected: false,
    });
    expect(chibi.params).toEqual({ tag: ['chibi'], sort: 'oldest' });
  });

  it('Picking a second character: keeps the first', () => {
    const query = galleryQueryFromParams({ character: 'tigy' });
    const bramble = pickerChoices(query, CHOICES, noNames).characters[1];
    expect(bramble.params).toEqual({ character: ['tigy', 'bramble'] });
  });

  it('Unpicking a choice: its address removes it, and it is listed first', () => {
    const query = galleryQueryFromParams({ tag: ['comic'] });
    const [comic, chibi] = pickerChoices(query, CHOICES, noNames).tags;
    expect(comic).toMatchObject({ name: 'comic', isSelected: true });
    expect(comic.params).toEqual({});
    expect(chibi.isSelected).toBe(false);
  });

  it('Picking a second year: keeps the first, and the list stays newest first', () => {
    const query = galleryQueryFromParams({ year: '2024', artist: 'ari' });
    const years = pickerChoices(query, CHOICES, noNames).years;
    expect(years.map((y) => y.name)).toEqual(['2026', '2025', '2024']);
    expect(years[1].params).toEqual({
      artist: ['ari'],
      year: ['2025', '2024'],
    });
    expect(years[2]).toMatchObject({ isSelected: true });
    expect(years[2].params).toEqual({ artist: ['ari'] });
  });

  it('Unticking a year: drops active years the other filters leave empty, so the gallery never empties', () => {
    const query = galleryQueryFromParams({ year: ['2026', '2019'] });
    const years = pickerChoices(query, CHOICES, noNames).years;
    const [y2026, , , y2019] = years;
    expect(y2019).toMatchObject({ count: 0, isSelected: true });
    expect(y2026.params).toEqual({});
    expect(years[1].params).toEqual({ year: ['2026', '2025'] });
  });

  it('gives people with an avatar its address', () => {
    const [tigy, bramble] = pickerChoices(
      galleryQueryFromParams({}),
      CHOICES,
      noNames,
    ).characters;
    expect(tigy.avatar).toBe('/avatars/tigy.webp');
    expect(bramble.avatar).toBeUndefined();
  });

  it('lists an active filter the choices leave out, selected with no pieces, so it can be unpicked', () => {
    const query = galleryQueryFromParams({
      artist: 'nobody',
      tag: 'gone',
      year: '2019',
    });
    const names = (id: string) => (id === 'nobody' ? 'Unknown person' : null);
    const { artists, tags, years } = pickerChoices(query, CHOICES, names);
    expect(artists[0]).toMatchObject({
      key: 'nobody',
      name: 'Unknown person',
      count: 0,
      isSelected: true,
    });
    expect(artists[0].params).toEqual({ tag: ['gone'], year: ['2019'] });
    expect(tags[0]).toMatchObject({ name: 'gone', count: 0, isSelected: true });
    expect(years.map((y) => y.name)).toEqual(['2026', '2025', '2024', '2019']);
    expect(years[3].isSelected).toBe(true);
  });

  it('shows an ellipsis while an active person’s name loads', () => {
    const query = galleryQueryFromParams({ character: 'kitsu' });
    const [kitsu] = pickerChoices(query, CHOICES, noNames).characters;
    expect(kitsu).toMatchObject({ key: 'kitsu', name: '…' });
  });

  it('offers nothing before the choices arrive', () => {
    expect(
      pickerChoices(galleryQueryFromParams({}), undefined, noNames),
    ).toEqual({
      characters: [],
      artists: [],
      tags: [],
      years: [],
    });
  });
});

describe('steadyChoices', () => {
  const choice = (key: string, count: number, isSelected = false) =>
    ({
      key,
      name: key,
      count,
      isSelected,
      params: { tag: [key] },
    }) satisfies PickerChoice;

  it('keeps the order the picker opened with, taking the current counts and selection', () => {
    const opened = [choice('chibi', 4), choice('comic', 2)];
    const current = [choice('comic', 2, true), choice('chibi', 1)];
    expect(
      steadyChoices(opened, current).map((c) => [c.key, c.count, c.isSelected]),
    ).toEqual([
      ['chibi', 1, false],
      ['comic', 2, true],
    ]);
  });

  it('keeps a choice that stopped matching in its place, unavailable with no pieces', () => {
    const opened = [choice('animated', 1), choice('comic', 1)];
    const [animated, comic] = steadyChoices(opened, [choice('comic', 1, true)]);
    expect(animated).toMatchObject({
      key: 'animated',
      count: 0,
      isSelected: false,
      isAvailable: false,
    });
    expect(comic.isAvailable).toBe(true);
  });

  it('adds a choice that started matching at the end', () => {
    const opened = [choice('comic', 1, true)];
    const current = [choice('animated', 1), choice('comic', 2)];
    expect(steadyChoices(opened, current).map((c) => c.key)).toEqual([
      'comic',
      'animated',
    ]);
  });
});
