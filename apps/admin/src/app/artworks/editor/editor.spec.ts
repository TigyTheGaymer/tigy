import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  withComponentInputBinding,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { toast } from '@spartan-ng/brain/sonner';
import type { Image, Person, WithId } from '@tigy/models';
import { PEOPLE_API } from '../../people/people-api';
import { ConfirmService, type Answer } from '../../shared/confirm.service';
import { unsavedEditsGuard } from '../../shared/unsaved-edits.guard';
import {
  artwork,
  FakeArtworksApi,
  FakeConfirmService,
  FakePeopleApi,
  person,
  settle,
  text,
} from '../../testing';
import { ARTWORKS_API } from '../artworks-api';
import { ArtworkEditorPage } from './editor';
import { IS_MAC } from './shortcuts';

interface Options {
  images?: WithId<Image>[];
  people?: WithId<Person>[];
  confirm?: FakeConfirmService;
  isMac?: boolean;
}

async function open(url: string, options: Options = {}) {
  const api = new FakeArtworksApi(options.images ?? []);
  api.counts = { chibi: 3, 'reference sheet': 5, couple: 1 };
  const peopleApi = new FakePeopleApi(options.people ?? []);
  const confirm = options.confirm ?? new FakeConfirmService(false);
  TestBed.configureTestingModule({
    providers: [
      { provide: ARTWORKS_API, useValue: api },
      { provide: PEOPLE_API, useValue: peopleApi },
      { provide: ConfirmService, useValue: confirm },
      { provide: IS_MAC, useValue: options.isMac ?? false },
      provideRouter(
        [
          {
            path: 'artworks/:id',
            component: ArtworkEditorPage,
            canDeactivate: [unsavedEditsGuard],
          },
          { path: 'artworks', children: [] },
          { path: 'people', children: [] },
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
  const page = () => harness.fixture.nativeElement as HTMLElement;
  const button = (name: string) =>
    [...page().querySelectorAll<HTMLElement>('button, a')].find(
      (b) => text(b) === name || b.getAttribute('aria-label') === name,
    );
  const field = (label: string) =>
    page().querySelector<HTMLInputElement>(
      `[aria-label="${label}"], #${label.toLowerCase()}`,
    );
  const type = async (
    target: HTMLInputElement | HTMLTextAreaElement | null,
    value: string,
  ) => {
    if (!target) throw new Error('No field');
    target.value = value;
    target.dispatchEvent(new Event('input'));
    await update();
  };
  const click = async (element: HTMLElement | null | undefined) => {
    if (!element) throw new Error('Nothing to click');
    element.click();
    await update();
  };
  const press = async (
    key: string,
    init: KeyboardEventInit = {},
    target: EventTarget = document.body,
  ) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    target.dispatchEvent(event);
    await update();
    return event;
  };
  const toggle = (label: string) =>
    click(page().querySelector<HTMLElement>(`button[aria-label="${label}"]`));
  return {
    api,
    peopleApi,
    confirm,
    harness,
    page,
    button,
    field,
    type,
    click,
    press,
    toggle,
    update,
  };
}

const url = () => TestBed.inject(Router).url;

/** Complete pieces: an artist and a date, so publishing them asks nothing. */
const complete = { artistIds: ['ann'], date: '2026' };

const unpublished = () => [
  artwork('first', { ...complete, title: 'First', sortDate: '2026-03-01' }),
  artwork('second', { ...complete, title: 'Second', sortDate: '2026-02-01' }),
  artwork('shown', {
    ...complete,
    title: 'Shown',
    sortDate: '2026-01-15',
    published: true,
  }),
  artwork('third', { ...complete, title: 'Third', sortDate: '2026-01-01' }),
];

describe('ArtworkEditorPage', () => {
  afterEach(() => vi.restoreAllMocks());

  describe('the piece and its file', () => {
    it('Opening a published piece: shows its image, file details and a link to its public page', async () => {
      const { page, button } = await open('/artworks/k3x', {
        images: [
          artwork('k3x', {
            title: 'Pool day',
            published: true,
            artistIds: ['ann'],
          }),
        ],
      });
      expect(page().querySelector('img')?.getAttribute('src')).toContain(
        'images%2Fk3x%2Ffull.webp',
      );
      const details = text(page().querySelector('dl'));
      expect(details).toContain('Format PNG');
      expect(details).toContain('Dimensions 800 × 600');
      expect(details).toContain('Animated No');
      expect(details).toContain('Transparent No');
      expect(details).toContain('Added 20 Nov 2025');
      expect(button('Public page')?.getAttribute('href')).toMatch(/\/i\/k3x$/);
      expect(button('Original file')?.getAttribute('href')).toContain(
        'images%2Fk3x%2Foriginal.png',
      );
    });

    it('folds the file details behind File info on a phone', async () => {
      const { page, button, click } = await open('/artworks/k3x', {
        images: [artwork('k3x')],
      });
      const details = page().querySelector('#file-info');
      const toggle = button('File info');
      expect(toggle?.className).toContain('md:hidden');
      expect(toggle?.getAttribute('aria-expanded')).toBe('false');
      expect(details?.getAttribute('data-shown')).toBe('false');
      await click(toggle);
      expect(toggle?.getAttribute('aria-expanded')).toBe('true');
      expect(details?.getAttribute('data-shown')).toBe('true');
    });

    it('offers no public page for an unpublished piece', async () => {
      const { button } = await open('/artworks/k3x', {
        images: [artwork('k3x')],
      });
      expect(button('Public page')).toBeUndefined();
    });

    it('Deleted meanwhile: says the artwork was not found, with a link to the Artworks page', async () => {
      const { page } = await open('/artworks/gone', {
        images: [artwork('other')],
      });
      expect(text(page())).toContain('Artwork not found');
      expect(page().querySelector('a')?.getAttribute('href')).toBe('/artworks');
    });

    it('Tile without an artist: the editor says "No artist"', async () => {
      const { page } = await open('/artworks/k3x', {
        images: [artwork('k3x')],
      });
      expect(text(page().querySelector('form'))).toContain('No artist');
    });
  });

  describe('missing details', () => {
    const gaps = (page: HTMLElement) =>
      [
        ...page.querySelectorAll(
          '[role=group][aria-label="Missing details"] button',
        ),
      ].map(text);

    it('lists every missing detail, and drops each one as it is filled in', async () => {
      const { page, field, type } = await open('/artworks/k3x', {
        images: [artwork('k3x')],
      });
      expect(gaps(page())).toEqual(['No artist', 'No title', 'No date']);
      await type(field('Title'), 'Pool day');
      await type(field('Year'), '2021');
      expect(gaps(page())).toEqual(['No artist']);
    });

    it('takes the owner to the field that is missing', async () => {
      const { page, click } = await open('/artworks/k3x', {
        images: [artwork('k3x')],
      });
      const button = (name: string) =>
        page().querySelector<HTMLElement>(
          `[aria-label="${name}: go to the field"]`,
        ) ?? undefined;
      await click(button('No title'));
      expect(document.activeElement?.id).toBe('title');
      await click(button('No date'));
      expect(document.activeElement?.getAttribute('aria-label')).toBe('Year');
      await click(button('No artist'));
      expect(document.activeElement?.getAttribute('aria-label')).toBe(
        'Add to Artists',
      );
    });

    it('says what a published piece still lacks', async () => {
      const { page, toggle } = await open('/artworks/k3x', {
        images: [artwork('k3x', { title: 'Pool day' })],
      });
      expect(page().querySelector('form [role=status]')).toBeNull();
      await toggle('Published');
      expect(text(page().querySelector('form p[role=status]'))).toBe(
        'Published pieces show on the public site, and this one has no artist and no date.',
      );
    });

    it('asks before publishing a piece with missing details, and keeps editing when told to', async () => {
      const confirm = new FakeConfirmService(false);
      const { api, page, toggle, button, click } = await open('/artworks/k3x', {
        images: [artwork('k3x')],
        confirm,
      });
      await toggle('Published');
      await click(button('Save'));
      expect(confirm.asked).toEqual([
        {
          title: 'Publish with missing details?',
          description:
            'This piece has no artist, no title and no date. It will show on the public site like that.',
          confirm: 'Publish anyway',
          cancel: 'Keep editing',
        },
      ]);
      expect(api.updates).toEqual([]);
      expect(text(page())).toContain('Unsaved edits');
    });

    it('publishes anyway when the owner confirms', async () => {
      const { api, toggle, button, click } = await open('/artworks/k3x', {
        images: [artwork('k3x')],
        confirm: new FakeConfirmService(true),
      });
      await toggle('Published');
      await click(button('Save'));
      expect(api.updates).toEqual([{ id: 'k3x', edits: { published: true } }]);
    });

    it('asks nothing when saving other edits to a piece that is already published', async () => {
      const confirm = new FakeConfirmService(false);
      const { api, field, type, button, click } = await open('/artworks/k3x', {
        images: [artwork('k3x', { published: true })],
        confirm,
      });
      await type(field('Title'), 'Pool day');
      await click(button('Save'));
      expect(confirm.asked).toEqual([]);
      expect(api.updates).toEqual([
        { id: 'k3x', edits: { title: 'Pool day' } },
      ]);
    });
  });

  describe('saving', () => {
    it('Saving: stores the title and tags together, confirms, and shows no unsaved edits', async () => {
      const success = vi.spyOn(toast, 'success');
      const { api, page, field, type, button, click } = await open(
        '/artworks/k3x',
        { images: [artwork('k3x', { tags: ['chibi'] })] },
      );
      await type(field('Title'), ' Pool day ');
      expect(text(page())).toContain('Unsaved edits');
      await type(page().querySelector('#tags-input'), 'Pool, ');
      await click(button('Save'));
      expect(api.updates).toEqual([
        { id: 'k3x', edits: { title: 'Pool day', tags: ['chibi', 'pool'] } },
      ]);
      expect(success).toHaveBeenCalledWith('Saved');
      expect(text(page())).not.toContain('Unsaved edits');
      expect(field('Title')?.value).toBe('Pool day');
    });

    it('Year only: dates the piece 2019, sorted as 2019-01-01', async () => {
      const { api, field, type, button, click } = await open('/artworks/k3x', {
        images: [artwork('k3x')],
      });
      await type(field('Year'), '2019');
      await click(button('Save'));
      expect(api.updates[0].edits).toEqual({
        date: '2019',
        sortDate: '2019-01-01',
      });
    });

    it('Day that does not exist: says so and does not save', async () => {
      const { api, page, field, type, button, click } = await open(
        '/artworks/k3x',
        { images: [artwork('k3x')] },
      );
      await type(field('Year'), '2024');
      await type(field('Month'), '2');
      await type(field('Day'), '31');
      await click(button('Save'));
      expect(text(page().querySelector('[role=alert]'))).toBe(
        'This date does not exist.',
      );
      expect(api.updates).toEqual([]);
    });

    it('Clearing the date: the piece has no date and sorts by the day it was added', async () => {
      const { api, field, type, button, click } = await open('/artworks/k3x', {
        images: [artwork('k3x', { date: '2021-04', sortDate: '2021-04-01' })],
      });
      expect(field('Year')?.value).toBe('2021');
      expect(field('Month')?.value).toBe('4');
      await type(field('Year'), '');
      await type(field('Month'), '');
      await click(button('Save'));
      expect(api.updates[0].edits).toEqual({
        date: null,
        sortDate: '2025-11-20',
      });
    });

    it('publishes and marks NSFW with the switches', async () => {
      const { api, toggle, button, click } = await open('/artworks/k3x', {
        images: [artwork('k3x', { ...complete, title: 'Done' })],
      });
      await toggle('Published');
      await toggle('NSFW');
      await click(button('Save'));
      expect(api.updates[0].edits).toEqual({ published: true, nsfw: true });
    });

    it('Save fails: says the edits were not saved and keeps them', async () => {
      const error = vi.spyOn(toast, 'error');
      const { api, page, field, type, button, click } = await open(
        '/artworks/k3x',
        { images: [artwork('k3x')] },
      );
      await type(field('Title'), 'Pool day');
      api.shouldFail = true;
      await click(button('Save'));
      expect(error).toHaveBeenCalledWith('The edits were not saved', {
        description: 'Check the connection and try again. Your edits are kept.',
      });
      expect(field('Title')?.value).toBe('Pool day');
      expect(text(page())).toContain('Unsaved edits');
    });

    it('keeps the typing when another tab changes the artwork', async () => {
      const { api, field, type, update } = await open('/artworks/k3x', {
        images: [artwork('k3x')],
      });
      await type(field('Title'), 'Mine');
      api.emit([artwork('k3x', { title: 'Theirs', nsfw: true })]);
      await update();
      expect(field('Title')?.value).toBe('Mine');
    });

    it('Leaving with unsaved edits: asks, and staying keeps the edit', async () => {
      const confirm = new FakeConfirmService(false);
      const { harness, field, type } = await open('/artworks/k3x', {
        images: [artwork('k3x')],
        confirm,
      });
      await type(field('Title'), 'Pool day');
      await TestBed.inject(Router).navigateByUrl('/people');
      await harness.fixture.whenStable();
      expect(confirm.asked[0].title).toBe('Leave without saving?');
      expect(url()).toBe('/artworks/k3x');
      expect(field('Title')?.value).toBe('Pool day');
    });

    it('leaves without asking once saved', async () => {
      const confirm = new FakeConfirmService(false);
      const { harness, field, type, button, click } = await open(
        '/artworks/k3x',
        { images: [artwork('k3x')], confirm },
      );
      await type(field('Title'), 'Pool day');
      await click(button('Save'));
      await TestBed.inject(Router).navigateByUrl('/people');
      await harness.fixture.whenStable();
      expect(confirm.asked).toEqual([]);
      expect(url()).toBe('/people');
    });
  });

  describe('leaving with unsaved edits', () => {
    async function leaveAs(answer: Answer, options: Options = {}) {
      const confirm = new FakeConfirmService(false, [answer]);
      const opened = await open('/artworks/k3x', {
        images: [artwork('k3x')],
        confirm,
        ...options,
      });
      await opened.type(opened.field('Title'), 'Pool day');
      const leave = async () => {
        await TestBed.inject(Router).navigateByUrl('/people');
        await opened.update();
      };
      return { ...opened, leave };
    }

    it('offers Save and leave besides Stay and Leave', async () => {
      const { confirm, leave } = await leaveAs('cancel');
      await leave();
      expect(confirm.asked).toEqual([
        expect.objectContaining({
          title: 'Leave without saving?',
          cancel: 'Stay',
          confirm: 'Leave',
          alternative: 'Save and leave',
        }),
      ]);
    });

    it('Saving on the way out: stores the title, confirms, and opens the People page', async () => {
      const success = vi.spyOn(toast, 'success');
      const { api, leave } = await leaveAs('alternative');
      await leave();
      expect(api.updates).toEqual([
        { id: 'k3x', edits: { title: 'Pool day' } },
      ]);
      expect(success).toHaveBeenCalledWith('Saved');
      expect(url()).toBe('/people');
    });

    it('Leaving without saving: opens the People page and stores nothing', async () => {
      const { api, leave } = await leaveAs('confirm');
      await leave();
      expect(api.updates).toEqual([]);
      expect(url()).toBe('/people');
    });

    it('Staying: keeps the editor open with the title unsaved', async () => {
      const { api, page, field, leave } = await leaveAs('cancel');
      await leave();
      expect(api.updates).toEqual([]);
      expect(url()).toBe('/artworks/k3x');
      expect(field('Title')?.value).toBe('Pool day');
      expect(text(page())).toContain('Unsaved edits');
    });

    it('Moving to the next artwork: Alt+Right with Save and leave stores the title and opens the next piece', async () => {
      const confirm = new FakeConfirmService(false, ['alternative']);
      const { api, field, type, press, update } = await open(
        '/artworks/first',
        { images: unpublished(), confirm },
      );
      await type(field('Title'), 'Renamed');
      await press('ArrowRight', { altKey: true });
      await update();
      expect(api.updates).toEqual([
        { id: 'first', edits: { title: 'Renamed' } },
      ]);
      expect(url()).toBe('/artworks/second');
    });

    it('Date that does not exist: stays, shows the date error and keeps the edits', async () => {
      const { api, page, field, type, leave } = await leaveAs('alternative');
      await type(field('Year'), '2024');
      await type(field('Month'), '2');
      await type(field('Day'), '31');
      await leave();
      expect(text(page().querySelector('[role=alert]'))).toBe(
        'This date does not exist.',
      );
      expect(api.updates).toEqual([]);
      expect(url()).toBe('/artworks/k3x');
      expect(field('Title')?.value).toBe('Pool day');
    });

    it('Backing out of publishing with missing details: stores nothing and stays', async () => {
      const { api, confirm, page, toggle, leave } = await leaveAs('alternative');
      await toggle('Published');
      await leave();
      expect(confirm.asked.map((question) => question.title)).toEqual([
        'Leave without saving?',
        'Publish with missing details?',
      ]);
      expect(api.updates).toEqual([]);
      expect(url()).toBe('/artworks/k3x');
      expect(text(page())).toContain('Unsaved edits');
    });

    it('Save fails on the way out: says so, stays and keeps the edits', async () => {
      const error = vi.spyOn(toast, 'error');
      const { api, page, field, leave } = await leaveAs('alternative');
      api.shouldFail = true;
      await leave();
      expect(error).toHaveBeenCalledWith('The edits were not saved', {
        description: 'Check the connection and try again. Your edits are kept.',
      });
      expect(url()).toBe('/artworks/k3x');
      expect(field('Title')?.value).toBe('Pool day');
      expect(text(page())).toContain('Unsaved edits');
    });
  });

  describe('credits', () => {
    const people = () => [
      person('tigy', { name: 'Tigy' }),
      person('kitsu', { name: 'Kitsune' }),
      person('kit2', { name: 'Kitty' }),
      person('ann', { name: 'Ann' }),
    ];
    const combobox = (page: HTMLElement, label: string) =>
      page.querySelector<HTMLInputElement>(`[aria-label="Add to ${label}"]`);
    const options = (page: HTMLElement) =>
      [...page.querySelectorAll('[role=option]')].map(text);
    const choose = (page: HTMLElement, name: string) => {
      const option = [
        ...page.querySelectorAll<HTMLElement>('[role=option]'),
      ].find((o) => text(o) === name);
      option?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    };

    it('Picking an existing artist: offers the matches and adds the pick as the last artist', async () => {
      const { api, page, type, update, button, click } = await open(
        '/artworks/k3x',
        { images: [artwork('k3x', { artistIds: ['ann'] })], people: people() },
      );
      await type(combobox(page(), 'Artists'), 'kit');
      expect(options(page())).toEqual(['Kitsune', 'Kitty', 'Create “kit”']);
      choose(page(), 'Kitty');
      await update();
      expect(text(page().querySelector('ol[aria-label=Artists]'))).toBe(
        'A Ann K Kitty',
      );
      await click(button('Save'));
      expect(api.updates[0].edits).toEqual({ artistIds: ['ann', 'kit2'] });
    });

    it('matches names ignoring accents', async () => {
      const { page, type } = await open('/artworks/k3x', {
        images: [artwork('k3x')],
        people: [person('z', { name: 'Zoë' })],
      });
      await type(combobox(page(), 'Characters'), 'zoe');
      expect(options(page())).toEqual(['Zoë']);
    });

    it('Lead artist first: moving the second artist to the top saves that order', async () => {
      const { api, button, click } = await open('/artworks/k3x', {
        images: [artwork('k3x', { artistIds: ['ann', 'kitsu'] })],
        people: people(),
      });
      await click(button('Move Kitsune up'));
      await click(button('Save'));
      expect(api.updates[0].edits).toEqual({ artistIds: ['kitsu', 'ann'] });
    });

    it('removes a credit', async () => {
      const { api, button, click } = await open('/artworks/k3x', {
        images: [artwork('k3x', { artistIds: ['ann', 'kitsu'] })],
        people: people(),
      });
      await click(button('Remove Ann'));
      await click(button('Save'));
      expect(api.updates[0].edits).toEqual({ artistIds: ['kitsu'] });
    });

    it('Same person in both lists: both credits are saved, and neither list offers them again', async () => {
      const { api, page, type, update, button, click } = await open(
        '/artworks/k3x',
        { images: [artwork('k3x', { artistIds: ['tigy'] })], people: people() },
      );
      await type(combobox(page(), 'Characters'), 'tig');
      choose(page(), 'Tigy');
      await update();
      await type(combobox(page(), 'Artists'), 'tig');
      expect(options(page())).not.toContain('Tigy');
      await type(combobox(page(), 'Characters'), 'tig');
      expect(options(page())).not.toContain('Tigy');
      await click(button('Save'));
      expect(api.updates[0].edits).toEqual({ characterIds: ['tigy'] });
    });

    it('Creating a person from the picker: creates "Mango" and adds them as a character', async () => {
      const { api, peopleApi, page, type, update, button, click } = await open(
        '/artworks/k3x',
        { images: [artwork('k3x')], people: people() },
      );
      await type(combobox(page(), 'Characters'), 'Mango');
      expect(options(page())).toEqual(['Create “Mango”']);
      choose(page(), 'Create “Mango”');
      await update();
      const mango = peopleApi.people.find((p) => p.name === 'Mango');
      expect(mango).toBeDefined();
      expect(text(page().querySelector('ol[aria-label=Characters]'))).toBe(
        'M Mango',
      );
      await click(button('Save'));
      expect(api.updates[0].edits).toEqual({ characterIds: [mango?.id] });
    });

    it('offers no "Create" for a name someone already has', async () => {
      const { page, type } = await open('/artworks/k3x', {
        images: [artwork('k3x')],
        people: people(),
      });
      await type(combobox(page(), 'Artists'), 'ann');
      expect(options(page())).toEqual(['Ann']);
    });
  });

  describe('tags', () => {
    const suggestions = (page: HTMLElement) =>
      [...page.querySelectorAll('[aria-label="Tag suggestions"] li')].map(text);

    it('Tag suggestions: offers matching tags, most used first', async () => {
      const { page, type } = await open('/artworks/k3x', {
        images: [artwork('k3x')],
      });
      await type(page().querySelector('#tags-input'), 'e');
      expect(suggestions(page())).toEqual(['reference sheet 5', 'couple 1']);
    });

    it('Case and spacing: adds a tag in its stored form', async () => {
      const { api, page, type, press, button, click } = await open(
        '/artworks/k3x',
        { images: [artwork('k3x')] },
      );
      const input = page().querySelector<HTMLInputElement>('#tags-input');
      await type(input, '  Chibi   STYLE ');
      await press('Enter', {}, input as HTMLInputElement);
      expect(text(page().querySelector('ul[aria-label=Tags]'))).toBe(
        'chibi style',
      );
      await click(button('Save'));
      expect(api.updates[0].edits).toEqual({ tags: ['chibi style'] });
    });

    it('shows the tags inside the box, and Backspace in the empty box removes the last one', async () => {
      const { page, press } = await open('/artworks/k3x', {
        images: [artwork('k3x', { tags: ['chibi', 'comic'] })],
      });
      const input = page().querySelector<HTMLInputElement>('#tags-input')!;
      expect(
        input.parentElement?.querySelector('ul[aria-label=Tags]'),
      ).not.toBeNull();
      await press('Backspace', {}, input);
      expect(text(page().querySelector('ul[aria-label=Tags]'))).toBe('chibi');
    });

    it('Adding a tag in another spelling: is not added a second time', async () => {
      const { page, type, press } = await open('/artworks/k3x', {
        images: [artwork('k3x', { tags: ['reference sheet'] })],
      });
      const input = page().querySelector<HTMLInputElement>('#tags-input');
      await type(input, ' Reference  Sheet');
      await press('Enter', {}, input as HTMLInputElement);
      expect(page().querySelectorAll('ul[aria-label=Tags] > li')).toHaveLength(
        1,
      );
      expect(text(page())).not.toContain('Unsaved edits');
    });
  });

  describe('moving through the list', () => {
    it('Working through unpublished pieces: Save and next publishes and opens the piece that was third', async () => {
      const { api, toggle, button, click, update } = await open(
        '/artworks/second?view=unpublished',
        { images: unpublished() },
      );
      await toggle('Published');
      await click(button('Save and next'));
      await update();
      expect(api.updates).toEqual([
        { id: 'second', edits: { published: true } },
      ]);
      expect(url()).toBe('/artworks/third?view=unpublished');
    });

    it('takes previous from where a piece sat before it left the view', async () => {
      const { toggle, button, click } = await open(
        '/artworks/second?view=unpublished',
        { images: unpublished() },
      );
      await toggle('Published');
      await click(button('Save'));
      await click(button('Previous artwork'));
      expect(url()).toBe('/artworks/first?view=unpublished');
    });

    it('Opened from an upload row: next follows the whole list, newest first', async () => {
      const { button, click } = await open('/artworks/second', {
        images: unpublished(),
      });
      await click(button('Next artwork'));
      expect(url()).toBe('/artworks/shown');
    });

    it('Last piece: offers Save, but neither next nor Save and next', async () => {
      const { button } = await open('/artworks/third?view=unpublished', {
        images: unpublished(),
      });
      expect(button('Save')).toBeDefined();
      expect(button('Next artwork')).toBeUndefined();
      expect(button('Save and next')).toBeUndefined();
    });
  });

  describe('keyboard shortcuts', () => {
    it('Saving from a field: Ctrl+S saves, and the browser does not offer to save the page', async () => {
      const { api, field, type, press } = await open('/artworks/k3x', {
        images: [artwork('k3x')],
      });
      await type(field('Title'), 'Pool day');
      const event = await press('s', { ctrlKey: true }, field('Title')!);
      expect(event.defaultPrevented).toBe(true);
      expect(api.updates[0].edits).toEqual({ title: 'Pool day' });
    });

    it('stops the browser saving the page even with nothing to save', async () => {
      const { press } = await open('/artworks/k3x', {
        images: [artwork('k3x')],
      });
      expect((await press('s', { ctrlKey: true })).defaultPrevented).toBe(true);
    });

    it('⌘ on a Mac: ⌘S saves, and the buttons name ⌘', async () => {
      const { api, field, type, press, button } = await open('/artworks/k3x', {
        images: [artwork('k3x')],
        isMac: true,
      });
      expect(button('Save')?.getAttribute('aria-keyshortcuts')).toBe('Meta+S');
      await type(field('Title'), 'Pool day');
      await press('s', { metaKey: true });
      expect(api.updates).toHaveLength(1);
    });

    it('names Ctrl elsewhere', async () => {
      const { button } = await open('/artworks/second', {
        images: unpublished(),
      });
      expect(button('Save')?.getAttribute('aria-keyshortcuts')).toBe(
        'Control+S',
      );
      expect(button('Save and next')?.getAttribute('aria-keyshortcuts')).toBe(
        'Control+Enter',
      );
    });

    it('Ctrl+Enter saves and opens the next artwork', async () => {
      const { api, field, type, press, update } = await open(
        '/artworks/first?view=unpublished',
        { images: unpublished() },
      );
      await type(field('Title'), 'Renamed');
      await press('Enter', { ctrlKey: true }, field('Title')!);
      await update();
      expect(api.updates).toHaveLength(1);
      expect(url()).toBe('/artworks/second?view=unpublished');
    });

    it('Moving on with unsaved edits: Alt+Right asks first', async () => {
      const confirm = new FakeConfirmService(false);
      const { field, type, press } = await open('/artworks/first', {
        images: unpublished(),
        confirm,
      });
      await type(field('Title'), 'Renamed');
      await press('ArrowRight', { altKey: true });
      expect(confirm.asked[0].title).toBe('Leave without saving?');
      expect(url()).toBe('/artworks/first');
    });

    it('Alt+Right moves on when nothing is unsaved', async () => {
      const { press } = await open('/artworks/first', {
        images: unpublished(),
      });
      await press('ArrowRight', { altKey: true });
      expect(url()).toBe('/artworks/second');
    });

    it('leaves Alt+Left alone inside the description', async () => {
      const { page, press } = await open('/artworks/second', {
        images: unpublished(),
      });
      const description = page().querySelector('textarea')!;
      const event = await press('ArrowLeft', { altKey: true }, description);
      expect(event.defaultPrevented).toBe(false);
      expect(url()).toBe('/artworks/second');
    });
  });

  describe('deleting', () => {
    it('deletes after confirming, then shows the Artworks page', async () => {
      const confirm = new FakeConfirmService(true);
      const { api, button, click, update } = await open(
        '/artworks/k3x?view=unpublished',
        { images: [artwork('k3x', { title: 'Pool day' })], confirm },
      );
      await click(button('Delete'));
      await update();
      expect(confirm.asked[0].title).toBe('Delete Pool day?');
      expect(api.batches).toEqual([{ ids: ['k3x'], edits: 'delete' }]);
      expect(url()).toBe('/artworks?view=unpublished');
    });

    it('keeps the artwork when the owner cancels', async () => {
      const { api, button, click } = await open('/artworks/k3x', {
        images: [artwork('k3x')],
        confirm: new FakeConfirmService(false),
      });
      await click(button('Delete'));
      expect(api.batches).toEqual([]);
      expect(url()).toBe('/artworks/k3x');
    });
  });

  describe('editing a credited person', () => {
    const images = () => [artwork('k3x', { artistIds: ['bramble'] })];
    const people = () => [person('bramble', { name: 'Bramble' })];
    const sheet = (page: HTMLElement) =>
      page.querySelector<HTMLElement>('aside[role=dialog]');

    it('Adding links to a new artist: saves the person, closes the panel and keeps the artwork edits', async () => {
      const { api, peopleApi, page, field, type, button, click } = await open(
        '/artworks/k3x',
        { images: images(), people: people() },
      );
      await type(field('Title'), 'Unsaved title');
      await click(button('Edit Bramble'));
      expect(sheet(page())).not.toBeNull();
      await click(button('Add a link'));
      const address = sheet(page())!.querySelector<HTMLInputElement>(
        '[aria-label="Address"]',
      );
      await type(address, 'https://bsky.app/profile/bramble.bsky.social');
      address?.dispatchEvent(new Event('change'));
      await click(
        [...sheet(page())!.querySelectorAll<HTMLElement>('button')].find(
          (b) => text(b) === 'Save',
        ),
      );
      expect(peopleApi.updates).toEqual([
        {
          id: 'bramble',
          edits: {
            links: [
              {
                network: 'Bluesky',
                handle: '@bramble.bsky.social',
                url: 'https://bsky.app/profile/bramble.bsky.social',
              },
            ],
          },
        },
      ]);
      expect(sheet(page())).toBeNull();
      expect(field('Title')?.value).toBe('Unsaved title');
      expect(text(page())).toContain('Unsaved edits');
      expect(api.updates).toEqual([]);
    });

    it('Closing the panel with unsaved edits: asks before discarding the change', async () => {
      const confirm = new FakeConfirmService(false);
      const { page, type, button, click } = await open('/artworks/k3x', {
        images: images(),
        people: people(),
        confirm,
      });
      await click(button('Edit Bramble'));
      await type(sheet(page())!.querySelector<HTMLInputElement>('#name'), 'B');
      await click(button('Close'));
      expect(confirm.asked[0].title).toBe('Discard the edits to this person?');
      expect(sheet(page())).not.toBeNull();
      confirm.answer = true;
      await click(button('Close'));
      expect(sheet(page())).toBeNull();
    });

    it('closes at once when nothing changed', async () => {
      const confirm = new FakeConfirmService(false);
      const { page, button, click } = await open('/artworks/k3x', {
        images: images(),
        people: people(),
        confirm,
      });
      await click(button('Edit Bramble'));
      await click(button('Close'));
      expect(confirm.asked).toEqual([]);
      expect(sheet(page())).toBeNull();
    });

    it('Ctrl+S saves the person while the panel is open, not the artwork', async () => {
      const { api, peopleApi, page, field, type, button, click, press } =
        await open('/artworks/k3x', { images: images(), people: people() });
      await type(field('Title'), 'Unsaved title');
      await click(button('Edit Bramble'));
      await type(
        sheet(page())!.querySelector<HTMLInputElement>('#name'),
        'Bramble Fox',
      );
      await press('s', { ctrlKey: true });
      expect(peopleApi.updates).toEqual([
        { id: 'bramble', edits: { name: 'Bramble Fox' } },
      ]);
      expect(api.updates).toEqual([]);
    });
  });
});
