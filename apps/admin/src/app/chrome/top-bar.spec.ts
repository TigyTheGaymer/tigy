import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FakeAuthApi, OWNER } from '../testing';
import { toast } from '@spartan-ng/brain/sonner';
import { AUTH_API } from '../firebase/firebase';
import { CALLABLES, type Callables } from '../firebase/functions';
import { TopBar } from './top-bar';

describe('TopBar', () => {
  it('Signing out: signs out and shows the sign-in page in place of the current one', async () => {
    const api = new FakeAuthApi();
    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_API, useValue: api },
        provideRouter([
          { path: 'uploads', component: TopBar },
          { path: 'sign-in', children: [] },
        ]),
      ],
    });
    api.emit(OWNER);
    const harness = await RouterTestingHarness.create('/uploads');
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl');

    const bar = harness.routeNativeElement as HTMLElement;
    (bar.querySelector('button[aria-label=Account]') as HTMLElement).click();
    await harness.fixture.whenStable();
    const signOut = [
      ...document.querySelectorAll('[hlmDropdownMenuItem]'),
    ].find((item) => item.textContent?.includes('Sign out')) as HTMLElement;
    signOut.click();
    await harness.fixture.whenStable();

    expect(api.signOutCount).toBe(1);
    expect(navigate).toHaveBeenCalledWith('/sign-in', { replaceUrl: true });
    expect(router.url).toBe('/sign-in');
  });

  it("shows the signed-in account's initial", async () => {
    const api = new FakeAuthApi();
    TestBed.configureTestingModule({
      providers: [{ provide: AUTH_API, useValue: api }, provideRouter([])],
    });
    api.emit(OWNER);
    await Promise.resolve();
    const fixture = TestBed.createComponent(TopBar);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('T');
    expect(fixture.nativeElement.textContent).toContain('Tigy admin');
  });
});

