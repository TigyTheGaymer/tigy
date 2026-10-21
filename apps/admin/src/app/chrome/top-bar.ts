import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLogOut } from '@ng-icons/lucide';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-top-bar',
  imports: [HlmAvatarImports, HlmButtonImports, HlmDropdownMenuImports, NgIcon],
  providers: [provideIcons({ lucideLogOut })],
  templateUrl: './top-bar.html',
})
export class TopBar {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly initial = computed(() =>
    (this.user()?.displayName ?? this.user()?.email ?? '?')
      .charAt(0)
      .toUpperCase(),
  );

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/sign-in', { replaceUrl: true });
  }
}
