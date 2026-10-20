import { Location } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import { GalleryPlaceService } from '../gallery/gallery-place.service';
import { Mark } from '../markings/mark';
import { NsfwSwitch } from '../nsfw/nsfw-switch';
import { ThemeButton } from '../theme/theme-button';

@Component({
  selector: 'app-stage-bar',
  imports: [RouterLink, NgIcon, Mark, NsfwSwitch, ThemeButton],
  providers: [provideIcons({ lucideArrowLeft })],
  styleUrl: './stage-bar.css',
  template: `
    <div class="stage-top">
      <div class="side">
        <a
          class="round"
          [href]="remembered()"
          aria-label="Back to the gallery"
          title="Back to the gallery"
          (click)="goBack($event)"
          ><ng-icon name="lucideArrowLeft" class="icon"
        /></a>
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

  protected readonly remembered = computed(
    () => this.place.rememberedAddress() ?? '/',
  );

  /** History back, when possible, returns to the gallery at its scroll position. */
  goBack(event?: Event): void {
    event?.preventDefault();
    if (this.place.isFromGallery()) {
      this.location.back();
    } else {
      void this.router.navigateByUrl(this.remembered());
    }
  }
}
