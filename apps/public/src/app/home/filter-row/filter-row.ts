import { Component, computed, input } from '@angular/core';
import { RouterLink, type Params } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDownUp,
  lucideCalendar,
  lucideChevronDown,
  lucidePalette,
  lucideTag,
  lucideUsers,
  lucideX,
} from '@ng-icons/lucide';
import type { GallerySort } from '@tigy/gallery';
import type { ActiveFilter } from './active-filters';

const SORT_NAMES: Record<GallerySort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
};

const PICKERS = [
  { name: 'Characters', icon: 'lucideUsers' },
  { name: 'Artists', icon: 'lucidePalette' },
  { name: 'Tags', icon: 'lucideTag' },
  { name: 'Year', icon: 'lucideCalendar' },
] as const;

@Component({
  selector: 'app-filter-row',
  imports: [RouterLink, NgIcon],
  providers: [
    provideIcons({
      lucideArrowDownUp,
      lucideCalendar,
      lucideChevronDown,
      lucidePalette,
      lucideTag,
      lucideUsers,
      lucideX,
    }),
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
            [attr.aria-label]="
              'Remove filter ' + filter.kind + ': ' + filter.name
            "
            >{{ filter.kind }}: {{ filter.name
            }}<ng-icon name="lucideX" class="icon"
          /></a>
        }
        <a
          class="chip sort"
          routerLink="/"
          [queryParams]="otherSortParams()"
          [attr.aria-label]="
            'Sort: ' +
            sortName() +
            '. Switch to ' +
            otherSortName().toLowerCase()
          "
          ><ng-icon name="lucideArrowDownUp" class="icon" />{{ sortName() }}</a
        >
        <span
          class="pickers"
          role="group"
          aria-label="Filter pickers (coming later)"
        >
          @for (picker of pickers; track picker.name) {
            <button
              type="button"
              class="chip"
              aria-disabled="true"
              title="Filters are coming later"
            >
              <ng-icon [name]="picker.icon" class="icon" />{{ picker.name
              }}<ng-icon name="lucideChevronDown" class="icon chev" />
            </button>
          }
        </span>
        <span class="note">Filters coming later</span>
      </nav>
    </div>
  `,
})
export class FilterRow {
  readonly filters = input.required<readonly ActiveFilter[]>();
  readonly sort = input.required<GallerySort>();
  readonly otherSortParams = input.required<Params>();

  protected readonly pickers = PICKERS;
  protected readonly sortName = computed(() => SORT_NAMES[this.sort()]);
  protected readonly otherSortName = computed(
    () => SORT_NAMES[this.sort() === 'newest' ? 'oldest' : 'newest'],
  );
}
