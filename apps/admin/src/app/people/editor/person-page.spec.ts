import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  withComponentInputBinding,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { toast } from '@spartan-ng/brain/sonner';
import type { Person, SocialLink, WithId } from '@tigy/models';
import { ARTWORKS_API } from '../../artworks/artworks-api';
import { CALLABLES, type Callables } from '../../firebase/functions';
import { ConfirmService } from '../../shared/confirm.service';
import { unsavedEditsGuard } from '../../shared/unsaved-edits.guard';
import {
  FakeArtworksApi,
  FakeConfirmService,
  FakePeopleApi,
  person,
  PNG_BYTES,
  settle,
  text,
} from '../../testing';
import { PEOPLE_API } from '../people-api';
import {
  AVATAR_CANVAS,
  type AvatarCanvas,
} from './avatar-cropper/avatar-canvas';
import { output, type Crop } from './avatar-cropper/crop';
import { PersonPage } from './person-page';

class FakeCanvas implements AvatarCanvas {
  readonly encoded: Crop[] = [];
  constructor(
    private readonly width = 300,
    private readonly height = 200,
  ) {}

  async decode() {
    return {
      bitmap: {} as ImageBitmap,
      width: this.width,
      height: this.height,
      url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
      release: () => undefined,
    };
  }

  async encode(_bitmap: ImageBitmap, crop: Crop) {
    this.encoded.push(crop);
    return new Blob([new Uint8Array(output(crop).size)], {
      type: 'image/webp',
    });
  }
}

interface Options {
  people?: WithId<Person>[];
  confirm?: FakeConfirmService;
  callables?: Partial<Callables>;
  canvas?: FakeCanvas;
}

async function open(id: string, options: Options = {}) {
  const api = new FakePeopleApi(
    options.people ?? [
      person('tigy', {
        name: 'Tigy',
        avatar: 'people/tigy/avatar.webp',
        links: [
          {
            network: 'Bluesky',
            handle: '@tigy',
            url: 'https://bsky.app/profile/tigy',
          },
          { network: 'Telegram', handle: '@tigy', url: 'https://t.me/tigy' },
        ],
      }),
      person('bramble', { name: 'Bramble' }),
    ],
  );
  const confirm = options.confirm ?? new FakeConfirmService(true);
  const canvas = options.canvas ?? new FakeCanvas();
  TestBed.configureTestingModule({
    providers: [
      { provide: PEOPLE_API, useValue: api },
      { provide: ARTWORKS_API, useValue: new FakeArtworksApi() },
      { provide: ConfirmService, useValue: confirm },
      { provide: CALLABLES, useValue: options.callables ?? {} },
      { provide: AVATAR_CANVAS, useValue: canvas },
      provideRouter(
        [
          {
            path: 'people/:id',
            component: PersonPage,
            canDeactivate: [unsavedEditsGuard],
          },
          { path: 'people', children: [] },
          { path: 'artworks/:id', children: [] },
        ],
        withComponentInputBinding(),
      ),
    ],
  });
  const harness = await RouterTestingHarness.create(`/people/${id}`);
  const update = async () => {
    await settle();
    await harness.fixture.whenStable();
  };
  await update();
  const page = () => harness.routeNativeElement as HTMLElement;
  const button = (name: string) =>
    [...page().querySelectorAll<HTMLElement>('button')].find(
      (b) => text(b) === name || b.getAttribute('aria-label') === name,
    );
  const click = async (element: HTMLElement | undefined) => {
    if (!element) throw new Error('Nothing to click');
    element.click();
    await update();
  };
  const type = async (field: HTMLInputElement | undefined, value: string) => {
    if (!field) throw new Error('No field');
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await update();
  };
  const linkFields = (index: number) => {
    const group = page().querySelectorAll('[role=group]')[index];
    const field = <T extends Element>(label: string) =>
      group.querySelector<T>(`[aria-label="${label}"]`) ?? undefined;
    return {
      url: field<HTMLInputElement>('Address'),
      network: field<HTMLSelectElement>('Network'),
      networkName: () => field<HTMLInputElement>('Network name'),
      handle: field<HTMLInputElement>('Handle'),
    };
  };
  /** Picks an option in a select, as a person choosing it would. */
  const choose = async (
    select: HTMLSelectElement | undefined,
    value: string,
  ) => {
    if (!select) throw new Error('No select');
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await update();
  };
  const paste = async (field: HTMLInputElement, value: string) => {
    field.value = value;
    field.dispatchEvent(
      new InputEvent('input', { inputType: 'insertFromPaste' }),
    );
    await update();
  };
  const pick = async (file: File) => {
    const input = page().querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true,
    });
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(async () => {
      await update();
      return true;
    });
    await update();
  };
  return {
    api,
    canvas,
    confirm,
    page,
    button,
    click,
    type,
    linkFields,
    choose,
    paste,
    pick,
    update,
  };
}

