import { seed, waitForFunctions } from './emulators';

export default async function globalSetup(): Promise<void> {
  await waitForFunctions();
  seed();
}
