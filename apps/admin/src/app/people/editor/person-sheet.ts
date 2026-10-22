import { A11yModule } from '@angular/cdk/a11y';
import {
  Component,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { ConfirmService } from '../../shared/confirm.service';
import { PeopleService } from '../people.service';
import { PersonEditor } from './person-editor';

export const DISCARD_PERSON_QUESTION = {
  title: 'Discard the edits to this person?',
  description: 'The artwork keeps its own unsaved edits.',
  confirm: 'Discard',
  cancel: 'Keep editing',
  isDestructive: true,
};

/**
 * A credited person's editor over the artwork editor, from the right on a
 * desktop and from the bottom on a phone. Its form and save are its own, so
 * the artwork's edits underneath stay as they were.
 */
@Component({
  selector: 'app-person-sheet',
  imports: [A11yModule, HlmButtonImports, NgIcon, PersonEditor],
  providers: [provideIcons({ lucideX })],
  host: { '(document:keydown)': 'onKey($event)' },
  templateUrl: './person-sheet.html',
})
export class PersonSheet {
  private readonly confirm = inject(ConfirmService);
  private readonly people = inject(PeopleService);
  private readonly editor = viewChild.required(PersonEditor);

  readonly personId = input.required<string>();
  readonly closed = output<void>();

  protected readonly name = computed(
    () => this.people.byId().get(this.personId())?.name ?? 'Person',
  );

  async requestClose(): Promise<void> {
    if (
      !this.editor().isDirty() ||
      (await this.confirm.ask(DISCARD_PERSON_QUESTION))
    ) {
      this.closed.emit();
    }
  }

  protected onKey(event: KeyboardEvent): void {
    const isCommand = event.ctrlKey || event.metaKey;
    if (isCommand && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void this.editor().save();
    } else if (event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault();
      void this.requestClose();
    }
  }
}
