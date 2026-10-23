import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucideExternalLink,
  lucideLogOut,
  lucideMenu,
  lucideMonitor,
  lucideMoon,
  lucideRefreshCw,
  lucideSun,
  lucideUserPlus,
  lucideWrench,
} from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { AuthService } from '../auth/auth.service';
import { environment } from '../firebase/environment';
import { CALLABLES } from '../firebase/functions';
import { ThemeService, type ThemeChoice } from '../theme/theme.service';

@Component({
  selector: 'app-top-bar',
  imports: [
    HlmAvatarImports,
    HlmButtonImports,
    HlmDropdownMenuImports,
    HlmTooltipImports,
    NgIcon,
    RouterLink,
    RouterLinkActive,
  ],
  providers: [
    provideIcons({
      lucideCheck,
      lucideExternalLink,
      lucideLogOut,
      lucideMenu,
      lucideMonitor,
      lucideMoon,
      lucideRefreshCw,
      lucideSun,
      lucideUserPlus,
      lucideWrench,
    }),
  ],
  templateUrl: './top-bar.html',
})
export class TopBar {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly callables = inject(CALLABLES);
  protected readonly theme = inject(ThemeService);
  protected readonly themes: {
    value: ThemeChoice;
    label: string;
    icon: string;
  }[] = [
    { value: 'system', label: 'Device setting', icon: 'lucideMonitor' },
    { value: 'light', label: 'Light', icon: 'lucideSun' },
    { value: 'dark', label: 'Dark', icon: 'lucideMoon' },
  ];

  protected readonly pageLinks = [
    { path: '/artworks', label: 'Artworks' },
    { path: '/people', label: 'People' },
    { path: '/uploads', label: 'Uploads' },
  ];
  protected readonly publicSite = environment.publicSite;
  protected readonly user = this.auth.user;
  protected readonly initial = computed(() =>
    (this.user()?.displayName ?? this.user()?.email ?? '?')
      .charAt(0)
      .toUpperCase(),
  );
  protected readonly isRebuilding = signal(false);

  protected async rebuildSummaries(): Promise<void> {
    this.isRebuilding.set(true);
    try {
      const { images, people, tags } = await this.callables.rebuildSummaries();
      toast.success('Summaries rebuilt', {
        description: `From ${images} artworks, ${people} people and ${tags} tags.`,
      });
    } catch {
      toast.error("The summaries couldn't be rebuilt. Try again.");
    } finally {
      this.isRebuilding.set(false);
    }
  }

  protected readonly isCreditingTigy = signal(false);

  protected async creditTigy(): Promise<void> {
    this.isCreditingTigy.set(true);
    try {
      const { changed } = await this.callables.creditTigy();
      if (changed === 0) {
        toast.success('Nothing to change', {
          description: 'Every artwork already credits Tigy.',
        });
      } else {
        toast.success('Tigy credited', {
          description: `Added to ${changed} ${changed === 1 ? 'artwork' : 'artworks'}.`,
        });
      }
    } catch {
      toast.error("Tigy couldn't be credited. Try again.");
    } finally {
      this.isCreditingTigy.set(false);
    }
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/sign-in', { replaceUrl: true });
  }
}
