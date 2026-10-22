import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  withComponentInputBinding,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ARTWORKS_API } from '../artworks/artworks-api';
import {
  artwork,
  FakeArtworksApi,
  FakePeopleApi,
  person,
  settle,
  text,
} from '../testing';
import { PEOPLE_API } from './people-api';
import { PeoplePage } from './people';

async function open(api = new FakePeopleApi(), url = '/people') {
  TestBed.configureTestingModule({
    providers: [
      { provide: PEOPLE_API, useValue: api },
      {
        provide: ARTWORKS_API,
        useValue: new FakeArtworksApi([
          artwork('a', { artistIds: ['kitsu'], characterIds: ['tigy'] }),
          artwork('b', { characterIds: ['tigy', 'kitsu'], published: true }),
        ]),
      },
      provideRouter(
        [
          { path: 'people', component: PeoplePage },
          { path: 'people/:id', children: [] },
        ],
        withComponentInputBinding(),
      ),
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  const update = async () => {
    await settle();
    await harness.fixture.whenStable();
  };
  await update();
  const page = () => harness.routeNativeElement as HTMLElement;
  const rows = () =>
    [...page().querySelectorAll('ul[aria-label=People] > li')].map(text);
  const nameField = () =>
    page().querySelector<HTMLInputElement>(
      '[aria-label="New person\'s name"]',
    )!;
  const create = async (name: string) => {
    nameField().value = name;
    nameField().dispatchEvent(new Event('input'));
    page()
      .querySelector('form[aria-label="New person"]')!
      .dispatchEvent(new Event('submit'));
    await update();
  };
  return { api, page, rows, create, update };
}

const stored = () =>
  new FakePeopleApi([
    person('kitsu', { name: 'kitsu' }),
    person('tigy', { name: 'Tigy' }),
    person('bramble', { name: 'Bramble' }),
  ]);

describe('PeoplePage', () => {
  it("Opening the People page: Tigy first, marked as the site's own person, then by name with credit counts", async () => {
    const { rows } = await open(stored());
    expect(rows()).toEqual([
      "T Tigy The site's own person 2 artworks",
      'B Bramble 0 artworks',
      'K kitsu 2 artworks',
    ]);
  });

  it('links each person to their editor', async () => {
    const { page } = await open(stored());
    expect(page().querySelector('ul a')?.getAttribute('href')).toBe(
      '/people/tigy',
    );
  });

  it('searches names, ignoring case', async () => {
    const { rows } = await open(stored(), '/people?q=BRAM');
    expect(rows()).toEqual(['B Bramble 0 artworks']);
  });

  it('Creating a person: trims the name and opens their editor', async () => {
    const api = stored();
    const { create } = await open(api);
    await create(' Bramble Two ');
    const created = api.people.find((p) => p.name === 'Bramble Two');
    expect(created).toEqual(expect.objectContaining({ links: [] }));
    expect(TestBed.inject(Router).url).toBe(`/people/${created?.id}`);
  });

  it('Empty name: says a name is required and creates no one', async () => {
    const api = stored();
    const { create, page } = await open(api);
    await create('   ');
    expect(text(page().querySelector('[role=alert]'))).toBe('Enter a name.');
    expect(api.people).toHaveLength(3);
  });
});
