import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteFooter } from './chrome/site-footer';

@Component({
  imports: [RouterOutlet, SiteFooter],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {}
