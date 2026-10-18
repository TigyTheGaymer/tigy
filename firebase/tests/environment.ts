import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Loads both rules files into the emulators that `nx test firebase` starts. */
export function rulesEnvironment(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: 'demo-tigy',
    firestore: { rules: rulesFile('firestore.rules') },
    storage: { rules: rulesFile('storage.rules') },
  });
}

/** The people who might try to use the database or Storage from a browser. */
export function contexts(
  env: RulesTestEnvironment,
): Record<Who, RulesTestContext> {
  return {
    visitor: env.unauthenticatedContext(),
    stranger: env.authenticatedContext('stranger', {
      email: 'stranger@example.com',
      email_verified: true,
    }),
    notOwner: env.authenticatedContext('not-owner', { owner: false }),
    owner: env.authenticatedContext('owner', { owner: true }),
  };
}

export type Who = 'visitor' | 'stranger' | 'notOwner' | 'owner';

/** Everyone except the owner. */
export const OTHERS: Who[] = ['visitor', 'stranger', 'notOwner'];

function rulesFile(name: string): string {
  return readFileSync(resolve(import.meta.dirname, '..', name), 'utf8');
}
