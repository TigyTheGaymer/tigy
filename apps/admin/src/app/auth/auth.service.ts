import { computed, DestroyRef, inject, Service, signal } from '@angular/core';
import type { User } from 'firebase/auth';
import { AUTH_API } from '../firebase/firebase';

export interface AuthState {
  user: User | null;
  isOwner: boolean;
}

export type SignInResult = 'signed-in' | 'cancelled' | 'refused' | 'failed';

@Service()
export class AuthService {
  private readonly api = inject(AUTH_API);
  private readonly state = signal<AuthState>({ user: null, isOwner: false });

  readonly user = computed(() => this.state().user);
  readonly isOwner = computed(() => this.state().isOwner);

  constructor() {
    const stop = this.api.onIdTokenChanged(async (user) =>
      this.state.set(await stateOf(user)),
    );
    inject(DestroyRef).onDestroy(stop);
  }

  /** Waits for Firebase to restore the session saved in the browser. */
  async whenReady(): Promise<AuthState> {
    await this.api.authStateReady();
    return stateOf(this.api.currentUser());
  }

  async signIn(): Promise<SignInResult> {
    try {
      const user = await this.api.signInWithGoogle();
      if ((await stateOf(user)).isOwner) return 'signed-in';
      // An account made before the blocking function existed has no claim.
      await this.signOut();
      return 'refused';
    } catch (error) {
      return signInErrorResult(error);
    }
  }

  signOut(): Promise<void> {
    return this.api.signOut();
  }
}

async function stateOf(user: User | null): Promise<AuthState> {
  if (!user) return { user: null, isOwner: false };
  const { claims } = await user.getIdTokenResult();
  return { user, isOwner: claims['owner'] === true };
}

const CANCELLED = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]);

/** The blocking function's refusal arrives as an auth/ error whose message carries its status. */
export function signInErrorResult(error: unknown): SignInResult {
  const { code = '', message = '' } = (error ?? {}) as {
    code?: string;
    message?: string;
  };
  if (CANCELLED.has(code)) return 'cancelled';
  if (/PERMISSION_DENIED|BLOCKING_FUNCTION/.test(message)) return 'refused';
  return 'failed';
}
