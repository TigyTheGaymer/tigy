import { Component, computed, input } from '@angular/core';
import { RouterLink, type Params } from '@angular/router';
import {
  LucideArrowDownUp,
  LucideCalendar,
  LucideChevronDown,
  LucidePalette,
  LucideTag,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import type { GallerySort } from '@tigy/gallery';
import type { ActiveFilter } from './active-filters';

const SORT_NAMES: Record<GallerySort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
};

@Component({
  selector: 'app-filter-row',
  imports: [
    RouterLink,
    LucideArrowDownUp,
    LucideCalendar,
    LucideChevronDown,
    LucidePalette,
    LucideTag,
    LucideUsers,
    LucideX,
  ],
  styleUrl: './filter-row.css',
  template: `
    <div class="bar">
      <nav class="filters container" aria-label="Filters and sort">
        @for (filter of filters(); track filter.key) {
          <a
            class="chip is-active"
            routerLink="/"
            [queryParams]="filter.remove"
            [attr.aria-label]="'Remove filter ' + filter.kind + ': ' + filter.name"
            >{{ filter.kind }}: {{ filter.name }}<svg lucideX class="icon" aria-hidden="true"></svg
          ></a>
        }
        <a
          class="chip sort"
          routerLink="/"
          [queryParams]="otherSortParams()"
          [attr.aria-label]="'Sort: ' + sortName() + '. Switch to ' + otherSortName().toLowerCase()"
          ><svg lucideArrowDownUp class="icon" aria-hidden="true"></svg>{{ sortName() }}</a
        >
        <span class="pickers" role="group" aria-label="Filter pickers (coming later)">
          <button type="button" class="chip" aria-disabled="true" title="Filters are coming later">
            <svg lucideUsers class="icon" aria-hidden="true"></svg>Characters<svg
              lucideChevronDown
              class="icon chev"
              aria-hidden="true"
            ></svg>
          </button>
          <button type="button" class="chip" aria-disabled="true" title="Filters are coming later">
            <svg lucidePalette class="icon" aria-hidden="true"></svg>Artists<svg
              lucideChevronDown
              class="icon chev"
              aria-hidden="true"
            ></svg>
          </button>
          <button type="button" class="chip" aria-disabled="true" title="Filters are coming later">
            <svg lucideTag class="icon" aria-hidden="true"></svg>Tags<svg
              lucideChevronDown
              class="icon chev"
              aria-hidden="true"
            ></svg>
          </button>
          <button type="button" class="chip" aria-disabled="true" title="Filters are coming later">
            <svg lucideCalendar class="icon" aria-hidden="true"></svg>Year<svg
              lucideChevronDown
              class="icon chev"
              aria-hidden="true"
            ></svg>
          </button>
        </span>
        <span class="note">Filters coming later</span>
      </nav>
    </div>
  `,
})
export class FilterRow {
  readonly filters = input.required<readonly ActiveFilter[]>();
  readonly sort = input.required<GallerySort>();
  /** The address with the other sort. */
  readonly otherSortParams = input.required<Params>();

  protected readonly sortName = computed(() => SORT_NAMES[this.sort()]);
  protected readonly otherSortName = computed(
    () => SORT_NAMES[this.sort() === 'newest' ? 'oldest' : 'newest'],
  );
}
