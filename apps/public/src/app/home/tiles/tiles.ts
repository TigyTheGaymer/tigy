import { Component, ElementRef, input, viewChildren } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Paw } from '../../markings/paw';
import type { Tile } from './tile';

/** About the first row on a wide screen; the rest load as they near the screen. */
const EAGER_TILES = 6;

@Component({
  selector: 'app-tiles',
  imports: [RouterLink, Paw],
  styleUrl: './tiles.css',
  template: `
    <ul class="tiles">
      @for (tile of tiles(); track tile.id; let index = $index, odd = $odd) {
        <li #item class="tile" [style.--shape]="tile.shape" [class.tilt]="odd">
          <a
            [routerLink]="['/i', tile.id]"
            [attr.aria-label]="tile.alt + (tile.isNsfw ? ', NSFW' : '')"
          >
            <img
              [src]="tile.src"
              [width]="tile.width"
              [height]="tile.height"
              alt=""
              [loading]="index < eagerTiles ? 'eager' : 'lazy'"
              decoding="async"
            />
            @if (tile.isNsfw) {
              <span class="badge" aria-hidden="true">NSFW</span>
            }
            <span class="label" aria-hidden="true">{{ tile.alt }}</span>
            <span class="paws" aria-hidden="true"
              ><app-paw /><app-paw /><app-paw
            /></span>
          </a>
        </li>
      }
    </ul>
  `,
})
export class Tiles {
  readonly tiles = input.required<readonly Tile[]>();

  protected readonly eagerTiles = EAGER_TILES;
  private readonly items = viewChildren<ElementRef<HTMLElement>>('item');

  /** False while that tile is not rendered yet. */
  scrollToTile(index: number): boolean {
    const item = this.items()[index]?.nativeElement;
    item?.scrollIntoView({ block: 'center' });
    return !!item;
  }
}
