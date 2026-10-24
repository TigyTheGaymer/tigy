import { Component, computed, input } from '@angular/core';
import { RouterLink, type Params } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDownUp, lucideX } from '@ng-icons/lucide';
import type { GallerySort } from '@tigy/gallery';
import { FilterPicker } from './filter-picker/filter-picker';
import type { PickerChoices, PickerKind } from './picker-choices';

const SORT_NAMES: Record<GallerySort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
};

const PICKERS: readonly {
  kind: PickerKind;
  name: string;
  icon: string;
  isPeople: boolean;
}[] = [
  {
    kind: 'characters',
    name: 'Characters',
    icon: 'lucideUsers',
    isPeople: true,
  },
  { kind: 'artists', name: 'Artists', icon: 'lucidePalette', isPeople: true },
  { kind: 'tags', name: 'Tags', icon: 'lucideTag', isPeople: false },
  { kind: 'years', name: 'Year', icon: 'lucideCalendar', isPeople: false },
];

@Component({
  selector: 'app-filter-row',
  imports: [RouterLink, NgIcon, FilterPicker],
  providers: [provideIcons({ lucideArrowDownUp, lucideX })],
  templateUrl: './filter-row.html',
  styleUrl: './filter-row.css',
})
export class FilterRow {
  readonly sort = input.required<GallerySort>();
  readonly otherSortParams = input.required<Params>();
  readonly clearedParams = input.required<Params>();
  readonly choices = input.required<PickerChoices>();
  readonly isLoading = input(false);

  protected readonly pickers = computed(() =>
    PICKERS.map((picker) => {
      const count = this.choices()[picker.kind].filter(
        (choice) => choice.isSelected,
      ).length;
      return { ...picker, active: count ? String(count) : null };
    }),
  );
  protected readonly hasFilters = computed(() =>
    this.pickers().some((picker) => picker.active !== null),
  );
  protected readonly sortName = computed(() => SORT_NAMES[this.sort()]);
  protected readonly otherSortName = computed(
    () => SORT_NAMES[this.sort() === 'newest' ? 'oldest' : 'newest'],
  );
}
