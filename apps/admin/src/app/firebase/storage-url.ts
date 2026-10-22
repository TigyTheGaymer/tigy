import { environment } from './environment';
import { EMULATOR_PORTS } from './firebase';
import type { FirebaseEnvironment } from './firebase-environment';

/**
 * The Storage REST address of a file anyone may fetch, without a download
 * token: the rules allow a public `get`, so no metadata request is needed first.
 */
export function storageUrl(
  path: string,
  env: FirebaseEnvironment = environment,
): string {
  const origin = env.emulatorHost
    ? `http://${env.emulatorHost}:${EMULATOR_PORTS.storage}`
    : 'https://firebasestorage.googleapis.com';
  const bucket = env.firebase.storageBucket;
  return `${origin}/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
}
