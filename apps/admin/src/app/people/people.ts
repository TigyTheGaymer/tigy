import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PageHeader } from '../chrome/page-header';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideSearch, lucideUsers } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { TIGY_ID } from '@tigy/models';
import { avatarUrl, PeopleService } from './people.service';

@Component({
  selector: 'app-people',
  imports: [
    PageHeader,
    HlmAvatarImports,
    HlmBadgeImports,
    HlmButtonImports,
    HlmEmptyImports,
    HlmInputImports,
    HlmSkeletonImports,
    NgIcon,
    RouterLink,
  ],
  providers: [provideIcons({ lucidePlus, lucideSearch, lucideUsers })],
  templateUrl: './people.html',
})
export class PeoplePage {
  private readonly people = inject(PeopleService);
  private readonly router = inject(Router);

  readonly q = input<string>();

  protected readonly search = linkedSignal(() => this.q() ?? '');
  protected readonly isLoading = this.people.isLoading;
  protected readonly error = this.people.error;
  private readonly matching = this.people.matching(this.search);
  protected readonly rows = computed(() => {
    const counts = this.people.creditCounts();
    return this.matching().map((person) => ({
      id: person.id,
      name: person.name,
      avatar: avatarUrl(person),
      credits: counts.get(person.id) ?? 0,
      isTigy: person.id === TIGY_ID,
    }));
  });

  protected readonly newName = signal('');
  protected readonly nameError = signal<string | null>(null);
  protected readonly isCreating = signal(false);

  protected setSearch(text: string): void {
    this.search.set(text);
    void this.router.navigate([], {
      queryParams: { q: text.trim() || null },
      replaceUrl: true,
    });
  }

  protected async create(): Promise<void> {
    const name = this.newName().trim();
    if (!name) {
      this.nameError.set('Enter a name.');
      return;
    }
    this.isCreating.set(true);
    try {
      const id = await this.people.create(name);
      this.newName.set('');
      this.nameError.set(null);
      await this.router.navigate(['/people', id]);
    } catch {
      toast.error(`${name} couldn't be created. Try again.`);
    } finally {
      this.isCreating.set(false);
    }
  }
}