describe('TopBar pages', () => {
  async function open(callables: Partial<Callables> = {}) {
    const api = new FakeAuthApi();
    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_API, useValue: api },
        { provide: CALLABLES, useValue: callables },
        provideRouter([
          { path: 'artworks', component: TopBar },
          { path: 'people', component: TopBar },
          { path: 'uploads', component: TopBar },
        ]),
      ],
    });
    api.emit(OWNER);
    const harness = await RouterTestingHarness.create('/people');
    const bar = () => harness.routeNativeElement as HTMLElement;
    const openMenu = async (label: string) => {
      (
        bar().querySelector(`button[aria-label=${label}]`) as HTMLElement
      ).click();
      await harness.fixture.whenStable();
    };
    return { harness, bar, openMenu };
  }

  const item = (text: string) =>
    [...document.querySelectorAll<HTMLElement>('[hlmDropdownMenuItem]')].find(
      (element) => element.textContent?.includes(text),
    );

  it('links to Artworks, People and Uploads on a desktop, marking the current page', async () => {
    const { bar } = await open();
    const nav = bar().querySelector('nav') as HTMLElement;
    expect(nav.className).toContain('md:flex');
    expect(nav.className).toContain('hidden');
    const links = [...nav.querySelectorAll('a')];
    expect(links.map((a) => a.textContent?.trim())).toEqual([
      'Artworks',
      'People',
      'Uploads',
    ]);
    expect(links.map((a) => a.getAttribute('aria-current'))).toEqual([
      null,
      'page',
      null,
    ]);
  });

  it('collapses the links into a menu on a phone', async () => {
    const { bar, openMenu, harness } = await open();
    const menu = bar().querySelector('button[aria-label=Pages]') as HTMLElement;
    expect(menu.className).toContain('md:hidden');
    await openMenu('Pages');
    expect(item('People')?.getAttribute('aria-current')).toBe('page');
    item('Uploads')?.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/uploads');
  });

  it('keeps the site tools apart from the account, with a link to the public site', async () => {
    const { openMenu } = await open();
    await openMenu('"Site tools"');
    expect(item('View public site')?.getAttribute('href')).toMatch(
      /^https?:\/\//,
    );
    expect(item('Rebuild summaries')).toBeDefined();
    expect(item('Credit Tigy on every artwork')).toBeDefined();
    expect(item('Sign out')).toBeUndefined();
  });

  it('switches the theme from the account menu, marking the current choice', async () => {
    localStorage.clear();
    const { openMenu, harness } = await open();
    await openMenu('Account');
    expect(item('Device setting')?.getAttribute('aria-checked')).toBe('true');
    item('Dark')?.click();
    await harness.fixture.whenStable();
    expect(document.documentElement.dataset['theme']).toBe('dark');
    await openMenu('Account');
    expect(item('Dark')?.getAttribute('aria-checked')).toBe('true');
    item('Device setting')?.click();
    await harness.fixture.whenStable();
  });

  it('Rebuild summaries: confirms with what was rebuilt', async () => {
    const rebuildSummaries = vi.fn(async () => ({
      images: 317,
      people: 12,
      tags: 40,
    }));
    const success = vi.spyOn(toast, 'success');
    const { openMenu, harness } = await open({ rebuildSummaries });
    await openMenu('"Site tools"');
    item('Rebuild summaries')?.click();
    await harness.fixture.whenStable();
    expect(rebuildSummaries).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenCalledWith('Summaries rebuilt', {
      description: 'From 317 artworks, 12 people and 40 tags.',
    });
  });

  it('says when rebuilding the summaries fails', async () => {
    const error = vi.spyOn(toast, 'error');
    const { openMenu, harness } = await open({
      rebuildSummaries: () => Promise.reject(new Error('internal')),
    });
    await openMenu('"Site tools"');
    item('Rebuild summaries')?.click();
    await harness.fixture.whenStable();
    expect(error).toHaveBeenCalledWith(
      "The summaries couldn't be rebuilt. Try again.",
    );
  });

  it.each([
    [3, 'Tigy credited', 'Added to 3 artworks.'],
    [1, 'Tigy credited', 'Added to 1 artwork.'],
    [0, 'Nothing to change', 'Every artwork already credits Tigy.'],
  ])(
    'Credit Tigy: says what changed for %i',
    async (changed, title, description) => {
      const creditTigy = vi.fn(async () => ({ changed }));
      const success = vi.spyOn(toast, 'success');
      const { openMenu, harness } = await open({ creditTigy });
      await openMenu('"Site tools"');
      item('Credit Tigy on every artwork')?.click();
      await harness.fixture.whenStable();
      expect(creditTigy).toHaveBeenCalledTimes(1);
      expect(success).toHaveBeenCalledWith(title, { description });
    },
  );

  it('disables Credit Tigy while it runs', async () => {
    let finish!: (result: { changed: number }) => void;
    const creditTigy = vi.fn(
      () => new Promise<{ changed: number }>((resolve) => (finish = resolve)),
    );
    const { openMenu } = await open({ creditTigy });
    // A menu that is closing keeps its items until it is gone, so take the newest.
    const isDisabled = () =>
      [...document.querySelectorAll<HTMLElement>('[hlmDropdownMenuItem]')]
        .filter((el) => el.textContent?.includes('Credit Tigy'))
        .at(-1)
        ?.hasAttribute('disabled');
    await openMenu('"Site tools"');
    item('Credit Tigy on every artwork')?.click();
    await openMenu('"Site tools"');
    expect(isDisabled()).toBe(true);
    finish({ changed: 0 });
    await vi.waitFor(() => expect(isDisabled()).toBe(false));
  });

  it('says when crediting Tigy fails', async () => {
    const error = vi.spyOn(toast, 'error');
    const { openMenu, harness } = await open({
      creditTigy: () => Promise.reject(new Error('internal')),
    });
    await openMenu('"Site tools"');
    item('Credit Tigy on every artwork')?.click();
    await harness.fixture.whenStable();
    expect(error).toHaveBeenCalledWith("Tigy couldn't be credited. Try again.");
  });
});
