import { SUMMARY_MAX_AGE_MS, SummaryCache } from './summary-cache';

function setup() {
  let time = 0;
  const reads: string[] = [];
  const load = vi.fn(async (path: string) => {
    reads.push(path);
    return path === 'meta/gallery'
      ? JSON.stringify([{ id: 'k3x' }])
      : JSON.stringify([{ id: 'tigy', name: 'Tigy' }]);
  });
  const cache = new SummaryCache(load, SUMMARY_MAX_AGE_MS, () => time);
  return { cache, reads, load, advance: (ms: number) => (time += ms) };
}

it('reads Firestore once for repeated requests inside the period', async () => {
  const { cache, reads, advance } = setup();
  await cache.gallery();
  advance(SUMMARY_MAX_AGE_MS - 1);
  await cache.gallery();
  await Promise.all([cache.gallery(), cache.gallery()]);
  expect(reads).toEqual(['meta/gallery']);
});

it('reads again for a request after the period', async () => {
  const { cache, reads, advance } = setup();
  await cache.gallery();
  advance(SUMMARY_MAX_AGE_MS);
  expect(await cache.gallery()).toEqual([{ id: 'k3x' }]);
  expect(reads).toEqual(['meta/gallery', 'meta/gallery']);
});

it('reads meta/people only when names are asked for', async () => {
  const { cache, reads } = setup();
  await cache.gallery();
  expect(reads).toEqual(['meta/gallery']);
  expect(await cache.people()).toEqual([{ id: 'tigy', name: 'Tigy' }]);
  expect(reads).toEqual(['meta/gallery', 'meta/people']);
});

it('shares one read between requests that arrive while it loads', async () => {
  const { cache, load } = setup();
  await Promise.all([cache.people(), cache.people(), cache.people()]);
  expect(load).toHaveBeenCalledTimes(1);
});

it('treats a missing summary as empty', async () => {
  const cache = new SummaryCache(async () => null);
  expect(await cache.gallery()).toEqual([]);
});

it('does not keep a failed read, so the next request tries again', async () => {
  let fail = true;
  const cache = new SummaryCache(async () => {
    if (fail) throw new Error('unavailable');
    return '[]';
  });
  await expect(cache.gallery()).rejects.toThrow('unavailable');
  fail = false;
  expect(await cache.gallery()).toEqual([]);
});
