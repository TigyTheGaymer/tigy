import type { GalleryRow } from '@tigy/models';
import { toTile } from './tile';

function row(
  w: number,
  h: number,
  fields: Partial<GalleryRow> = {},
): GalleryRow {
  return {
    id: 'k3x',
    sortDate: '2026-01-01',
    w,
    h,
    nsfw: false,
    artistIds: [],
    characterIds: [],
    tags: [],
    ...fields,
  };
}

describe('toTile', () => {
  it("keeps the piece's own shape", () => {
    expect(toTile(row(400, 300)).shape).toBeCloseTo(4 / 3);
    expect(toTile(row(1620, 2117)).shape).toBeCloseTo(1620 / 2117);
  });

  it('Tall comic: keeps a tall tile, never narrower than 1:2', () => {
    expect(toTile(row(500, 3000)).shape).toBe(0.5);
  });

  it('keeps very wide pieces from becoming a sliver', () => {
    expect(toTile(row(6000, 1000)).shape).toBe(2.4);
  });

  it("carries the piece's size, title and NSFW flag", () => {
    expect(
      toTile(row(1620, 2117, { title: 'Hey Pookie!', nsfw: true })),
    ).toEqual({
      id: 'k3x',
      src: '/img/k3x/thumb.webp',
      width: 1620,
      height: 2117,
      shape: 1620 / 2117,
      alt: 'Hey Pookie!',
      isNsfw: true,
    });
    expect(toTile(row(10, 10)).alt).toBe('Untitled');
  });
});
