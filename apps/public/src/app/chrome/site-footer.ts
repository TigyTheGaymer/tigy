import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  styles: `
    footer {
      padding: 18px var(--gutter) 22px;
      background: var(--stage);
      color: var(--on-stage);
      font-size: var(--text-small);
      font-weight: 700;
      text-align: center;
    }
  `,
  template: `
    <footer>
      <a routerLink="/privacy">Privacy</a>
    </footer>
  `,
})
export class SiteFooter {}
