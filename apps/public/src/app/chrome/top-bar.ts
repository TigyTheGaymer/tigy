import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Mark } from '../markings/mark';
import { NsfwSwitch } from '../nsfw/nsfw-switch';
import { ThemeButton } from '../theme/theme-button';

@Component({
  selector: 'app-top-bar',
  imports: [RouterLink, Mark, NsfwSwitch, ThemeButton],
  template: `
    <header class="topbar">
      <a class="logo" routerLink="/"><app-mark />Tigy</a>
      <div class="topbar-right">
        <app-theme-button />
        <app-nsfw-switch />
      </div>
    </header>
  `,
})
export class TopBar {}
