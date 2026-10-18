import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeadService } from '../../head/head.service';
import { injectServerResponse } from '../../server-response';

/** Also shown for a missing or unpublished artwork. */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <section class="not-found">
      <h1>Not found</h1>
      <p>There is nothing at this address.</p>
      <p><a routerLink="/">Go to the gallery</a></p>
    </section>
  `,
})
export class NotFoundPage {
  constructor() {
    injectServerResponse().notFound();
    inject(HeadService).siteCard();
  }
}
