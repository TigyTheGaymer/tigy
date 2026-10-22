import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ARTWORKS_API } from '../artworks/artworks-api';
import {
  artwork,
  FakeArtworksApi,
  FakePeopleApi,
  person,
  settle,
} from '../testing';
import { PEOPLE_API } from './people-api';
import { PeopleService } from './people.service';

async function service(
  people: FakePeopleApi,
  artworks = new FakeArtworksApi(),
) {
  TestBed.configureTestingModule({
    providers: [
      { provide: PEOPLE_API, useValue: people },
      { provide: ARTWORKS_API, useValue: artworks },
    ],
  });
  const service = TestBed.inject(PeopleService);
  service.people();
  await settle();
  return service;
}

describe('PeopleService', () => {
  it('Opening the People page: Tigy first, then the others by name, ignoring case', async () => {
    const people = await service(
      new FakePeopleApi([
        person('k', { name: 'kitsu' }),
        person('tigy', { name: 'Tigy' }),
        person('b', { name: 'Bramble' }),
        person('a', { name: 'Ätzel' }),
      ]),
    );
    expect(people.people().map((p) => p.name)).toEqual([
      'Tigy',
      'Ätzel',
      'Bramble',
      'kitsu',
    ]);
  });

  it('searches names, ignoring case and accents', async () => {
    const people = await service(
      new FakePeopleApi([
        person('a', { name: 'Kitsune' }),
        person('b', { name: 'Zoë' }),
        person('c', { name: 'Bramble' }),
      ]),
    );
    const search = signal('KIT');
    const found = people.matching(search);
    expect(found().map((p) => p.id)).toEqual(['a']);
    search.set('zoe');
    expect(found().map((p) => p.id)).toEqual(['b']);
  });

  it('counts the artworks crediting each person, as an artist or a character, published or not', async () => {
    const people = await service(
      new FakePeopleApi([person('ann'), person('tigy')]),
      new FakeArtworksApi([
        artwork('a', { artistIds: ['ann'], characterIds: ['tigy'] }),
        artwork('b', { artistIds: ['ann'], characterIds: ['ann'] }),
        artwork('c', { characterIds: ['tigy'], published: true }),
      ]),
    );
    expect(people.creditCounts().get('ann')).toBe(2);
    expect(people.creditCounts().get('tigy')).toBe(2);
    expect(people.creditCounts().get('nobody')).toBeUndefined();
  });

  it('creates a person with a trimmed name', async () => {
    const api = new FakePeopleApi();
    const people = await service(api);
    const id = await people.create('  Bramble ');
    expect(api.people).toEqual([
      expect.objectContaining({ id, name: 'Bramble' }),
    ]);
  });
});
