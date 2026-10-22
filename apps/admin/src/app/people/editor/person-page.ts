import {
  Component,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTrash2 } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { TIGY_ID } from '@tigy/models';
import { PageHeader } from '../../chrome/page-header';
import { CALLABLES, type CreditingImage } from '../../firebase/functions';
import { ConfirmService } from '../../shared/confirm.service';
import { warnBeforeLeaving } from '../../shared/leave-warning';
import { PeopleService } from '../people.service';
import { PersonEditor } from './person-editor';

@Component({
  selector: 'app-person-page',
  imports: [
    HlmButtonImports,
    HlmEmptyImports,
    NgIcon,
    PageHeader,
    PersonEditor,
    RouterLink,
  ],
  providers: [provideIcons({ lucideTrash2 })],
  templateUrl: './person-page.html',
})
export class PersonPage {
  private readonly people = inject(PeopleService);
  private readonly callables = inject(CALLABLES);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly editor = viewChild(PersonEditor);

  readonly id = input.required<string>();

  protected readonly person = computed(() => this.people.byId().get(this.id()));
  protected readonly isLoading = this.people.isLoading;
  /** Undefined while loading, so the header shows a placeholder. */
  protected readonly heading = computed(() => {
    const person = this.person();
    if (person) return person.name;
    return this.isLoading() ? undefined : 'Person not found';
  });
  protected readonly isTigy = computed(() => this.id() === TIGY_ID);
  protected readonly creditedBy = signal<CreditingImage[] | null>(null);
  protected readonly isDeleting = signal(false);
  /** Set once deleted, so leaving asks nothing. */
  private readonly isDeleted = signal(false);

  constructor() {
    warnBeforeLeaving(() => this.hasUnsavedEdits());
  }

  hasUnsavedEdits(): boolean {
    return !this.isDeleted() && (this.editor()?.isDirty() ?? false);
  }

  protected async delete(): Promise<void> {
    const person = this.person();
    if (!person) return;
    const isConfirmed = await this.confirm.ask({
      title: `Delete ${person.name}?`,
      description: 'Their avatar is deleted too. This cannot be undone.',
      confirm: 'Delete',
      isDestructive: true,
    });
    if (!isConfirmed) return;
    this.isDeleting.set(true);
    try {
      const result = await this.callables.deletePerson(person.id);
      if (result.deleted) {
        this.isDeleted.set(true);
        toast.success(`Deleted ${person.name}`);
        await this.router.navigateByUrl('/people');
      } else {
        this.creditedBy.set(result.creditedBy);
      }
    } catch {
      toast.error(`${person.name} wasn't deleted. Try again.`);
    } finally {
      this.isDeleting.set(false);
    }
  }
}
