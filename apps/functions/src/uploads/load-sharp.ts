import type SharpModule from 'sharp';

export type Sharp = typeof SharpModule;

let loaded: Promise<Sharp> | undefined;

/**
 * Loaded on first use, not at import: every function runs this bundle and
 * would load sharp's native binary on each cold start, and the sign-up
 * blocking function must answer within 7 seconds.
 */
export function loadSharp(): Promise<Sharp> {
  loaded ??= import('sharp').then(
    // A CommonJS function: it arrives with or without a `default` wrapper.
    (module) => (module.default ?? module) as Sharp,
  );
  return loaded;
}
