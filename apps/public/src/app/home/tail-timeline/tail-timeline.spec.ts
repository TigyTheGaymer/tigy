import { yearPositions } from './tail-timeline';

describe('yearPositions', () => {
  it("places each year at its first piece's share of the gallery", () => {
    expect(
      yearPositions([
        { year: 2026, count: 20 },
        { year: 2025, count: 60 },
        { year: 2024, count: 20 },
      ]),
    ).toEqual([
      { year: 2026, at: 0, index: 0 },
      { year: 2025, at: 0.2, index: 20 },
      { year: 2024, at: 0.8, index: 80 },
    ]);
  });

  it('spaces years with few pieces so their labels never overlap', () => {
    const [, second] = yearPositions([
      { year: 2026, count: 1 },
      { year: 2025, count: 99 },
    ]);
    expect(second.at).toBeCloseTo(0.035);
    expect(second.index).toBe(1);
  });

  it('is empty for an empty gallery', () => {
    expect(yearPositions([])).toEqual([]);
  });
});
