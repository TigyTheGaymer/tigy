import * as functions from './main';

// Functions read the global options when they are defined, so a wrong import
// order in main.ts silently deploys them to us-central1 without the cap.
it.each(Object.entries(functions))(
  '%s runs in Zurich with at most 10 instances',
  (_, fn) => {
    expect(fn.__endpoint.region).toEqual(['europe-west6']);
    expect(fn.__endpoint.maxInstances).toBe(10);
  },
);
