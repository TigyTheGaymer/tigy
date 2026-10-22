import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import { PageHeader } from '../chrome/page-header';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideImages, lucideImageUp, lucideSearch } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { IMAGE_FORMATS } from '@tigy/uploads';
import { listUploads, type UploadListStatus } from '../uploads/upload-list';
import { UploadService } from '../uploads/upload.service';
import { UploadsService } from '../uploads/uploads.service';
import { ArtworkTile, type SelectionChange } from './artwork-tile/artwork-tile';
import { MAX_BATCH } from './artworks-api';
import {
  ArtworksService,
  isInView,
  matchesSearch,
  parseView,
  type ArtworkView,
} from './artworks.service';
import { artworkCount, BulkBar } from './bulk-bar/bulk-bar';
import { PageDropTarget } from './upload-tiles/page-drop-target';
import { UploadTiles } from './upload-tiles/upload-tiles';
import { WarningBadge } from './warning-badge';

export const VIEW_LABELS: Record<ArtworkView, string> = {
  all: 'All',
  unpublished: 'Unpublished',
  sfw: 'Published SFW',
  nsfw: 'Published NSFW',
  'needs-work': 'Needs work',
};

/** Rows that turn ready within this long share one "ready" message. */
export const READY_BURST_MS = 2000;

/** The query parameters that reopen a list: All and an empty search are left out. */
export function listParams(
  view: ArtworkView,
  search: string,
): Record<string, string | null> {
  return {
    view: view === 'all' ? null : view,
    q: search.trim() || null,
  };
}

@Component({
  selector: 'app-artworks',
  imports: [
    PageHeader,
    ArtworkTile,
    BulkBar,
    HlmButtonImports,
    HlmCheckboxImports,
    HlmEmptyImports,
    HlmInputImports,
    HlmSkeletonImports,
    HlmTabsImports,
    NgIcon,
    PageDropTarget,
    UploadTiles,
    WarningBadge,
  ],
  providers: [provideIcons({ lucideImages, lucideImageUp, lucideSearch })],
  templateUrl: './artworks.html',
})
export class ArtworksPage {
  private readonly artworks = inject(ArtworksService);
  private readonly upload = inject(UploadService);
  private readonly uploads = inject(UploadsService);
  private readonly router = inject(Router);

  readonly view = input<string>();
  readonly q = input<string>();

  protected readonly views = Object.entries(VIEW_LABELS) as [
    ArtworkView,
    string,
  ][];
  protected readonly accept = Object.values(IMAGE_FORMATS)
    .map((format) => format.mime)
    .join(',');

  protected readonly currentView = computed(() => parseView(this.view()));
  protected readonly search = linkedSignal(() => this.q() ?? '');
  protected readonly params = computed(() =>
    listParams(this.currentView(), this.search()),
  );

  protected readonly all = this.artworks.artworks;
  protected readonly counts = this.artworks.counts;
  protected readonly isLoading = this.artworks.isLoading;
  protected readonly error = this.artworks.error;
  protected readonly listed = this.artworks.filtered(
    this.currentView,
    this.search,
  );

  private readonly records = this.uploads.list();
  protected readonly uploadRows = computed(() =>
    listUploads(this.upload.local(), this.records.value(), this.uploads.now()),
  );

  private readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  /** The last tile toggled, where a Shift-click range starts. */
  private anchor?: string;
  protected readonly selected = computed(() =>
    this.listed().filter((a) => this.selectedIds().has(a.id)),
  );
  protected readonly isAllSelected = computed(
    () =>
      this.listed().length > 0 &&
      this.selected().length === Math.min(this.listed().length, MAX_BATCH),
  );

  constructor() {
    this.announceHiddenUploads();
  }

  protected setView(view: string): void {
    this.selectedIds.set(new Set());
    this.writeParams(listParams(parseView(view), this.search()));
  }

  protected setSearch(text: string): void {
    this.search.set(text);
    this.writeParams(listParams(this.currentView(), text));
  }

  protected toggle(id: string, { isSelected, isRange }: SelectionChange): void {
    const ids = new Set(this.selectedIds());
    for (const each of this.toggled(id, isRange)) {
      if (!isSelected) ids.delete(each);
      else if (ids.size < MAX_BATCH) ids.add(each);
    }
    if (isSelected && !ids.has(id)) {
      toast.error(`You can select up to ${MAX_BATCH} artworks at once.`);
    }
    this.selectedIds.set(ids);
    this.anchor = id;
  }

  /** The tile clicked, or with Shift every tile from the last one clicked to it. */
  private toggled(id: string, isRange: boolean): string[] {
    const listed = this.listed().map((a) => a.id);
    const from = this.anchor ? listed.indexOf(this.anchor) : -1;
    const to = listed.indexOf(id);
    if (!isRange || from < 0 || to < 0) return [id];
    return listed.slice(Math.min(from, to), Math.max(from, to) + 1);
  }

  protected toggleAll(isSelected: boolean): void {
    this.selectedIds.set(
      new Set(
        isSelected
          ? this.listed()
              .slice(0, MAX_BATCH)
              .map((a) => a.id)
          : [],
      ),
    );
    if (isSelected && this.listed().length > MAX_BATCH) {
      toast.info(`Selected the first ${MAX_BATCH} artworks.`);
    }
  }

  protected clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  protected add(files: File[]): Promise<void> {
    return this.upload.add(files);
  }

  protected pick(event: Event): void {
    const field = event.target as HTMLInputElement;
    const files = [...(field.files ?? [])];
    // Picking the same file again should start another upload.
    field.value = '';
    if (files.length) void this.add(files);
  }

  protected async dismiss(id: string): Promise<void> {
    try {
      await this.uploads.clear(id);
    } catch {
      toast.error("The upload couldn't be dismissed. Try again.");
    }
  }

  private writeParams(params: Record<string, string | null>): void {
    void this.router.navigate([], {
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Says when uploads that just finished are hidden by the view or the search. */
  private announceHiddenUploads(): void {
    const before = new Map<string, UploadListStatus>();
    const ready = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
    effect(() => {
      for (const row of this.uploadRows()) {
        const was = before.get(row.id);
        if (row.status === 'ready' && was && was !== 'ready') ready.add(row.id);
        before.set(row.id, row.status);
      }
      if (!ready.size || timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        const ids = [...ready];
        ready.clear();
        untracked(() => this.reportHidden(ids));
      }, READY_BURST_MS);
    });
  }

  private reportHidden(ids: string[]): void {
    const hidden = ids.filter((id) => {
      const artwork = this.all().find((a) => a.id === id);
      return (
        !artwork ||
        !isInView(artwork, this.currentView()) ||
        !matchesSearch(artwork, this.search())
      );
    });
    if (!hidden.length) return;
    toast.message(`${artworkCount(hidden.length)} ready`, {
      description: 'This view hides them: new artworks are unpublished.',
      action: {
        label: 'Show unpublished',
        onClick: () =>
          void this.router.navigate(['/artworks'], {
            queryParams: { view: 'unpublished' },
          }),
      },
    });
  }
}
