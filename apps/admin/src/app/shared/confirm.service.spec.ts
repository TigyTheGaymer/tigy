import { TestBed } from '@angular/core/testing';
import { ConfirmService, type Confirmation } from './confirm.service';

const buttons = () =>
  [...document.querySelectorAll<HTMLButtonElement>('[role=alertdialog] button')];
const button = (text: string) =>
  buttons().find((b) => b.textContent?.trim() === text);
const settle = () => new Promise((resolve) => setTimeout(resolve));

const LEAVE: Confirmation = {
  title: 'Leave without saving?',
  confirm: 'Leave',
  cancel: 'Stay',
  alternative: 'Save and leave',
  isDestructive: true,
};

async function ask() {
  const answer = TestBed.inject(ConfirmService).ask({
    title: 'Delete 3 artworks?',
    confirm: 'Delete',
  });
  await settle();
  return answer;
}

async function choose() {
  const answer = TestBed.inject(ConfirmService).choose(LEAVE);
  await settle();
  await settle();
  return answer;
}

describe('ConfirmService', () => {
  it('shows the question and resolves true when confirmed', async () => {
    const answer = ask();
    await settle();
    expect(document.body.textContent).toContain('Delete 3 artworks?');
    button('Delete')?.click();
    expect(await answer).toBe(true);
  });

  it('resolves false when cancelled', async () => {
    const answer = ask();
    await settle();
    button('Cancel')?.click();
    expect(await answer).toBe(false);
  });

  describe('with an alternative', () => {
    it('shows Stay, Leave and the alternative, in that order', async () => {
      const answer = choose();
      await settle();
      expect(buttons().map((b) => b.textContent?.trim())).toEqual([
        'Stay',
        'Leave',
        'Save and leave',
      ]);
      button('Stay')?.click();
      await answer;
    });

    it.each([
      ['Stay', 'cancel'],
      ['Leave', 'confirm'],
      ['Save and leave', 'alternative'],
    ])('resolves %s as %s', async (text, expected) => {
      const answer = choose();
      await settle();
      button(text)?.click();
      expect(await answer).toBe(expected);
    });

    it('resolves cancel on Escape', async () => {
      const answer = choose();
      await settle();
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      expect(await answer).toBe('cancel');
    });
  });
});
