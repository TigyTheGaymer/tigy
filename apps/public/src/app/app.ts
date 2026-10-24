import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteFooter } from './chrome/site-footer';
import { AgeCheckDialog } from './nsfw/age-check-dialog/age-check-dialog';

@Component({
  imports: [RouterOutlet, SiteFooter, AgeCheckDialog],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {}
