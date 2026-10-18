import {
  afterNextRender,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { formatArtworkDate } from '@tigy/gallery';
import type { CreditedPerson } from '../../../api/types';
import { CatalogService, isNotFound } from '../../catalog/catalog.service';
import { fileSize, formatName } from '../../format';
import { rememberedGallery } from '../../gallery-address';
import { HeadService } from '../../head/head.service';
import { artworkPath, fullImageUrl, originalUrl } from '../../urls';
import { ConfirmedPiecesService } from '../../nsfw/confirmed-pieces.service';
import { NsfwSwitchService } from '../../nsfw/nsfw-switch.service';
import { latest } from '../../resources';
import { injectServerResponse } from '../../server-response';
import { NotFoundPage } from '../not-found/not-found';

@Component({
  selector: 'app-artwork',
  imports: [RouterLink, NotFoundPage],
  templateUrl: './artwork.html',
  styleUrl: './artwork.css',
})
export class ArtworkPage {
  /** Empty until the router sets it. */
  readonly id = input('');
  /** Present (empty) on safe links, which preview only the site card. */
  readonly safe = input<string>();

  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);
  private readonly head = inject(HeadService);
  private readonly nsfwSwitch = inject(NsfwSwitchService);
  private readonly confirmedPieces = inject(ConfirmedPiecesService);

  private readonly resource = this.catalog.artwork(() =>
    this.id()
      ? { id: this.id(), includeNsfw: this.nsfwSwitch.isOn() }
      : undefined,
  );

  /** Keeps this piece's details while the NSFW-inclusive neighbours load. */
  protected readonly data = latest(
    this.resource,
    (previous) => previous.artwork.id === this.id(),
  );

  protected readonly isMissing = computed(
    () => !this.data() && isNotFound(this.resource.error()),
  );
  protected readonly hasFailed = computed(
    () => !this.data() && !this.isMissing() && !!this.resource.error(),
  );

  protected readonly isImageShown = computed(() => {
    const artwork = this.data()?.artwork;
    return (
      !!artwork &&
      (!artwork.nsfw ||
        this.nsfwSwitch.isOn() ||
        this.confirmedPieces.has(artwork.id))
    );
  });

  protected readonly title = computed(
    () => this.data()?.artwork.title ?? 'Untitled',
  );
  protected readonly date = computed(() => {
    const date = this.data()?.artwork.date;
    return date ? formatArtworkDate(date) : null;
  });
  protected readonly original = computed(() => {
    const artwork = this.data()?.artwork;
    if (!artwork) return null;
    const { file } = artwork;
    return {
      href: originalUrl(artwork.id, file.original),
      format: formatName(file.mime),
      size: fileSize(file.bytes),
      dimensions: `${file.w} × ${file.h} px`,
      isAnimated: file.animated,
    };
  });
  protected readonly creditSections = computed(() => {
    const page = this.data();
    if (!page) return [];
    return [
      creditSection('artist', page.artists),
      creditSection('character', page.characters),
    ].filter((section) => section.people.length);
  });
  protected readonly fullImage = computed(() => fullImageUrl(this.id()));
  protected readonly links = computed(() => {
    const path = artworkPath(this.id());
    return { link: this.head.url(path), safe: this.head.url(`${path}?safe`) };
  });

  /** The gallery this tab came from, read once hydrated. */
  protected readonly back = signal<string>('/');
  protected readonly backTree = computed(() =>
    this.router.parseUrl(this.back()),
  );

  constructor() {
    afterNextRender(() => this.back.set(rememberedGallery() ?? '/'));

    const response = injectServerResponse();
    effect(() => {
      if (this.hasFailed()) response.unavailable();
    });

    effect(() => {
      const data = this.data();
      if (!data) return;
      if (this.safe() !== undefined) {
        this.head.siteCard({ isHiddenFromSearch: data.artwork.nsfw });
      } else {
        this.head.artwork(data);
      }
    });
  }

  protected showPiece(): void {
    const artwork = this.data()?.artwork;
    if (artwork) this.confirmedPieces.add(artwork.id);
  }

  protected showAll(): void {
    this.nsfwSwitch.set(true);
  }
}

function creditSection(role: 'artist' | 'character', people: CreditedPerson[]) {
  const label = role === 'artist' ? 'Artist' : 'Character';
  return {
    className: `${role}s`,
    heading: people.length === 1 ? label : `${label}s`,
    people: people.map((person) => ({
      ...person,
      // Tigy's credit leads home.
      queryParams: person.own ? {} : { [role]: person.id },
    })),
  };
}
