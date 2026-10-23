import { Component, inject } from '@angular/core';
import { StageBar } from '../chrome/stage-bar';
import { HeadService } from '../head/head.service';

@Component({
  selector: 'app-privacy',
  imports: [StageBar],
  templateUrl: './privacy.html',
  styleUrl: './privacy.css',
})
export class PrivacyPage {
  constructor() {
    inject(HeadService).siteCard();
  }
}
