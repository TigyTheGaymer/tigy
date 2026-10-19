import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Paw } from '../../markings/paw';
import type { Tile } from './tile';

@Component({
  selector: 'app-tiles',
  imports: [RouterLink, Paw],
  styleUrl: './tiles.css',
  template: `
    <ul class="tiles">
      @for (tile of tiles(); track tile.id; let odd = $odd) {
        <li class="tile" [style.--shape]="tile.shape" [class.tilt]="odd">
          <a [routerLink]="['/i', tile.id]" [attr.aria-label]="tile.alt + (tile.isNsfw ? ', NSFW' : '')">
            <img
              [src]="tile.src"
              [width]="tile.width"
              [height]="tile.height"
              alt=""
              decoding="async"
            />
            @if (tile.isNsfw) {
              <span class="badge" aria-hidden="true">NSFW</span>
            }
            <span class="label" aria-hidden="true">{{ tile.alt }}</span>
            <span class="paws" aria-hidden="true"><app-paw /><app-paw /><app-paw /></span>
          </a>
        </li>
      }
    </ul>
  `,
})
export class Tiles {
  readonly tiles = input.required<readonly Tile[]>();
}
