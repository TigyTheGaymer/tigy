import { Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLogIn } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { AuthService, type SignInResult } from '../auth/auth.service';
import { nextPath } from '../auth/next-path';

const SIGN_IN_MESSAGES: Record<SignInResult, string | null> = {
  'signed-in': null,
  cancelled: null,
  refused: 'Only the owner can sign in.',
  failed: "Signing in didn't work. Try again.",
};

@Component({
  selector: 'app-sign-in',
  imports: [HlmButtonImports, HlmCardImports, HlmSpinnerImports, NgIcon],
  providers: [provideIcons({ lucideLogIn })],
  template: `
    <main class="grid min-h-dvh place-items-center p-4">
      <section hlmCard class="w-full max-w-sm">
        <div hlmCardHeader>
          <h1 hlmCardTitle>Tigy admin</h1>
          <p hlmCardDescription>Sign in with the owner's Google account.</p>
        </div>
        <div hlmCardContent class="grid gap-3">
          <button hlmBtn (click)="signIn()" [disabled]="isSigningIn()">
            @if (isSigningIn()) {
              <hlm-spinner />
            } @else {
              <ng-icon name="lucideLogIn" />
            }
            Sign in with Google
          </button>
          @if (message(); as text) {
            <p role="alert" class="text-destructive text-sm">{{ text }}</p>
          }
        </div>
      </section>
    </main>
  `,
})
export class SignInPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** The admin address asked for before signing in. */
  readonly next = input<string>();
  protected readonly isSigningIn = signal(false);
  protected readonly message = signal<string | null>(null);

  protected async signIn(): Promise<void> {
    this.isSigningIn.set(true);
    this.message.set(null);
    const result = await this.auth.signIn();
    this.isSigningIn.set(false);
    if (result === 'signed-in') {
      await this.router.navigateByUrl(nextPath(this.next()), {
        replaceUrl: true,
      });
    } else {
      this.message.set(SIGN_IN_MESSAGES[result]);
    }
  }
}
