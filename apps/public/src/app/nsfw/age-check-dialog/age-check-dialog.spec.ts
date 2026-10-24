import { TestBed } from '@angular/core/testing';
import { AgeCheckDialog } from './age-check-dialog';
import { AgeCheckService } from '../age-check.service';

describe('AgeCheckDialog', () => {
  const { showModal, close } = HTMLDialogElement.prototype;

  beforeEach(() => {
    localStorage.clear();
    // jsdom has no showModal() or close().
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
    TestBed.configureTestingModule({ imports: [AgeCheckDialog] });
  });

  afterEach(() => {
    Object.assign(HTMLDialogElement.prototype, { showModal, close });
  });

  async function render() {
    const fixture = TestBed.createComponent(AgeCheckDialog);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const dialog = () => element.querySelector('dialog');
    const ageCheck = TestBed.inject(AgeCheckService);
    const action = vi.fn();
    const ask = async () => {
      ageCheck.confirm(action);
      await fixture.whenStable();
    };
    const enter = async (birthday: string) => {
      element.querySelector<HTMLInputElement>('input[type="date"]')!.value =
        birthday;
      element
        .querySelector<HTMLButtonElement>('button[type="submit"]')!
        .click();
      await fixture.whenStable();
    };
    const button = (name: string) =>
      [...element.querySelectorAll<HTMLButtonElement>('button')].find(
        (button) => button.textContent?.includes(name),
      )!;
    return { fixture, element, dialog, ageCheck, action, ask, enter, button };
  }

  it('renders nothing until something asks, as on the server', async () => {
    const { element } = await render();
    expect(element.innerHTML).not.toContain('dialog');
    expect(element.textContent).not.toContain('NSFW');
  });

  it('opens on a request, and an adult birthday passes and closes it', async () => {
    const { dialog, ageCheck, action, ask, enter } = await render();
    await ask();
    expect(dialog()?.open).toBe(true);
    expect(dialog()?.querySelector('label')?.textContent).toContain(
      'Your birthday',
    );

    await enter('1990-05-01');
    expect(action).toHaveBeenCalledOnce();
    expect(ageCheck.isPassed()).toBe(true);
    expect(dialog()).toBeNull();
  });

  it('turns down a birthday under 18 and stores nothing', async () => {
    const { fixture, element, dialog, ageCheck, action, ask, enter, button } =
      await render();
    await ask();
    const lastYear = new Date().getFullYear() - 1;
    await enter(`${lastYear}-01-01`);
    expect(dialog()?.open).toBe(true);
    expect(element.textContent).toContain(
      'NSFW art isn’t available to visitors under 18.',
    );
    expect(action).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(document.activeElement?.textContent?.trim()).toBe('Close');

    button('Close').click();
    await fixture.whenStable();
    expect(dialog()).toBeNull();
    expect(ageCheck.isPending()).toBe(false);
  });

  it('keeps asking on an empty, too early or future birthday', async () => {
    const { dialog, action, ask, enter } = await render();
    await ask();
    await enter('');
    await enter('1850-01-01');
    await enter(`${new Date().getFullYear() + 1}-01-01`);
    expect(dialog()?.open).toBe(true);
    expect(action).not.toHaveBeenCalled();
  });

  it('closing leaves everything as it was, and the next request asks again', async () => {
    const { fixture, dialog, ageCheck, action, ask, button } = await render();
    await ask();
    button('Cancel').click();
    await fixture.whenStable();
    expect(dialog()).toBeNull();
    expect(ageCheck.isPending()).toBe(false);
    expect(action).not.toHaveBeenCalled();

    await ask();
    expect(dialog()?.open).toBe(true);
  });

  it('offers today as the latest birthday', async () => {
    const { element, ask } = await render();
    await ask();
    const input = element.querySelector<HTMLInputElement>('input')!;
    const now = new Date();
    expect(input.max).toBe(
      [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-'),
    );
    expect(input.min).toBe('1900-01-01');
  });
});
