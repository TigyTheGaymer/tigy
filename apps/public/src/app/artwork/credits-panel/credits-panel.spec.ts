import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ArtworkResponse } from '../../../api/types';
import { artwork } from '../../testing';
import { CreditsPanel } from './credits-panel';

describe('CreditsPanel', () => {
  async function create(inputs: {
    page?: ArtworkResponse;
    isWaiting?: boolean;
  }): Promise<HTMLElement> {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(CreditsPanel);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('Nothing to show yet: draws skeleton rows without any details', async () => {
    const panel = await create({ isWaiting: true });
    expect(panel.querySelector('h1')).toBeNull();
    expect(panel.querySelector('.row')).toBeNull();
    const skeleton = panel.querySelector('app-skeleton')!;
    expect(skeleton.classList.contains('is-over')).toBe(false);
    expect(panel.querySelector('article')?.getAttribute('aria-busy')).toBe(
      'true',
    );
    expect(
      panel.querySelector('article')?.hasAttribute('aria-labelledby'),
    ).toBe(false);
  });

  it('With a page: draws the real rows and no skeleton', async () => {
    const panel = await create({ page: artwork({ title: 'Hey Pookie!' }) });
    expect(panel.querySelector('h1')?.textContent).toContain('Hey Pookie!');
    expect(panel.querySelector('.row')).not.toBeNull();
    expect(panel.querySelector('app-skeleton')).toBeNull();
    expect(panel.querySelector('article')?.hasAttribute('aria-busy')).toBe(
      false,
    );
  });

  it('Waiting with a held page: keeps its rows, with the skeleton over them', async () => {
    const panel = await create({ page: artwork(), isWaiting: true });
    expect(panel.querySelector('.row')).not.toBeNull();
    expect(
      panel.querySelector('app-skeleton')?.classList.contains('is-over'),
    ).toBe(true);
  });

  it('Failed: draws neither details nor a skeleton', async () => {
    const panel = await create({});
    expect(panel.querySelector('h1')).toBeNull();
    expect(panel.querySelector('app-skeleton')).toBeNull();
  });
});
