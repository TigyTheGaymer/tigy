import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { warnBeforeLeaving } from './leave-warning';

@Component({ template: '' })
class Page {
  readonly isDirty = signal(false);
  constructor() {
    warnBeforeLeaving(() => this.isDirty());
  }
}

function leave(): boolean {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe('warnBeforeLeaving', () => {
  it('asks only while the signal is true', async () => {
    const fixture = TestBed.createComponent(Page);
    await fixture.whenStable();
    expect(leave()).toBe(false);

    fixture.componentInstance.isDirty.set(true);
    await fixture.whenStable();
    expect(leave()).toBe(true);

    fixture.componentInstance.isDirty.set(false);
    await fixture.whenStable();
    expect(leave()).toBe(false);
  });

  it('stops asking once the page is gone', async () => {
    const fixture = TestBed.createComponent(Page);
    fixture.componentInstance.isDirty.set(true);
    await fixture.whenStable();
    fixture.destroy();
    expect(leave()).toBe(false);
  });
});
