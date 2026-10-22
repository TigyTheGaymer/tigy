import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  linkedSignal,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { form, FormField, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronDown,
  lucideChevronLeft,
  lucideChevronRight,
  lucideExternalLink,
  lucideTrash2,
} from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmKbdImports } from '@spartan-ng/helm/kbd';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { fileSize, formatName } from '@tigy/gallery';
import { imagePaths } from '@tigy/models';
import { environment } from '../../firebase/environment';
import { storageUrl } from '../../firebase/storage-url';
import { PageHeader } from '../../chrome/page-header';
import { PersonSheet } from '../../people/editor/person-sheet';
import { ConfirmService } from '../../shared/confirm.service';
import { warnBeforeLeaving } from '../../shared/leave-warning';
import { addedOn, GAP_LABELS, titleOf } from '../artwork-label';
import { listParams } from '../artworks';
import { ArtworksService, parseView, type Gap } from '../artworks.service';
import {
  changedEdits,
  DATE_ERROR_MESSAGES,
  dateError,
  normalise,
  toModel,
  type ArtworkModel,
  type DateError,
} from './artwork-model';
import { CreditsPicker } from './credits-picker/credits-picker';
import { neighboursOf } from './neighbours';
import { IS_MAC, isTextBox, shortcutOf } from './shortcuts';
import { WarningBadge } from '../warning-badge';
import { TagsInput } from './tags-input/tags-input';

const EMPTY: ArtworkModel = {
  title: '',
  description: '',
  year: '',
  month: '',
  day: '',
  published: false,
  nsfw: false,
  artistIds: [],
  characterIds: [],
  tags: [],
};

const GAP_WORDS: Record<Gap, string> = {
  artist: 'no artist',
  title: 'no title',
  date: 'no date',
};

