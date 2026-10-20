import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StageBar } from '../chrome/stage-bar';
import { HeadService } from '../head/head.service';
import { injectServerResponse } from '../head/server-response';
import { Paw } from '../markings/paw';

/** Also shown for a missing or unpublished artwork. */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink, StageBar, Paw],
  styles: `
    main {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 100svh;
      background: var(--stage);
    }
  `,
  template: `
    <main>
      <app-stage-bar />
      <section class="stage-panel" aria-labelledby="not-found-heading">
        <h1 id="not-found-heading">No tiger here</h1>
        <p>There's nothing at this address: no page, or no published piece.</p>
        <a class="pad dark" routerLink="/"><app-paw />Back to the gallery</a>
      </section>
    </main>
  `,
})
export class NotFoundPage {
  constructor() {
    injectServerResponse().notFound();
    inject(HeadService).siteCard();
  }
}
