import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTrash2, lucideX } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { ConfirmService } from '../../shared/confirm.service';
import type { BulkEdits } from '../artworks-api';
import { ArtworksService, type Artwork } from '../artworks.service';

export type BulkAction =
  'publish' | 'unpublish' | 'mark-nsfw' | 'unmark-nsfw' | 'delete';

const EDITS: Record<Exclude<BulkAction, 'delete'>, BulkEdits> = {
  publish: { published: true },
  unpublish: { published: false },
  'mark-nsfw': { nsfw: true },
  'unmark-nsfw': { nsfw: false },
};

const DONE: Record<BulkAction, string> = {
  publish: 'Published',
  unpublish: 'Unpublished',
  'mark-nsfw': 'Marked NSFW:',
  'unmark-nsfw': 'Unmarked NSFW:',
  delete: 'Deleted',
};

export const artworkCount = (n: number) =>
  `${n} ${n === 1 ? 'artwork' : 'artworks'}`;

@Component({
  selector: 'app-bulk-bar',
  imports: [HlmButtonImports, NgIcon],
  providers: [provideIcons({ lucideTrash2, lucideX })],
  templateUrl: './bulk-bar.html',
})
export class BulkBar {
  private readonly artworks = inject(ArtworksService);
  private readonly confirm = inject(ConfirmService);

  // Always rendered: an action can empty the view before its write returns,
  // and a destroyed bar could no longer say it is done.
  readonly selected = input.required<Artwork[]>();
  /** The action ran, or the owner cleared the selection. */
  readonly done = output<void>();

  protected readonly isBusy = signal(false);
  private readonly ids = computed(() => this.selected().map((a) => a.id));

  async run(action: BulkAction): Promise<void> {
    const total = this.selected().length;
    if (!total || !(await this.isConfirmed(action, total))) return;
    this.isBusy.set(true);
    try {
      if (action === 'delete') await this.artworks.delete(this.ids());
      else await this.artworks.updateMany(this.ids(), EDITS[action]);
      toast.success(`${DONE[action]} ${artworkCount(total)}`);
      this.done.emit();
    } catch {
      toast.error('Nothing was changed', {
        description: 'The action failed for every selected artwork. Try again.',
      });
    } finally {
      this.isBusy.set(false);
    }
  }

  private isConfirmed(action: BulkAction, total: number): Promise<boolean> {
    if (action === 'delete') {
      return this.confirm.ask({
        title: `Delete ${artworkCount(total)}?`,
        description:
          'Their files and upload rows go too. This cannot be undone.',
        confirm: 'Delete',
        isDestructive: true,
      });
    }
    const uncredited = this.selected().filter(
      (a) => !a.artistIds?.length,
    ).length;
    if (action === 'publish' && uncredited) {
      return this.confirm.ask({
        title: 'Publish anyway?',
        description: `${uncredited} of ${total} have no artist credited.`,
        confirm: 'Publish',
      });
    }
    return Promise.resolve(true);
  }
}
