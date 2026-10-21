const sharpLoads = vi.hoisted(() => ({ count: 0 }));
vi.mock('sharp', async (original) => {
  sharpLoads.count++;
  return original();
});

import * as functions from './main';

// Functions read the global options when they are defined, so a wrong import
// order in main.ts silently deploys them to us-central1 without the cap.
it.each(Object.entries(functions))('%s runs in Zurich', (_, fn) => {
  expect(fn.__endpoint.region).toEqual(['europe-west6']);
});

it.each(Object.entries(functions).filter(([name]) => name !== 'processUpload'))(
  '%s runs on at most 10 instances',
  (_, fn) => {
    expect(fn.__endpoint.maxInstances).toBe(10);
  },
);

it('processes one upload per instance on at most 2 instances, with retries', () => {
  expect(functions.processUpload.__endpoint).toMatchObject({
    availableMemoryMb: 4096,
    cpu: 2,
    timeoutSeconds: 540,
    concurrency: 1,
    maxInstances: 2,
    eventTrigger: { retry: true },
  });
});

// Every function runs this bundle, and the sign-up blocking function must
// answer within 7 seconds.
it('does not load sharp when the functions load', () => {
  expect(sharpLoads.count).toBe(0);
});
