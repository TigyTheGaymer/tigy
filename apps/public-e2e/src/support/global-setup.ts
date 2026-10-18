import { seed } from './emulators';

export default async function globalSetup(): Promise<void> {
  await seed();
}
