import {
  afterRenderEffect,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendar,
  lucideCheck,
  lucideChevronDown,
  lucidePalette,
  lucideSearch,
  lucideTag,
  lucideUsers,
  lucideX,
} from '@ng-icons/lucide';
import { pieceCount } from '../../../shared/format';
import {
  steadyChoices,
  type ListedChoice,
  type PickerChoice,
} from '../picker-choices';

const DROPDOWN_WIDTH = 320;
const EDGE = 8;
const PHONE = '(max-width: 720px)';

/** A filter chip and its choices: a dropdown under the chip, or a bottom sheet on phones. */
@Component({
  selector: 'app-filter-picker',
  imports: [NgIcon],
  providers: [
    provideIcons({
      lucideCalendar,
      lucideCheck,
      lucideChevronDown,
      lucidePalette,
      lucideSearch,
      lucideTag,
      lucideUsers,
      lucideX,
    }),
  ],
  templateUrl: './filter-picker.html',
  styleUrl: './filter-picker.css',
})
export class FilterPicker {
  private readonly router = inject(Router);

  readonly name = input.required<string>();
  readonly icon = input.required<string>();
  /** How many choices are active, such as "2"; null when none. */
  readonly active = input<string | null>(null);
  readonly choices = input.required<readonly PickerChoice[]>();
  readonly isSearchable = input(false);
  /** Shows each choice's avatar. */
  readonly hasPeople = input(false);
  /** New choices are on their way. */
  readonly isLoading = input(false);

  private readonly chip =
    viewChild.required<ElementRef<HTMLButtonElement>>('chip');
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly isOpen = signal(false);
  protected readonly search = signal('');
  protected readonly headingId = computed(
    () => `picker-${this.name().toLowerCase()}`,
  );
  /** The choices as the picker opened, which set the list's order until it closes. */
  private readonly opened = signal<readonly PickerChoice[]>([]);
  protected readonly shown = computed(() => {
    const listed = steadyChoices(this.opened(), this.choices());
    const text = this.search().trim().toLowerCase();
    return text
      ? listed.filter((choice) => choice.name.toLowerCase().includes(text))
      : listed;
  });
  protected readonly position = signal<{ top: number; left: number } | null>(
    null,
  );

  /** The choice pressed last, kept focused while the list re-renders around it. */
  private picked: string | undefined;

  constructor() {
    // Only while open, so closed pickers skip every scroll of the gallery.
    effect((onCleanup) => {
      if (!this.isOpen()) return;
      const listening = new AbortController();
      const place = () => this.place();
      window.addEventListener('resize', place, { signal: listening.signal });
      window.addEventListener('scroll', place, {
        signal: listening.signal,
        passive: true,
      });
      onCleanup(() => listening.abort());
    });
    afterRenderEffect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
    // Picking a choice changes the chips' labels, which can move this one.
    afterRenderEffect(() => {
      this.shown();
      if (!this.isOpen()) return;
      this.place();
      const dialog = this.dialog()?.nativeElement;
      if (
        this.picked !== undefined &&
        !dialog?.contains(document.activeElement)
      ) {
        dialog
          ?.querySelector<HTMLElement>(
            `[data-key="${CSS.escape(this.picked)}"]`,
          )
          ?.focus();
      }
    });
  }

  protected open(): void {
    this.opened.set(this.choices());
    this.isOpen.set(true);
  }

  protected href(choice: PickerChoice): string {
    return this.router.serializeUrl(
      this.router.createUrlTree(['/'], { queryParams: choice.params }),
    );
  }

  /**
   * Not a RouterLink, which cannot skip the router's scroll to the top and would leave the open dropdown
   * away from its chip. Modified clicks open a tab as usual.
   */
  protected pick(event: MouseEvent, choice: ListedChoice): void {
    if (
      !choice.isAvailable ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    this.picked = choice.key;
    void this.router.navigate(['/'], {
      queryParams: choice.params,
      state: { keepGallery: true },
      scroll: 'manual',
    });
  }

  protected onClosed(): void {
    this.isOpen.set(false);
    this.opened.set([]);
    this.picked = undefined;
    this.search.set('');
    this.chip().nativeElement.focus();
  }

  /** The dialog fills the screen behind its panel, so a click on the dialog itself is a click outside. */
  protected onDialogClick(event: MouseEvent): void {
    const dialog = this.dialog()?.nativeElement;
    if (event.target !== dialog) return;
    dialog.close();
    // A dropdown lets the press go on to what is under it, such as another chip; the phone's sheet does not.
    // Its own chip is left out, as the press there means close; the copy keeps Ctrl or Cmd for a new tab.
    if (!matchMedia(PHONE).matches) {
      const under = document.elementFromPoint?.(event.clientX, event.clientY);
      if (under && !this.chip().nativeElement.contains(under)) {
        under.dispatchEvent(new MouseEvent('click', event));
      }
    }
  }

  protected label(choice: ListedChoice): string {
    const label = `${choice.name}, ${pieceCount(choice.count)}`;
    return choice.isSelected ? `${label}, selected` : label;
  }

  private place(): void {
    if (!this.isOpen() || matchMedia(PHONE).matches) {
      this.position.set(null);
      return;
    }
    const rect = this.chip().nativeElement.getBoundingClientRect();
    const maxLeft = window.innerWidth - DROPDOWN_WIDTH - EDGE;
    this.position.set({
      top: rect.bottom + 6,
      left: Math.max(EDGE, Math.min(rect.left, maxLeft)),
    });
  }
}
