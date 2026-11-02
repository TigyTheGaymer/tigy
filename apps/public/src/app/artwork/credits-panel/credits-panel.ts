import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendar,
  lucideImage,
  lucideLink,
  lucidePalette,
  lucideShare2,
  lucideTag,
  lucideUsers,
  lucideX,
} from '@ng-icons/lucide';
import {
  fileSize,
  formatArtworkDate,
  fileDuration,
  formatName,
} from '@tigy/gallery';
import { isVideoFile, TIGY_ID } from '@tigy/models';
import type { ArtworkResponse, CreditedPerson } from '../../../api/types';
import { avatarUrl } from '../../shared/urls';
import { SocialLink } from '../../social/social-link';
import { PieceTitlePipe } from '../piece-title.pipe';
import { Skeleton } from '../skeleton/skeleton';

@Component({
  selector: 'app-credits-panel',
  imports: [RouterLink, NgIcon, SocialLink, PieceTitlePipe, Skeleton],
  providers: [
    provideIcons({
      lucideCalendar,
      lucideImage,
      lucideLink,
      lucidePalette,
      lucideShare2,
      lucideTag,
      lucideUsers,
      lucideX,
    }),
  ],
  templateUrl: './credits-panel.html',
  styleUrl: './credits-panel.css',
})
export class CreditsPanel {
  readonly page = input<ArtworkResponse>();
  /** False while an NSFW piece waits behind the confirm screen: no actions yet. */
  readonly isPieceShown = input(true);
  readonly isWaiting = input(false);
  readonly isDelayed = input(false);
  readonly closeRequested = output<void>();
  readonly shareRequested = output<void>();
  readonly safeLinkRequested = output<void>();

  protected readonly artwork = computed(() => this.page()?.artwork);
  protected readonly title = computed(() => this.artwork()?.title);
  protected readonly date = computed(() => {
    const artwork = this.artwork();
    if (!artwork) return '';
    return artwork.date
      ? formatArtworkDate(artwork.date)
      : `Added ${formatArtworkDate(artwork.sortDate)}`;
  });
  protected readonly file = computed(() => {
    const file = this.artwork()?.file;
    if (!file) return '';
    const duration = fileDuration(file);
    const kind = isVideoFile(file)
      ? [
          formatName(file.mime),
          ...(duration ? [duration] : []),
          file.hasAudio ? 'With sound' : 'Silent',
        ]
      : [formatName(file.mime) + (file.animated ? ' (animated)' : '')];
    return [...kind, `${file.w} × ${file.h} px`, fileSize(file.bytes)].join(
      ' · ',
    );
  });
  protected readonly sections = computed(() =>
    [
      creditSection('artist', 'Art by', this.page()?.artists ?? []),
      creditSection('character', 'Characters', this.page()?.characters ?? []),
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
