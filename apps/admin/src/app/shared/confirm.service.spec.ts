import { TestBed } from '@angular/core/testing';
import { ConfirmService } from './confirm.service';

const button = (text: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent?.trim() === text,
  );

async function ask() {
  const answer = TestBed.inject(ConfirmService).ask({
    title: 'Delete 3 artworks?',
    confirm: 'Delete',
  });
  await new Promise((resolve) => setTimeout(resolve));
  return answer;
}

describe('ConfirmService', () => {
  it('shows the question and resolves true when confirmed', async () => {
    const answer = ask();
    await new Promise((resolve) => setTimeout(resolve));
    expect(document.body.textContent).toContain('Delete 3 artworks?');
    button('Delete')?.click();
    expect(await answer).toBe(true);
  });

  it('resolves false when cancelled', async () => {
    const answer = ask();
    await new Promise((resolve) => setTimeout(resolve));
    button('Cancel')?.click();
    expect(await answer).toBe(false);
  });
});
