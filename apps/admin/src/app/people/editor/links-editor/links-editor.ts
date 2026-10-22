import { Component, input, model, signal } from '@angular/core';
import { FormField, type FieldTree } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDown,
  lucideArrowUp,
  lucideLink,
  lucidePlus,
  lucideX,
} from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import type { SocialLink } from '@tigy/models';
import { BRANDS, brandFor, profileFromUrl } from '@tigy/social';

/** The picker's choice for a network without a logo, typed in by hand. */
const OTHER = 'other';

/** A person's social links, in order; each needs a network, a handle and an https address. */
@Component({
  selector: 'app-links-editor',
  imports: [FormField, HlmButtonImports, HlmInputImports, NgIcon],
  providers: [
    provideIcons({
      lucideArrowDown,
      lucideArrowUp,
      lucideLink,
      lucidePlus,
      lucideX,
    }),
  ],
  templateUrl: './links-editor.html',
})
export class LinksEditor {
  readonly links = model.required<SocialLink[]>();
  readonly fields = input.required<FieldTree<SocialLink[]>>();

  protected readonly other = OTHER;
  protected readonly networks = Object.values(BRANDS).map((b) => b.name);
  protected readonly brandOf = brandFor;
  /** Rows where the owner chose "Something else" before typing a name, kept in step with the links. */
  private readonly isOther = signal<boolean[]>([]);

  /** A network with a logo by its name, any other as "Something else", none yet as empty. */
  protected choiceOf(index: number): string {
    const network = this.links()[index]?.network ?? '';
    const brand = brandFor(network);
    if (brand) return brand.name;
    return network.trim() || this.isOther()[index] ? OTHER : '';
  }

  protected pick(index: number, choice: string): void {
    this.isOther.update((rows) => withAt(rows, index, choice === OTHER));
    this.setAt(index, { network: choice === OTHER ? '' : choice });
  }

  protected add(): void {
    this.links.update((links) => [
      ...links,
      { network: '', handle: '', url: '' },
    ]);
  }

  protected move(index: number, by: -1 | 1): void {
    const swap = <T>(items: T[]) => {
      const moved = [...items];
      [moved[index], moved[index + by]] = [moved[index + by], moved[index]];
      return moved;
    };
    this.links.update(swap);
    this.isOther.update(swap);
  }

  protected remove(index: number): void {
    this.links.update((links) => links.filter((_, i) => i !== index));
    this.isOther.update((rows) => rows.filter((_, i) => i !== index));
  }

  /** Fills the network and handle from a profile address, leaving what the owner typed. */
  protected fillFromAddress(index: number, url: string): void {
    const profile = profileFromUrl(url);
    const link = this.links()[index];
    if (!profile || !link) return;
    this.setAt(index, {
      url,
      network: link.network.trim() ? link.network : profile.network,
      handle: link.handle.trim() ? link.handle : profile.handle,
    });
  }

  // Runs before the field writes the model, so the address comes from the input.
  protected onAddressInput(event: Event, index: number): void {
    if ((event as InputEvent).inputType === 'insertFromPaste') {
      this.fillFromAddress(index, (event.target as HTMLInputElement).value);
    }
  }

  private setAt(index: number, changes: Partial<SocialLink>): void {
    this.links.update((links) =>
      links.map((link, i) => (i === index ? { ...link, ...changes } : link)),
    );
  }
}

function withAt<T>(items: readonly T[], index: number, value: T): T[] {
  const copy = [...items];
  copy[index] = value;
  return copy;
}
