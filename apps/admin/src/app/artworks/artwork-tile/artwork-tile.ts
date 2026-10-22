import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { imagePaths } from '@tigy/models';
import { storageUrl } from '../../firebase/storage-url';
import { dateOf, GAP_LABELS, titleOf } from '../artwork-label';
import { missing, type Artwork } from '../artworks.service';
import { WarningBadge } from '../warning-badge';

export interface SelectionChange {
  isSelected: boolean;
  /** Shift was held: every tile from the last one toggled to this one follows. */
  isRange: boolean;
}

@Component({
  selector: 'app-artwork-tile',
  imports: [HlmBadgeImports, HlmCheckboxImports, RouterLink, WarningBadge],
  templateUrl: './artwork-tile.html',
})
export class ArtworkTile {
  readonly artwork = input.required<Artwork>();
  readonly isSelected = input(false);
  /** The view and search the tile is listed in, carried to the editor. */
  readonly listParams = input<Record<string, string | null>>({});
  readonly isNeedsWork = input(false);
  readonly selectedChange = output<SelectionChange>();

  /** Whether the press that is toggling the box held Shift. */
  protected isRange = false;

  protected readonly title = computed(() => titleOf(this.artwork()));
  protected readonly date = computed(() => dateOf(this.artwork()));
  protected readonly thumbnail = computed(() =>
    storageUrl(imagePaths.thumb(this.artwork().id)),
  );
  /** Every gap on Needs work; elsewhere only a missing artist. */
  protected readonly warnings = computed(() => {
    const gaps = missing(this.artwork());
    return (this.isNeedsWork() ? gaps : gaps.filter((g) => g === 'artist')).map(
      (gap) => GAP_LABELS[gap],
    );
  });

  protected onPress(event: MouseEvent): void {
    this.isRange = event.shiftKey;
    // Shift-clicking would otherwise select the page's text.
    if (event.shiftKey) event.preventDefault();
  }
}
