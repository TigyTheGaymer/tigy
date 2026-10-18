import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { rulesEnvironment } from './environment';

// The summaries keep every row in one text field (design D3), so a summary
// must fit in a single document of at most 1 MiB.
const ONE_MIB = 1024 * 1024;

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await rulesEnvironment();
});

afterAll(() => env.cleanup());

beforeEach(() => env.clearFirestore());

it('stores a gallery summary of about 1,000,000 characters', async () => {
  const items = 'x'.repeat(1_000_000);
  await env.withSecurityRulesDisabled(async (admin) => {
    const doc = admin.firestore().doc('meta/gallery');
    await doc.set({ items });
    expect((await doc.get()).get('items')).toHaveLength(items.length);
  });
});

it('refuses a summary over 1 MiB, the limit the size warning guards', async () => {
  await env.withSecurityRulesDisabled(async (admin) => {
    const doc = admin.firestore().doc('meta/gallery');
    await expect(doc.set({ items: 'x'.repeat(ONE_MIB) })).rejects.toThrow();
  });
});
