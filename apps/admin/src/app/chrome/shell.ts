import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopBar } from './top-bar';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, TopBar],
  template: `
    <app-top-bar />
    <main class="mx-auto w-full max-w-5xl p-4">
      <router-outlet />
    </main>
  `,
})
export class Shell {}
