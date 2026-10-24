import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Paw } from '../../markings/paw';
import { AgeCheckService, isAdult } from '../age-check.service';

/** Rendered only while a check waits, so no page's HTML carries its NSFW wording. */
@Component({
  selector: 'app-age-check-dialog',
  imports: [Paw],
  templateUrl: './age-check-dialog.html',
  styleUrl: './age-check-dialog.css',
})
export class AgeCheckDialog {
  protected readonly ageCheck = inject(AgeCheckService);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly closeButton =
    viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  protected readonly isRefused = signal(false);
  // Recomputed on each opening, so a tab open past midnight gets the new day.
  protected readonly today = computed(() =>
    this.ageCheck.isPending() ? localDate(new Date()) : '',
  );

  constructor() {
    afterRenderEffect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
    // The refusal removes the focused Confirm button.
    afterRenderEffect(() => this.closeButton()?.nativeElement.focus());
  }

  protected submit(event: SubmitEvent, birthday: HTMLInputElement): void {
    event.preventDefault();
    const today = new Date();
    // For browsers that skip native date validation.
    if (
      !birthday.value ||
      birthday.value < birthday.min ||
      birthday.value > localDate(today)
    ) {
      birthday.reportValidity();
      return;
    }
    if (isAdult(birthday.value, today)) {
      // Closed before the next render removes it, so the browser returns focus.
      this.ageCheck.pass();
      this.dialog()?.nativeElement.close();
    } else {
      this.isRefused.set(true);
    }
  }

  protected onClosed(): void {
    this.isRefused.set(false);
    this.ageCheck.dismiss();
  }
}

/** "2026-10-24", in local time. */
function localDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
