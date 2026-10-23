import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from '../app';
import { appRoutes } from '../app.routes';

describe('SiteFooter', () => {
  it('Footer on every page: the app ends with a link to the privacy page', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(appRoutes),
        { provide: RESPONSE_INIT, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.lastElementChild?.tagName).toBe('APP-SITE-FOOTER');
    expect(
      element.querySelector('footer a')?.getAttribute('href'),
    ).toBe('/privacy');
  });
});
