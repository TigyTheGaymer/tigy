import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { ThemeService } from './theme/theme.service';

@Component({
  imports: [RouterOutlet, HlmToasterImports],
  selector: 'app-root',
  template: `
    <router-outlet />
    <hlm-toaster [theme]="theme.theme()" />
  `,
})
export class App {
  protected readonly theme = inject(ThemeService);
}
