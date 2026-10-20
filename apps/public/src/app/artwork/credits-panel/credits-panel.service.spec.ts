import { ApplicationRef, DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CreditsPanelService } from './credits-panel.service';

/** Runs the first-render callbacks. */
async function rendered(): Promise<void> {
  TestBed.inject(ApplicationRef).tick();
  await TestBed.inject(ApplicationRef).whenStable();
}

describe('CreditsPanelService', () => {
  let root: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    root = TestBed.inject(DOCUMENT).documentElement;
    delete root.dataset['credits'];
  });

  it('is open by default', async () => {
    const panel = TestBed.inject(CreditsPanelService);
    await rendered();
    expect(panel.isOpen()).toBe(true);
  });

  it('Closed panel is remembered: marks the page and the browser', async () => {
    const panel = TestBed.inject(CreditsPanelService);
    await rendered();
    panel.set(false);
    expect(root.dataset['credits']).toBe('closed');
    expect(localStorage.getItem('tigy.credits')).toBe('closed');

    panel.set(true);
    expect(root.dataset['credits']).toBeUndefined();
    expect(localStorage.getItem('tigy.credits')).toBeNull();
  });

  it('reads a closed panel once rendered', async () => {
    localStorage.setItem('tigy.credits', 'closed');
    const panel = TestBed.inject(CreditsPanelService);
    expect(panel.isOpen()).toBe(true);
    await rendered();
    expect(panel.isOpen()).toBe(false);
  });
});
