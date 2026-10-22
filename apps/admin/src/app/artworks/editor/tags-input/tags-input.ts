import {
  Component,
  computed,
  ElementRef,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { normaliseTag } from '@tigy/gallery';
import type { TagCounts } from '@tigy/models';

const MAX_SUGGESTIONS = 8;

/** Most used first, then by name. */
export function suggestTags(
  counts: TagCounts,
  typed: string,
  taken: readonly string[],
): string[] {
  const text = normaliseTag(typed);
  if (!text) return [];
  return Object.entries(counts)
    .filter(([tag]) => tag.includes(text) && !taken.includes(tag))
    .sort(([a, x], [b, y]) => y - x || (a < b ? -1 : a > b ? 1 : 0))
    .slice(0, MAX_SUGGESTIONS)
    .map(([tag]) => tag);
}

@Component({
  selector: 'app-tags-input',
  imports: [NgIcon],
  providers: [provideIcons({ lucideX })],
  templateUrl: './tags-input.html',
})
export class TagsInput {
  readonly tags = model.required<string[]>();
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');
  readonly counts = input<TagCounts>({});

  protected readonly query = signal('');
  protected readonly isOpen = signal(false);
  protected readonly active = signal(-1);
  protected readonly suggestions = computed(() =>
    suggestTags(this.counts(), this.query(), this.tags()),
  );

  protected type(text: string): void {
    if (text.includes(',')) {
      for (const part of text.split(',').slice(0, -1)) this.add(part);
      this.query.set(text.slice(text.lastIndexOf(',') + 1));
    } else {
      this.query.set(text);
    }
    this.active.set(-1);
    this.isOpen.set(true);
  }

  protected onKey(event: KeyboardEvent): void {
    const count = this.suggestions().length;
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault();
      this.active.update((i) => (i + 1) % count);
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault();
      this.active.update((i) => (i <= 0 ? count - 1 : i - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.add(this.suggestions()[this.active()] ?? this.query());
    } else if (
      event.key === 'Backspace' &&
      !this.query() &&
      this.tags().length
    ) {
      event.preventDefault();
      this.remove(this.tags()[this.tags().length - 1]);
    } else if (event.key === 'Escape' && this.isOpen()) {
      event.stopPropagation();
      this.isOpen.set(false);
    }
  }

  /** A press anywhere in the box, outside the chips, types into it. */
  protected focusInput(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('button, input')) return;
    event.preventDefault();
    this.field()?.nativeElement.focus();
  }

  /** Adds the tag in its stored form, unless it is empty or already there in any spelling. */
  add(typed: string): void {
    const tag = normaliseTag(typed);
    if (tag && !this.tags().includes(tag)) {
      this.tags.update((tags) => [...tags, tag]);
    }
    this.query.set('');
    this.active.set(-1);
  }

  protected remove(tag: string): void {
    this.tags.update((tags) => tags.filter((other) => other !== tag));
  }
}