const links = (api: FakePeopleApi) =>
  api.updates.at(-1)?.edits.links as SocialLink[] | undefined;

describe('PersonPage', () => {
  afterEach(() => vi.restoreAllMocks());

  describe('name and links', () => {
    it('Adding a link: saves a Bluesky link with its handle and address', async () => {
      const { api, button, click, type, choose, linkFields } =
        await open('bramble');
      await click(button('Add a link'));
      const fields = linkFields(0);
      await choose(fields.network, 'Bluesky');
      await type(fields.handle, '@bramble.bsky.social');
      await type(fields.url, 'https://bsky.app/profile/bramble.bsky.social');
      await click(button('Save'));
      expect(api.updates).toEqual([
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
    });

    it.each(['bramble.example', 'http://bramble.example'])(
      'Address that is not https: refuses %s',
      async (address) => {
        const { api, page, button, click, type, choose, linkFields } =
          await open('bramble');
        await click(button('Add a link'));
        const fields = linkFields(0);
        await choose(fields.network, 'other');
        await type(fields.networkName(), 'Site');
        await type(fields.handle, 'bramble');
        await type(fields.url, address);
        await click(button('Save'));
        expect(text(page().querySelector('[role=alert]'))).toBe(
          'The address must start with https://',
        );
        expect(api.updates).toEqual([]);
      },
    );

    it("Reordering Tigy's links: moves Telegram above Bluesky", async () => {
      const { api, button, click } = await open('tigy');
      await click(button('Move link 2 up'));
      await click(button('Save'));
      expect(links(api)?.map((l) => l.network)).toEqual([
        'Telegram',
        'Bluesky',
      ]);
    });

    it('shows each link as one row with a network picker that lists the logos', async () => {
      const { linkFields } = await open('tigy');
      const network = linkFields(0).network;
      expect(network?.value).toBe('Bluesky');
      expect([...(network?.options ?? [])].map((o) => o.text)).toEqual([
        'Network',
        'Bluesky',
        'Telegram',
        'Twitter',
        'Fur Affinity',
        'Something else…',
      ]);
      expect(linkFields(0).networkName()).toBeUndefined();
      expect(linkFields(1).network?.value).toBe('Telegram');
    });

    it('takes any other network name after "Something else"', async () => {
      const { api, button, click, type, choose, linkFields } =
        await open('bramble');
      await click(button('Add a link'));
      await choose(linkFields(0).network, 'other');
      await type(linkFields(0).networkName(), 'Mastodon');
      await type(linkFields(0).handle, '@bramble');
      await type(linkFields(0).url, 'https://mastodon.example/@bramble');
      expect(linkFields(0).network?.value).toBe('other');
      await click(button('Save'));
      expect(api.updates[0].edits.links).toEqual([
        {
          network: 'Mastodon',
          handle: '@bramble',
          url: 'https://mastodon.example/@bramble',
        },
      ]);
    });

    it('removes a link', async () => {
      const { api, button, click } = await open('tigy');
      await click(button('Remove link 1'));
      await click(button('Save'));
      expect(links(api)?.map((l) => l.network)).toEqual(['Telegram']);
    });

    it('Renaming Tigy: saves the new name', async () => {
      const { api, page, button, click, type } = await open('tigy');
      expect(text(page())).toContain("The site's own person");
      await type(
        page().querySelector<HTMLInputElement>('#name')!,
        ' Tigy Tiger ',
      );
      await click(button('Save'));
      expect(api.updates).toEqual([
        { id: 'tigy', edits: { name: 'Tigy Tiger' } },
      ]);
    });

    it('Empty name: says a name is required and does not save', async () => {
      const { api, page, button, click, type } = await open('bramble');
      await type(page().querySelector<HTMLInputElement>('#name')!, '  ');
      await click(button('Save'));
      expect(text(page().querySelector('[role=alert]'))).toBe('Enter a name.');
      expect(api.updates).toEqual([]);
    });

    it('asks before leaving with unsaved edits', async () => {
      const confirm = new FakeConfirmService(false);
      const { page, type } = await open('bramble', { confirm });
      await type(page().querySelector<HTMLInputElement>('#name')!, 'Brambles');
      await TestBed.inject(Router).navigateByUrl('/people');
      expect(confirm.asked[0].title).toBe('Leave without saving?');
      expect(TestBed.inject(Router).url).toBe('/people/bramble');
    });
  });

  describe('pasting a profile address', () => {
    async function pasted(address: string, before: Partial<SocialLink> = {}) {
      const view = await open('bramble');
      await view.click(view.button('Add a link'));
      const fields = view.linkFields(0);
      if (before.handle) await view.type(fields.handle, before.handle);
      await view.paste(fields.url!, address);
      return view.linkFields(0);
    }

    it('Bluesky profile: fills Bluesky and "@bramble.bsky.social"', async () => {
      const fields = await pasted(
        'https://bsky.app/profile/bramble.bsky.social',
      );
      expect([fields.network?.value, fields.handle?.value]).toEqual([
        'Bluesky',
        '@bramble.bsky.social',
      ]);
    });

    it('Fur Affinity profile: fills Fur Affinity and "bramble"', async () => {
      const fields = await pasted('https://www.furaffinity.net/user/bramble/');
      expect([fields.network?.value, fields.handle?.value]).toEqual([
        'Fur Affinity',
        'bramble',
      ]);
    });

    it('Twitter under its new address: fills Twitter and "@bramble"', async () => {
      const fields = await pasted('https://x.com/bramble');
      expect([fields.network?.value, fields.handle?.value]).toEqual([
        'Twitter',
        '@bramble',
      ]);
    });

    it('Unknown site: leaves the network and handle empty', async () => {
      const fields = await pasted('https://bramble.example/art');
      expect([fields.network?.value, fields.handle?.value]).toEqual(['', '']);
    });

    it('keeps a handle the owner already typed', async () => {
      const fields = await pasted('https://x.com/bramble', {
        handle: 'Bramble the fox',
      });
      expect([fields.network?.value, fields.handle?.value]).toEqual([
        'Twitter',
        'Bramble the fox',
      ]);
    });
  });

  describe('avatar', () => {
    it('Small picture: saves the largest square of a 300 by 200 picture as a 200 pixel WebP', async () => {
      const { api, canvas, page, button, click, pick } = await open('bramble');
      await pick(new File([PNG_BYTES], 'small.png'));
      expect(page().querySelector('app-avatar-cropper')).not.toBeNull();
      await click(button('Save'));
      expect(output(canvas.encoded[0]).size).toBe(200);
      expect(api.avatars.get('bramble')?.size).toBe(200);
      expect(api.updates).toEqual([
        { id: 'bramble', edits: { avatar: 'people/bramble/avatar.webp' } },
      ]);
    });

    it('Removing the avatar: removes the field and the file on save', async () => {
      const { api, button, click } = await open('tigy');
      await click(button('Remove'));
      await click(button('Save'));
      expect(api.updates).toEqual([{ id: 'tigy', edits: { avatar: null } }]);
      expect(api.deletedAvatars).toEqual(['tigy']);
    });

    it('Unsupported file: says which formats work and keeps the current avatar', async () => {
      const error = vi.spyOn(toast, 'error');
      const { page, pick } = await open('tigy');
      await pick(new File(['....ftypheic'], 'photo.heic'));
      await vi.waitFor(() => expect(error).toHaveBeenCalled());
      expect(error).toHaveBeenCalledWith("photo.heic can't be an avatar", {
        description: 'Only JPEG, PNG, GIF and WebP are supported.',
      });
      expect(page().querySelector('app-avatar-cropper')).toBeNull();
    });
  });

  describe('deleting', () => {
    it('Deleting an uncredited person: deletes after confirming and shows the People page', async () => {
      const deletePerson = vi.fn(async () => ({ deleted: true as const }));
      const { button, click, update } = await open('bramble', {
        callables: { deletePerson },
      });
      await click(button('Delete'));
      await update();
      expect(deletePerson).toHaveBeenCalledWith('bramble');
      expect(TestBed.inject(Router).url).toBe('/people');
    });

    it('Deleting a credited person: refuses, linking each crediting artwork to its editor', async () => {
      const deletePerson = vi.fn(async () => ({
        deleted: false as const,
        creditedBy: [{ id: 'a1', title: 'Pool day' }, { id: 'u2' }],
      }));
      const { page, button, click } = await open('bramble', {
        callables: { deletePerson },
      });
      await click(button('Delete'));
      const alert = page().querySelector('[role=alert]');
      expect(text(alert)).toContain("Bramble can't be deleted");
      expect(
        [...(alert?.querySelectorAll('a') ?? [])].map((a) => [
          text(a),
          a.getAttribute('href'),
        ]),
      ).toEqual([
        ['Pool day', '/artworks/a1'],
        ['Untitled (u2)', '/artworks/u2'],
      ]);
      expect(TestBed.inject(Router).url).toBe('/people/bramble');
    });

    it('Tigy: offers no delete', async () => {
      const { button } = await open('tigy');
      expect(button('Delete')).toBeUndefined();
    });
  });
});
