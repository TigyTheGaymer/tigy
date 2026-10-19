import { Location } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';
import { rememberedGallery } from '../gallery-address';
import { Mark } from '../markings/mark';
import { NsfwSwitch } from '../nsfw/nsfw-switch';
import { GalleryPlaceService } from '../pages/home/gallery-place.service';
import { ThemeButton } from '../theme/theme-button';

/** The bar over the dark stage: back, the logo, the theme and the NSFW switch, plus the page's own buttons. */
@Component({
  selector: 'app-stage-bar',
  imports: [RouterLink, LucideArrowLeft, Mark, NsfwSwitch, ThemeButton],
  styleUrl: './stage-bar.css',
  template: `
    <div class="stage-top">
      <div class="side">
        <a
          class="round"
          [href]="backHref()"
          aria-label="Back to the gallery"
          title="Back to the gallery"
          (click)="goBack($event)"
          ><svg lucideArrowLeft class="icon" aria-hidden="true"></svg
        ></a>
        <a class="logo" routerLink="/"><app-mark />Tigy</a>
      </div>
      <div class="side">
        <app-theme-button />
        <app-nsfw-switch />
        <ng-content />
      </div>
    </div>
  `,
})
export class StageBar {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly place = inject(GalleryPlaceService);

  /** The gallery this tab came from; the server and the first browser render say `/`. */
  private readonly remembered = signal('/');
  protected readonly backHref = computed(() => this.remembered());

  constructor() {
    afterNextRender(() => this.remembered.set(rememberedGallery() ?? '/'));
  }

  /** Back in history to the visitor's place when they came from the gallery (design D10). */
  goBack(event?: Event): void {
    event?.preventDefault();
    if (this.place.isFromGallery()) {
      this.location.back();
    } else {
      void this.router.navigateByUrl(this.remembered());
    }
  }
}
