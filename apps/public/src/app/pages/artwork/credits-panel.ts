import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideCalendar,
  LucideExpand,
  LucideImage,
  LucideLink,
  LucidePalette,
  LucideShare2,
  LucideTag,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { formatArtworkDate } from '@tigy/gallery';
import { TIGY_ID } from '@tigy/models';
import type { ArtworkResponse, CreditedPerson } from '../../../api/types';
import { fileSize, formatName } from '../../format';
import { Paw } from '../../markings/paw';
import { SocialLink } from '../../social/social-link';
import { avatarUrl, originalUrl } from '../../urls';

@Component({
  selector: 'app-credits-panel',
  imports: [
    RouterLink,
    Paw,
    SocialLink,
    LucideCalendar,
    LucideExpand,
    LucideImage,
    LucideLink,
    LucidePalette,
    LucideShare2,
    LucideTag,
    LucideUsers,
    LucideX,
  ],
  templateUrl: './credits-panel.html',
  styleUrl: './credits-panel.css',
})
export class CreditsPanel {
  readonly page = input.required<ArtworkResponse>();
  /** False while an NSFW piece waits behind the confirm screen: no actions yet. */
  readonly isPieceShown = input(true);
  readonly closed = output<void>();
  readonly shared = output<void>();
  readonly safeLinkCopied = output<void>();
  readonly fullViewOpened = output<void>();

  protected readonly artwork = computed(() => this.page().artwork);
  protected readonly title = computed(() => this.artwork().title);
  /** The date at the precision given, or the day the piece was added (design D10). */
  protected readonly date = computed(() => {
    const { date, sortDate } = this.artwork();
    return date
      ? formatArtworkDate(date)
      : `Added ${formatArtworkDate(sortDate)}`;
  });
  protected readonly file = computed(() => {
    const { id, file } = this.artwork();
    return {
      href: originalUrl(id, file.original),
      summary: [
        formatName(file.mime) + (file.animated ? ' (animated)' : ''),
        `${file.w} × ${file.h} px`,
        fileSize(file.bytes),
      ].join(' · '),
    };
  });
  protected readonly sections = computed(() =>
    [
      creditSection('artist', 'Art by', this.page().artists),
      creditSection('character', 'Characters', this.page().characters),
    ].filter((section) => section.people.length),
  );
}

function creditSection(
  role: 'artist' | 'character',
  label: string,
  people: CreditedPerson[],
) {
  return {
    role,
    className: `${role}s`,
    label,
    people: people.map((person) => ({
      ...person,
      initial: person.name.charAt(0),
      avatar: person.own ? avatarUrl(TIGY_ID) : undefined,
      // Tigy's credit leads home.
      queryParams: person.own ? {} : { [role]: person.id },
    })),
  };
}
