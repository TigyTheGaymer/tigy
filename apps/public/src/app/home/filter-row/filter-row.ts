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
  templateUrl: './filter-row.html',
  styleUrl: './filter-row.css',
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
