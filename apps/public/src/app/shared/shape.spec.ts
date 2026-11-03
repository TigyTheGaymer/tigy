import { shapeOf } from './shape';

describe('shapeOf', () => {
  it('is the width over the height', () => {
    expect(shapeOf({ w: 2000, h: 1000 })).toBe(2);
    expect(shapeOf({ w: 1000, h: 2000 })).toBe(0.5);
  });

  it('is square when the size is not known', () => {
    expect(shapeOf({ w: 0, h: 0 })).toBe(1);
    expect(shapeOf({ w: 400, h: 0 })).toBe(1);
    expect(shapeOf({ w: 0, h: 300 })).toBe(1);
  });
});
