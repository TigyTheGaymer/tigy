import { TestBed } from '@angular/core/testing';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  async function create(
    inputs: Partial<{ kind: string; isDelayed: boolean }> = {},
  ) {
    const fixture = TestBed.createComponent(Skeleton);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('is hidden from screen readers and draws one block for the stage', async () => {
    const element = await create();
    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.querySelectorAll('.bar.block')).toHaveLength(1);
    expect(element.classList.contains('is-delayed')).toBe(false);
  });

  it('draws a title and rows for the details', async () => {
    const element = await create({ kind: 'details' });
    expect(element.querySelectorAll('.bar.title')).toHaveLength(1);
    expect(element.querySelectorAll('.bar').length).toBeGreaterThan(1);
  });

  it('marks a delayed wait', async () => {
    const element = await create({ isDelayed: true });
    expect(element.classList.contains('is-delayed')).toBe(true);
  });
});
