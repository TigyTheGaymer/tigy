import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { PickerChoice } from '../picker-choices';
import { FilterPicker } from './filter-picker';

const CHOICES: PickerChoice[] = [
  {
    key: 'bramble',
    name: 'Bramble',
    count: 2,
    isSelected: true,
    params: {},
  },
  {
    key: 'tigy',
    name: 'Tigy',
    count: 5,
    avatar: '/avatars/tigy.webp',
    isSelected: false,
    params: { character: ['bramble', 'tigy'] },
  },
  {
    key: 'kitsu',
    name: 'kitsu',
    count: 1,
    isSelected: false,
    params: { character: ['bramble', 'kitsu'] },
  },
];

describe('FilterPicker', () => {
  const { showModal, close } = HTMLDialogElement.prototype;

  beforeEach(() => {
    // jsdom has no showModal(), close() or matchMedia().
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    TestBed.configureTestingModule({
      imports: [FilterPicker],
      providers: [provideRouter([])],
    });
  });

  afterEach(() => {
    Object.assign(HTMLDialogElement.prototype, { showModal, close });
    vi.unstubAllGlobals();
  });

  async function render(name = 'Characters', isSearchable = true) {
    const fixture = TestBed.createComponent(FilterPicker);
    fixture.componentRef.setInput('name', name);
    fixture.componentRef.setInput('icon', 'lucideUsers');
    fixture.componentRef.setInput('choices', CHOICES);
    fixture.componentRef.setInput('isSearchable', isSearchable);
    fixture.componentRef.setInput('hasPeople', true);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const chip = element.querySelector<HTMLButtonElement>('button.chip')!;
    const dialog = () => element.querySelector('dialog');
    const links = () => [
      ...element.querySelectorAll<HTMLAnchorElement>('dialog .choice'),
    ];
    const open = async () => {
      chip.click();
      await fixture.whenStable();
    };
    return { fixture, element, chip, dialog, links, open };
  }

  it('Pressing a picker: opens its choices with their counts', async () => {
    const { chip, dialog, links, open } = await render();
    expect(dialog()).toBeNull();
    expect(chip.getAttribute('aria-expanded')).toBe('false');

    await open();

    expect(dialog()?.open).toBe(true);
    expect(chip.getAttribute('aria-expanded')).toBe('true');
    expect(links().map((a) => a.getAttribute('aria-label'))).toEqual([
      'Bramble, 2 pieces, selected',
      'Tigy, 5 pieces',
      'kitsu, 1 piece',
    ]);
  });

  it('marks the selected choice and links each choice to its toggled address', async () => {
    const { links, open } = await render();
    await open();
    const [bramble, tigy] = links();
    expect(bramble.classList).toContain('is-selected');
    expect(bramble.getAttribute('href')).toBe('/');
    expect(tigy.classList).not.toContain('is-selected');
    expect(tigy.getAttribute('href')).toBe(
      '/?character=bramble&character=tigy',
    );
  });

  it('Picking a choice: navigates without the scroll to the top and stays open', async () => {
    const { dialog, links, open } = await render();
    await open();
    const navigate = vi
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);

    links()[1].click();

    expect(navigate).toHaveBeenCalledWith(['/'], {
      queryParams: { character: ['bramble', 'tigy'] },
      state: { keepGallery: true },
      scroll: 'manual',
    });
    expect(dialog()?.open).toBe(true);
  });

  it('leaves a modified click to the browser, to open a tab', async () => {
    const { links, open } = await render();
    await open();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    const click = new MouseEvent('click', { ctrlKey: true, cancelable: true });

    links()[1].dispatchEvent(click);

    expect(navigate).not.toHaveBeenCalled();
    expect(click.defaultPrevented).toBe(false);
  });

  it('shows the avatar, or the initial when there is none', async () => {
    const { links, open } = await render();
    await open();
    const [bramble, tigy] = links();
    expect(tigy.querySelector('.dot img')?.getAttribute('src')).toBe(
      '/avatars/tigy.webp',
    );
    expect(bramble.querySelector('.dot')?.textContent?.trim()).toBe('B');
  });

  it('Searching a picker: narrows the list by name, ignoring case', async () => {
    const { element, fixture, links, open } = await render();
    await open();
    const field = element.querySelector<HTMLInputElement>(
      'input[type="search"]',
    )!;
    field.value = 'BRA';
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(links().map((a) => a.querySelector('.name')?.textContent)).toEqual([
      'Bramble',
    ]);

    field.value = 'zzz';
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(element.querySelector('dialog .empty')?.textContent?.trim()).toBe(
      'No matches',
    );
  });

  it('has no search field in the Year picker', async () => {
    const { element, open } = await render('Year', false);
    await open();
    expect(element.querySelector('input[type="search"]')).toBeNull();
  });

  it('Closing a picker: returns focus to its chip and clears the search', async () => {
    const { element, fixture, chip, dialog, open } = await render();
    await open();
    const field = element.querySelector<HTMLInputElement>(
      'input[type="search"]',
    )!;
    field.value = 'bra';
    field.dispatchEvent(new Event('input'));
    element.querySelector<HTMLButtonElement>('button.close')!.click();
    await fixture.whenStable();

    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(chip);

    await open();
    expect(
      element.querySelector<HTMLInputElement>('input[type="search"]')!.value,
    ).toBe('');
  });

  it('closes on a press outside the panel, but not inside it', async () => {
    const { element, fixture, dialog, open } = await render();
    await open();
    element.querySelector<HTMLElement>('dialog .panel')!.click();
    await fixture.whenStable();
    expect(dialog()?.open).toBe(true);

    dialog()!.click();
    await fixture.whenStable();
    expect(dialog()).toBeNull();
  });

  it('Pressing another chip while a dropdown is open: closes it and presses the chip too', async () => {
    const { dialog, fixture, open } = await render();
    await open();
    const other = document.createElement('button');
    const press = vi.fn();
    other.addEventListener('click', press);
    document.elementFromPoint = () => other;
    onTestFinished(() => {
      delete (document as Partial<Document>).elementFromPoint;
    });

    dialog()!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, ctrlKey: true }),
    );
    await fixture.whenStable();

    expect(dialog()).toBeNull();
    expect(press).toHaveBeenCalledOnce();
    expect(press.mock.calls[0][0].ctrlKey).toBe(true);
  });

  it('Pressing its own chip while open: only closes it', async () => {
    const { chip, dialog, fixture, open } = await render();
    await open();
    const press = vi.fn();
    chip.addEventListener('click', press);
    document.elementFromPoint = () => chip;
    onTestFinished(() => {
      delete (document as Partial<Document>).elementFromPoint;
    });

    dialog()!.click();
    await fixture.whenStable();

    expect(dialog()).toBeNull();
    expect(press).not.toHaveBeenCalled();
  });

  it('keeps the list steady while open: a choice that stops matching stays, unavailable', async () => {
    const { fixture, links, open } = await render();
    await open();
    fixture.componentRef.setInput('choices', [
      { ...CHOICES[2], count: 1 },
      { ...CHOICES[0], count: 1 },
    ]);
    await fixture.whenStable();

    const [bramble, tigy, kitsu] = links();
    expect(links().map((a) => a.dataset['key'])).toEqual([
      'bramble',
      'tigy',
      'kitsu',
    ]);
    expect(tigy.getAttribute('aria-label')).toBe('Tigy, 0 pieces');
    expect(tigy.getAttribute('aria-disabled')).toBe('true');
    expect(tigy.hasAttribute('href')).toBe(false);
    expect(bramble.hasAttribute('aria-disabled')).toBe(false);
    expect(kitsu.getAttribute('href')).toBe(
      '/?character=bramble&character=kitsu',
    );

    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    tigy.click();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('orders the list afresh when it opens again', async () => {
    const { element, fixture, links, open } = await render();
    await open();
    fixture.componentRef.setInput('choices', [CHOICES[2], CHOICES[0]]);
    element.querySelector<HTMLButtonElement>('button.close')!.click();
    await fixture.whenStable();
    await open();
    expect(links().map((a) => a.dataset['key'])).toEqual(['kitsu', 'bramble']);
  });

  it('marks the list busy while the next choices load', async () => {
    const { element, fixture, open } = await render();
    fixture.componentRef.setInput('isLoading', true);
    await open();
    expect(
      element.querySelector('dialog .choices')?.getAttribute('aria-busy'),
    ).toBe('true');
  });
});