/** "a", "a and b", "a, b and c". */
function listInWords(items: string[]): string {
  return items.length < 2
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

const DATE_FIELDS: Record<DateError, 'year' | 'month' | 'day'> = {
  year: 'year',
  'missing-year': 'year',
  month: 'month',
  'missing-month': 'month',
  day: 'day',
};

@Component({
  selector: 'app-artwork-editor',
  imports: [
    CreditsPicker,
    FormField,
    HlmBadgeImports,
    HlmButtonImports,
    HlmEmptyImports,
    HlmInputImports,
    HlmKbdImports,
    HlmSwitchImports,
    HlmTextareaImports,
    HlmTooltipImports,
    NgIcon,
    PageHeader,
    PersonSheet,
    RouterLink,
    TagsInput,
    WarningBadge,
  ],
  providers: [
    provideIcons({
      lucideChevronDown,
      lucideChevronLeft,
      lucideChevronRight,
      lucideExternalLink,
      lucideTrash2,
    }),
  ],
  host: { '(document:keydown)': 'onKey($event)' },
  templateUrl: './editor.html',
})
export class ArtworkEditorPage {
  private readonly artworks = inject(ArtworksService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly id = input.required<string>();
  readonly view = input<string>();
  readonly q = input<string>();

  protected readonly modifier = inject(IS_MAC) ? '⌘' : 'Ctrl';
  protected readonly keys = inject(IS_MAC) ? 'Meta' : 'Control';

  protected readonly artwork = this.artworks.byId(this.id);
  protected readonly isLoading = this.artworks.isLoading;
  private readonly currentView = computed(() => parseView(this.view()));
  private readonly search = computed(() => this.q() ?? '');
  protected readonly params = computed(() =>
    listParams(this.currentView(), this.search()),
  );

  /** What the form was loaded from, or last saved as; rebuilt only for another artwork. */
  private readonly loaded = linkedSignal<string | undefined, ArtworkModel>({
    // A computed, so a snapshot of the same artwork does not rebuild the form.
    source: computed(() => this.artwork()?.id),
    computation: () => {
      const artwork = untracked(this.artwork);
      return artwork ? normalise(toModel(artwork)) : EMPTY;
    },
  });
  protected readonly model = linkedSignal(() => this.loaded());
  protected readonly form = form(this.model, (path) => {
    validate(path, ({ value }) => {
      const error = dateError(value());
      return error
        ? { kind: 'date', message: DATE_ERROR_MESSAGES[error] }
        : undefined;
    });
  });
  protected readonly dateError = computed(() => dateError(this.model()));
  protected readonly dateErrorField = computed(() => {
    const error = this.dateError();
    return error ? DATE_FIELDS[error] : null;
  });
  protected readonly dateMessages = DATE_ERROR_MESSAGES;
  protected readonly gapLabels = GAP_LABELS;
  /** What the piece still lacks as edited now, so a gap clears as soon as it is filled in. */
  protected readonly gaps = computed(() => {
    const model = this.model();
    const gaps: Gap[] = [];
    if (!model.artistIds.length) gaps.push('artist');
    if (!model.title.trim()) gaps.push('title');
    if (!model.year.trim()) gaps.push('date');
    return gaps;
  });
  /** "no artist and no date". */
  protected readonly gapSummary = computed(() =>
    listInWords(this.gaps().map((gap) => GAP_WORDS[gap])),
  );
  protected readonly isDateErrorShown = signal(false);
  protected readonly isSaving = signal(false);

  private readonly edits = computed(() => {
    const artwork = this.artwork();
    if (!artwork || this.dateError()) return {};
    return changedEdits(
      this.model(),
      this.loaded(),
      artwork.createdAt.toDate(),
    );
  });
  protected readonly isDirty = computed(
    () =>
      this.artwork() !== undefined &&
      (Object.keys(this.edits()).length > 0 || this.dateError() !== undefined),
  );

  private readonly list = this.artworks.filtered(this.currentView, this.search);
  private readonly neighbours = linkedSignal<
    { id: string; list: { id: string }[] },
    { id: string; previous?: string; next?: string; list: { id: string }[] }
  >({
    source: () => ({ id: this.id(), list: this.list() }),
    computation: ({ id, list }, before) => ({
      id,
      list,
      ...neighboursOf(
        id,
        list,
        before?.value.id === id ? before.value.list : [],
      ),
    }),
  });
  protected readonly previous = computed(() => this.neighbours().previous);
  protected readonly next = computed(() => this.neighbours().next);

  protected readonly tagCounts = resource({
    defaultValue: {},
    loader: () => this.artworks.tagCounts(),
  });

  protected readonly title = computed(() => {
    const artwork = this.artwork();
    return artwork ? titleOf(artwork) : '';
  });
  /** Undefined while loading, so the header shows a placeholder. */
  protected readonly heading = computed(() => {
    if (this.artwork()) return this.title();
    return this.isLoading() ? undefined : 'Artwork not found';
  });
  protected readonly fullImage = computed(() =>
    storageUrl(imagePaths.full(this.id())),
  );
  protected readonly original = computed(() => {
    const artwork = this.artwork();
    return artwork ? storageUrl(artwork.file.original) : '';
  });
  protected readonly publicPage = computed(
    () => `${environment.publicSite}/i/${encodeURIComponent(this.id())}`,
  );
  protected readonly fileDetails = computed(() => {
    const file = this.artwork()?.file;
    if (!file) return [];
    return [
      ['Format', formatName(file.mime)],
      ['Size', fileSize(file.bytes)],
      ['Dimensions', `${file.w} × ${file.h}`],
      ['Animated', file.animated ? 'Yes' : 'No'],
      ['Transparent', file.transparent ? 'Yes' : 'No'],
    ];
  });
  protected readonly added = computed(() => {
    const artwork = this.artwork();
    return artwork ? addedOn(artwork) : '';
  });

  protected readonly editingPerson = signal<string | null>(null);
  protected readonly isFileInfoShown = signal(false);

  constructor() {
    warnBeforeLeaving(() => this.isDirty());
  }

  hasUnsavedEdits(): boolean {
    return this.isDirty();
  }

  protected focusGap(gap: Gap): void {
    const selector = {
      artist: '[aria-label="Add to Artists"]',
      title: '#title',
      date: '#year',
    }[gap];
    this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
  }

  protected patch(changes: Partial<ArtworkModel>): void {
    this.model.update((model) => ({ ...model, ...changes }));
  }

  /** Saves the edits; true when nothing is left unsaved. */
  async save(): Promise<boolean> {
    const artwork = this.artwork();
    if (!artwork || this.isSaving()) return false;
    if (this.dateError()) {
      this.isDateErrorShown.set(true);
      return false;
    }
    if (this.edits().published && this.gaps().length) {
      const isConfirmed = await this.confirm.ask({
        title: 'Publish with missing details?',
        description: `This piece has ${this.gapSummary()}. It will show on the public site like that.`,
        confirm: 'Publish anyway',
        cancel: 'Keep editing',
      });
      if (!isConfirmed) return false;
    }
    let isSaved = false;
    await submit(this.form, async () => {
      const edits = this.edits();
      if (!Object.keys(edits).length) {
        isSaved = true;
        return;
      }
      this.isSaving.set(true);
      const saved = normalise(this.model());
      try {
        await this.artworks.update(artwork.id, edits);
        this.loaded.set(saved);
        this.model.set(saved);
        this.isDateErrorShown.set(false);
        isSaved = true;
        toast.success('Saved');
      } catch {
        toast.error('The edits were not saved', {
          description:
            'Check the connection and try again. Your edits are kept.',
        });
      } finally {
        this.isSaving.set(false);
      }
    });
    return isSaved;
  }

  protected async saveAndNext(): Promise<void> {
    const next = this.next();
    if (next && (await this.save())) await this.go(next);
  }

  protected go(id: string | undefined): Promise<boolean> {
    if (!id) return Promise.resolve(false);
    return this.router.navigate(['/artworks', id], {
      queryParams: this.params(),
    });
  }

  protected async delete(): Promise<void> {
    const artwork = this.artwork();
    if (!artwork) return;
    const isConfirmed = await this.confirm.ask({
      title: `Delete ${this.title()}?`,
      description:
        'The artwork, its files and its upload row are deleted. This cannot be undone.',
      confirm: 'Delete',
      isDestructive: true,
    });
    if (!isConfirmed) return;
    try {
      await this.artworks.delete([artwork.id]);
      // Nothing is left to save.
      this.model.set(this.loaded());
      toast.success(`Deleted ${this.title()}`);
      await this.router.navigate(['/artworks'], {
        queryParams: this.params(),
      });
    } catch {
      toast.error("The artwork wasn't deleted. Try again.");
    }
  }

  protected onKey(event: KeyboardEvent): void {
    const shortcut = shortcutOf(event);
    if (!shortcut) return;
    // The browser must never offer to save the page.
    if (shortcut === 'save') event.preventDefault();
    if (this.editingPerson()) return;
    switch (shortcut) {
      case 'save':
        void this.save();
        break;
      case 'save-and-next':
        event.preventDefault();
        void this.saveAndNext();
        break;
      case 'previous':
      case 'next':
        if (isTextBox(event.target)) return;
        event.preventDefault();
        void this.go(shortcut === 'previous' ? this.previous() : this.next());
        break;
    }
  }
}
