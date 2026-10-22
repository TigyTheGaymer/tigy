import {
  Component,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDown,
  lucideArrowUp,
  lucidePencil,
  lucidePlus,
  lucideX,
} from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import {
  avatarUrl,
  foldName,
  matchesName,
  PeopleService,
} from '../../../people/people.service';

/** Matches shown at once while typing. */
const MAX_MATCHES = 8;

type Option =
  | { kind: 'person'; id: string; name: string }
  | { kind: 'create'; name: string };

let nextId = 0;

/** An ordered list of credited people, with a search to add more. */
@Component({
  selector: 'app-credits-picker',
  imports: [HlmAvatarImports, HlmButtonImports, HlmInputImports, NgIcon],
  providers: [
    provideIcons({
      lucideArrowDown,
      lucideArrowUp,
      lucidePencil,
      lucidePlus,
      lucideX,
    }),
  ],
  templateUrl: './credits-picker.html',
})
export class CreditsPicker {
  private readonly people = inject(PeopleService);

  readonly label = input.required<string>();
  readonly ids = model.required<string[]>();
  readonly edit = output<string>();

  protected readonly listId = `credits-${++nextId}`;
  protected readonly query = signal('');
  protected readonly isOpen = signal(false);
  protected readonly active = signal(0);
  protected readonly isCreating = signal(false);

  protected readonly credits = computed(() =>
    this.ids().map((id) => {
      const person = this.people.byId().get(id);
      return {
        id,
        name: person?.name ?? 'Unknown person',
        avatar: person ? avatarUrl(person) : undefined,
      };
    }),
  );

  protected readonly options = computed((): Option[] => {
    const typed = this.query().trim();
    if (!typed) return [];
    const taken = new Set(this.ids());
    const matches: Option[] = this.people
      .people()
      .filter((p) => !taken.has(p.id) && matchesName(p, typed))
      .slice(0, MAX_MATCHES)
      .map((p) => ({ kind: 'person', id: p.id, name: p.name }));
    const isNameTaken = this.people
      .people()
      .some((p) => foldName(p.name) === foldName(typed));
    return isNameTaken
      ? matches
      : [...matches, { kind: 'create', name: typed }];
  });

  protected type(text: string): void {
    this.query.set(text);
    this.active.set(0);
    this.isOpen.set(true);
  }

  protected onKey(event: KeyboardEvent): void {
    const count = this.options().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.isOpen.set(true);
        if (count) this.active.update((i) => (i + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (count) this.active.update((i) => (i - 1 + count) % count);
        break;
      case 'Enter': {
        const option = this.options()[this.active()];
        if (!option || !this.isOpen()) return;
        event.preventDefault();
        void this.choose(option);
        break;
      }
      case 'Escape':
        if (this.isOpen()) {
          event.stopPropagation();
          this.isOpen.set(false);
        }
        break;
    }
  }

  async choose(option: Option): Promise<void> {
    if (option.kind === 'person') {
      this.add(option.id);
      return;
    }
    this.isCreating.set(true);
    try {
      this.add(await this.people.create(option.name));
    } catch {
      toast.error(`${option.name.trim()} couldn't be created. Try again.`);
    } finally {
      this.isCreating.set(false);
    }
  }

  protected move(index: number, by: -1 | 1): void {
    this.ids.update((ids) => {
      const moved = [...ids];
      [moved[index], moved[index + by]] = [moved[index + by], moved[index]];
      return moved;
    });
  }

  protected remove(id: string): void {
    this.ids.update((ids) => ids.filter((other) => other !== id));
  }

  private add(id: string): void {
    this.ids.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
    this.query.set('');
    this.isOpen.set(false);
  }
}
