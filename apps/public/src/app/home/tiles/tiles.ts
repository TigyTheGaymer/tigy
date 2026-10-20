import { Component, ElementRef, input, viewChildren } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Paw } from '../../markings/paw';
import type { Tile } from './tile';

/** About the first row on a wide screen; the rest load as they near the screen. */
const EAGER_TILES = 6;

@Component({
  selector: 'app-tiles',
  imports: [RouterLink, Paw],
  templateUrl: './tiles.html',
  styleUrl: './tiles.css',
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
