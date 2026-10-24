import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendar,
  lucideExpand,
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
import { Paw } from '../../markings/paw';
import { PieceTitlePipe } from '../../shared/piece-title.pipe';
import { avatarUrl, originalUrl } from '../../shared/urls';
import { SocialLink } from '../../social/social-link';

@Component({
  selector: 'app-credits-panel',
  imports: [RouterLink, NgIcon, Paw, SocialLink, PieceTitlePipe],
  providers: [
    provideIcons({
      lucideCalendar,
      lucideExpand,
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
  readonly page = input.required<ArtworkResponse>();
  /** False while an NSFW piece waits behind the confirm screen: no actions yet. */
  readonly isPieceShown = input(true);
  readonly closeRequested = output<void>();
  readonly shareRequested = output<void>();
  readonly safeLinkRequested = output<void>();
  readonly fullViewRequested = output<void>();

  protected readonly artwork = computed(() => this.page().artwork);
  protected readonly title = computed(() => this.artwork().title);
  protected readonly date = computed(() => {
    const { date, sortDate } = this.artwork();
    return date
      ? formatArtworkDate(date)
      : `Added ${formatArtworkDate(sortDate)}`;
  });
  protected readonly isVideo = computed(() => isVideoFile(this.artwork().file));
  protected readonly file = computed(() => {
    const { file } = this.artwork();
    const duration = fileDuration(file);
    const kind = this.isVideo()
      ? [
          formatName(file.mime),
          ...(duration ? [duration] : []),
          file.hasAudio ? 'With sound' : 'Silent',
        ]
      : [formatName(file.mime) + (file.animated ? ' (animated)' : '')];
    return {
      href: originalUrl(this.artwork()),
      summary: [...kind, `${file.w} × ${file.h} px`, fileSize(file.bytes)].join(
        ' · ',
      ),
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
