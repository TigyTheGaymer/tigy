import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NsfwSwitchService } from './nsfw/nsfw-switch.service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly nsfwSwitch = inject(NsfwSwitchService);
}
